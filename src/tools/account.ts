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

export function registerAccountTools(
  server: McpServer,
  client: MBClient,
  config: Config,
  _tracker: SpendingTracker,
): void {
  // ─── 1. List Accounts ───
  server.tool(
    "mb_list_accounts",
    "List all your Mercado Bitcoin accounts (wallets). " +
    "Returns account IDs, names, currency and type. " +
    "You need the accountId for most other operations.",
    {},
    async () => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet("/accounts");
      return ok(data);
    },
  );

  // ─── 2. Get Balances ───
  server.tool(
    "mb_get_balances",
    "Get all asset balances for an account. " +
    "Shows available, on_hold (in open orders), and total for each asset.",
    {
      accountId: z.string().describe("Account ID (use mb_list_accounts to find it)"),
    },
    async ({ accountId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/balances`);
      return ok(data);
    },
  );

  // ─── 3. Get Tier ───
  server.tool(
    "mb_get_tier",
    "Get the fee tier level of an account. Higher tiers have lower trading fees.",
    {
      accountId: z.string().describe("Account ID"),
    },
    async ({ accountId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/tier`);
      return ok(data);
    },
  );

  // ─── 4. Get Trading Fees ───
  server.tool(
    "mb_get_trading_fees",
    "Get maker and taker fee rates for a specific market. " +
    "Useful before placing orders to estimate costs.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
    },
    async ({ accountId, symbol }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/${symbol}/fees`);
      return ok(data);
    },
  );

  // ─── 5. Get Positions ───
  server.tool(
    "mb_get_positions",
    "List open positions with average entry price, quantity and side. " +
    "Useful for portfolio analysis and P&L tracking.",
    {
      accountId: z.string().describe("Account ID"),
      symbols: z.string().optional().describe("Comma-separated filter, e.g. BTC-BRL,ETH-BRL"),
    },
    async ({ accountId, symbols }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/positions`, { symbols });
      return ok(data);
    },
  );

  // ─── 6. Internal Transfer ───
  server.tool(
    "mb_internal_transfer",
    "Transfer an asset between your own Mercado Bitcoin accounts (sub-wallets). " +
    "Requires confirmation. Call first with confirm=false to preview, then confirm=true to execute.",
    {
      accountId: z.string().describe("Source account ID"),
      symbol: z.string().describe("Asset to transfer, e.g. BRL, BTC"),
      amount: z.string().describe("Amount to transfer"),
      recipientAccountId: z.string().describe("Destination account ID"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ accountId, symbol, amount, recipientAccountId, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "trading");
      if (modeErr) return err(modeErr);

      if (!confirm && !config.autoConfirm) {
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Internal Transfer", {
              "From Account": accountId,
              "To Account": recipientAccountId,
              "Asset": symbol,
              "Amount": amount,
            }, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "Transfer would be executed", accountId, symbol, amount, recipientAccountId });
      }

      const data = await client.authPost(`/accounts/${accountId}/${symbol}/transfers/internal`, {
        amount,
        recipient_account_id: recipientAccountId,
        transaction_id: `mcp-${Date.now()}`,
      });
      return ok(data);
    },
  );
}
