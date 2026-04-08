import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MBClient } from "../client.js";

export function registerPublicTools(server: McpServer, client: MBClient): void {
  // ─── 1. Order Book ───
  server.tool(
    "mb_get_orderbook",
    "Get the order book (asks and bids) for a trading pair on Mercado Bitcoin. " +
    "Returns current buy and sell orders with prices and quantities.",
    {
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL, ETH-BRL"),
      limit: z.number().optional().describe("Max entries per side (up to 1000)"),
    },
    async ({ symbol, limit }) => {
      const params: Record<string, string | undefined> = {};
      if (limit !== undefined) params.limit = String(limit);
      const data = await client.publicGet(`/${symbol}/orderbook`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ─── 2. Trades ───
  server.tool(
    "mb_get_trades",
    "Get recent executed trades for a trading pair. " +
    "Useful for seeing market activity, recent prices and volumes.",
    {
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      since: z.string().optional().describe("Return trades after this trade ID"),
      from: z.string().optional().describe("Start timestamp (Unix seconds)"),
      to: z.string().optional().describe("End timestamp (Unix seconds)"),
      limit: z.number().optional().describe("Max trades to return (up to 1000)"),
    },
    async ({ symbol, since, from, to, limit }) => {
      const data = await client.publicGet(`/${symbol}/trades`, {
        since,
        from,
        to,
        limit: limit !== undefined ? String(limit) : undefined,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ─── 3. Symbols ───
  server.tool(
    "mb_get_symbols",
    "List available trading symbols/pairs on Mercado Bitcoin with metadata " +
    "(min/max price, min/max volume, asset type).\n\n" +
    "Without a filter, returns only BRL pairs (most common) in pages of 200. " +
    "Use 'symbols' for specific pairs or 'offset' to paginate through all available pairs.\n" +
    "Mercado Bitcoin has 1900+ symbols including crypto, fan tokens, DeFi, and tokenized assets.",
    {
      symbols: z.string().optional().describe("Comma-separated filter, e.g. BTC-BRL,ETH-BRL. Overrides pagination."),
      limit: z.number().default(200).describe("Max symbols per page (default: 200)"),
      offset: z.number().default(0).describe("Skip first N results for pagination (default: 0)"),
      brl_only: z.boolean().default(true).describe("When true (default) and no filter, returns only -BRL pairs"),
    },
    async ({ symbols, limit, offset, brl_only }) => {
      // If specific symbols requested, just pass through
      if (symbols) {
        const data = await client.publicGet("/symbols", { symbols });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      }

      // Fetch all and apply filtering + pagination on our side
      const data = await client.publicGet<Record<string, unknown>[]>("/symbols");
      let items = Array.isArray(data) ? data : [];

      if (brl_only) {
        items = items.filter((s) => {
          const sym = (s as Record<string, unknown>)["symbol"];
          return typeof sym === "string" && sym.endsWith("-BRL");
        });
      }

      const total = items.length;
      const page = items.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            total,
            showing: `${offset + 1}-${Math.min(offset + limit, total)} de ${total}`,
            hasMore,
            nextOffset: hasMore ? offset + limit : null,
            symbols: page,
          }, null, 2),
        }],
      };
    },
  );

  // ─── 4. Tickers ───
  server.tool(
    "mb_get_tickers",
    "Get current price tickers for one or more trading pairs. " +
    "Returns: last price, bid, ask, high, low, open, and 24h volume.",
    {
      symbols: z.string().describe("Comma-separated symbols, e.g. BTC-BRL,ETH-BRL"),
    },
    async ({ symbols }) => {
      const data = await client.publicGet("/tickers", { symbols });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ─── 5. Candles (OHLCV) ───
  server.tool(
    "mb_get_candles",
    "Get OHLCV candlestick data for charting and technical analysis. " +
    "Resolutions: 1m, 15m, 1h, 3h, 1d, 1w, 1M.",
    {
      symbol: z.string().describe("Trading pair, e.g. BTC-BRL"),
      resolution: z.enum(["1m", "15m", "1h", "3h", "1d", "1w", "1M"]).describe("Candle interval"),
      from: z.string().optional().describe("Start timestamp (Unix seconds)"),
      to: z.string().describe("End timestamp (Unix seconds)"),
      countback: z.number().optional().describe("Number of candles to return (overrides 'from')"),
    },
    async ({ symbol, resolution, from, to, countback }) => {
      const data = await client.publicGet("/candles", {
        symbol,
        resolution,
        from,
        to,
        countback: countback !== undefined ? String(countback) : undefined,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ─── 6. Asset Fees ───
  server.tool(
    "mb_get_asset_fees",
    "Get deposit and withdrawal fees for a specific asset. " +
    "Includes minimum amounts and confirmation requirements per network.",
    {
      asset: z.string().describe("Asset symbol, e.g. BTC, ETH, USDT"),
      network: z.string().optional().describe("Specific network, e.g. ethereum, stellar"),
    },
    async ({ asset, network }) => {
      const data = await client.publicGet(`/${asset}/fees`, { network });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ─── 7. Asset Networks ───
  server.tool(
    "mb_get_asset_networks",
    "List available blockchain networks for a specific asset. " +
    "Important for multi-network assets like USDT (Ethereum, Stellar, etc.).",
    {
      asset: z.string().describe("Asset symbol, e.g. USDT, BTC"),
    },
    async ({ asset }) => {
      const data = await client.publicGet(`/${asset}/networks`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
