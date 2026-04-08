import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MBClient } from "../client.js";
import { Config } from "../config.js";
import { SpendingTracker, requireAuth, requireMode, confirmationPreview } from "../guards.js";

function err(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function isValidPositive(s: string): boolean {
  const n = Number(s);
  return !isNaN(n) && isFinite(n) && n > 0;
}

export function registerTradingTools(
  server: McpServer,
  client: MBClient,
  config: Config,
  tracker: SpendingTracker,
): void {
  // ─── 1. Place Order ───
  server.tool(
    "mb_place_order",
    "Place a buy or sell order on Mercado Bitcoin. Supports market, limit, stoplimit and post-only orders.\n\n" +
    "IMPORTANT: This tool uses a two-step confirmation flow for safety.\n" +
    "1. First call with confirm=false (default) → returns a preview of the order\n" +
    "2. Show the preview to the user and ask for approval\n" +
    "3. If approved, call again with confirm=true → executes the order\n\n" +
    "For market buy orders, you can use 'cost' (value in BRL, e.g. 'buy R$500 of BTC') " +
    "instead of 'qty'. The MCP will automatically calculate the quantity based on the current market price.\n\n" +
    "Order types:\n" +
    "- market: executes immediately at best available price\n" +
    "- limit: executes at limitPrice or better\n" +
    "- stoplimit: triggers a limit order when stopPrice is reached\n" +
    "- post-only: limit order that is rejected if it would execute immediately (maker only)",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      side: z.enum(["buy", "sell"]).describe("Order side"),
      type: z.enum(["market", "limit", "stoplimit", "post-only"]).describe("Order type"),
      qty: z.string().optional().describe("Quantity of base asset (e.g. 0.001 BTC)"),
      cost: z.string().optional().describe("Total cost in quote currency — only for market buy orders"),
      limitPrice: z.string().optional().describe("Limit price — required for limit, post-only, stoplimit"),
      stopPrice: z.string().optional().describe("Stop trigger price — required for stoplimit"),
      externalId: z.string().optional().describe("Your custom order ID for tracking"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ accountId, symbol, side, type, qty, cost, limitPrice, stopPrice, externalId, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "trading");
      if (modeErr) return err(modeErr);

      // Validate numeric fields
      if (qty !== undefined && !isValidPositive(qty))
        return err(`Quantidade inválida: "${qty}". Informe um número positivo válido.`);
      if (cost !== undefined && !isValidPositive(cost))
        return err(`Custo inválido: "${cost}". Informe um número positivo válido.`);
      if (limitPrice !== undefined && !isValidPositive(limitPrice))
        return err(`Preço limite inválido: "${limitPrice}". Informe um número positivo válido.`);
      if (stopPrice !== undefined && !isValidPositive(stopPrice))
        return err(`Preço stop inválido: "${stopPrice}". Informe um número positivo válido.`);

      // Validate order type requirements
      if (type === "market" && side === "buy" && !qty && !cost)
        return err("Ordem market de compra requer 'qty' (quantidade) ou 'cost' (valor em reais).");
      if (type === "market" && side === "sell" && !qty)
        return err("Ordem market de venda requer 'qty' (quantidade a vender).");
      if ((type === "limit" || type === "post-only") && !limitPrice)
        return err(`Ordem do tipo ${type} requer 'limitPrice' (preço limite).`);
      if (type === "stoplimit" && (!limitPrice || !stopPrice))
        return err("Ordem stoplimit requer 'limitPrice' e 'stopPrice'.");

      // Convert cost → qty for market buy orders
      let resolvedQty = qty;
      let costConversion: { askPrice: string; calculatedQty: string } | null = null;

      if (type === "market" && side === "buy" && cost && !qty) {
        try {
          const tickers = await client.publicGet<Array<{ pair: string; sell: string }>>(
            "/tickers",
            { symbols: symbol },
          );
          if (!Array.isArray(tickers) || tickers.length === 0) {
            return err(`Não foi possível obter a cotação de ${symbol} para converter o valor em quantidade.`);
          }
          const askPrice = tickers[0].sell;
          if (!askPrice || !isValidPositive(askPrice)) {
            return err(`Cotação inválida recebida para ${symbol}: ${askPrice}`);
          }
          const calcQty = Number(cost) / Number(askPrice);
          resolvedQty = calcQty.toFixed(8);
          costConversion = { askPrice, calculatedQty: resolvedQty };
        } catch (e) {
          return err(`Erro ao consultar cotação de ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Estimate order value in BRL for spending guards
      let estimatedBrl = 0;
      if (cost) {
        estimatedBrl = Number(cost);
      } else if (resolvedQty && limitPrice) {
        estimatedBrl = Number(resolvedQty) * Number(limitPrice);
      }

      if (estimatedBrl > 0) {
        const spendErr = tracker.validateOrder(estimatedBrl);
        if (spendErr) return err(spendErr);
      }

      // Confirmation preview
      if (!confirm && !config.autoConfirm) {
        const details: Record<string, string | number | undefined> = {
          "Symbol": symbol,
          "Side": side.toUpperCase(),
          "Type": type,
          "Quantity": resolvedQty,
          "Cost": cost ? `R$ ${cost}` : undefined,
          "Limit Price": limitPrice ? `R$ ${limitPrice}` : undefined,
          "Stop Price": stopPrice ? `R$ ${stopPrice}` : undefined,
          "Estimated Value": estimatedBrl > 0 ? `R$ ${estimatedBrl.toFixed(2)}` : "será determinado na execução",
        };
        if (costConversion) {
          details["Preço ask usado"] = `R$ ${costConversion.askPrice}`;
          details["Qtd calculada"] = costConversion.calculatedQty;
          details["AVISO"] = "O preço pode variar entre esta prévia e a execução (slippage)";
        }
        if (externalId) details["External ID"] = externalId;
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Place Order", details, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "Order would be placed", symbol, side, type, qty: resolvedQty, cost, limitPrice, stopPrice });
      }

      // Build request body — always use qty (cost is not accepted by MB API)
      const body: Record<string, unknown> = { side, type };
      body.qty = resolvedQty;
      if (limitPrice) body.limitPrice = limitPrice;
      if (stopPrice) body.stopPrice = stopPrice;
      if (externalId) body.externalId = externalId;
      body.async = false;

      const data = await client.authPost(`/accounts/${accountId}/${symbol}/orders`, body);

      // Record spending for daily limit tracking
      if (estimatedBrl > 0) {
        tracker.recordSpend(estimatedBrl);
      }

      return ok(data);
    },
  );

  // ─── 2. List Orders (per market) ───
  server.tool(
    "mb_list_orders",
    "List orders for a specific trading pair. Filter by status, side, date range. " +
    "Returns order details including executions (fills).",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      status: z.enum(["created", "working", "cancelled", "filled"]).optional().describe("Filter by status"),
      side: z.enum(["buy", "sell"]).optional().describe("Filter by side"),
      has_executions: z.boolean().optional().describe("Filter orders that have fills"),
      id_from: z.string().optional().describe("Start order ID"),
      id_to: z.string().optional().describe("End order ID"),
      created_at_from: z.string().optional().describe("Start date (ISO 8601)"),
      created_at_to: z.string().optional().describe("End date (ISO 8601)"),
    },
    async ({ accountId, symbol, status, side, has_executions, id_from, id_to, created_at_from, created_at_to }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/${symbol}/orders`, {
        status,
        side,
        has_executions: has_executions !== undefined ? String(has_executions) : undefined,
        id_from,
        id_to,
        created_at_from,
        created_at_to,
      });
      return ok(data);
    },
  );

  // ─── 3. Get Order ───
  server.tool(
    "mb_get_order",
    "Get detailed information about a specific order, including all executions (fills), " +
    "average price, fees and timestamps.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      orderId: z.string().describe("Order ID"),
    },
    async ({ accountId, symbol, orderId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/${symbol}/orders/${orderId}`);
      return ok(data);
    },
  );

  // ─── 4. Cancel Order ───
  server.tool(
    "mb_cancel_order",
    "Cancel a specific open order. Requires confirmation.\n" +
    "Call with confirm=false first to preview, then confirm=true to execute.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      orderId: z.string().describe("Order ID to cancel"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ accountId, symbol, orderId, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "trading");
      if (modeErr) return err(modeErr);

      if (!confirm && !config.autoConfirm) {
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Cancel Order", {
              "Symbol": symbol,
              "Order ID": orderId,
            }, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "Order would be cancelled", orderId });
      }

      const data = await client.authDelete(`/accounts/${accountId}/${symbol}/orders/${orderId}`, {
        async: "false",
      });
      return ok(data);
    },
  );

  // ─── 5. Cancel All Orders ───
  server.tool(
    "mb_cancel_all_orders",
    "Cancel ALL open orders on your account. Optionally filter by symbol.\n" +
    "DANGEROUS: This cancels multiple orders at once. Requires confirmation.\n" +
    "Call with confirm=false first to preview, then confirm=true to execute.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().optional().describe("Only cancel orders for this pair"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ accountId, symbol, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "trading");
      if (modeErr) return err(modeErr);

      if (!confirm && !config.autoConfirm) {
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Cancel ALL Open Orders", {
              "Account": accountId,
              "Symbol Filter": symbol ?? "ALL symbols",
              "Warning": "This will cancel ALL matching open orders!",
            }, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "All open orders would be cancelled", accountId, symbol });
      }

      const data = await client.authDelete(`/accounts/${accountId}/cancel_all_open_orders`, {
        symbol,
      });
      return ok(data);
    },
  );

  // ─── 6. List All Orders (all markets) ───
  server.tool(
    "mb_list_all_orders",
    "List orders across ALL trading pairs for an account. " +
    "Useful for getting a complete picture of trading activity.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().optional().describe("Optional symbol filter"),
      status: z.enum(["created", "working", "cancelled", "filled"]).optional().describe("Filter by status"),
      has_executions: z.boolean().optional().describe("Filter orders that have fills"),
      size: z.number().optional().describe("Page size"),
    },
    async ({ accountId, symbol, status, has_executions, size }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/orders`, {
        symbol,
        status,
        has_executions: has_executions !== undefined ? String(has_executions) : undefined,
        size: size !== undefined ? String(size) : undefined,
      });
      return ok(data);
    },
  );
}
