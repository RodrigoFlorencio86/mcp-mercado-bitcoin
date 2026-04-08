# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MCP Server for Mercado Bitcoin (Brazilian crypto exchange). Exposes the full MB API v4 as 31 MCP tools for use by LLMs and AI agents.

## Commands

- `npm run build` — compile TypeScript to `build/`
- `npm run dev` — watch mode (rebuild on changes)
- `npm start` — run the compiled server
- `npx @modelcontextprotocol/inspector node build/index.js` — test with MCP Inspector

## Architecture

```text
src/
├── index.ts          Entry point: creates McpServer, registers tools, starts stdio transport
├── config.ts         Environment variable loading → Config object
├── auth.ts           OAuth2 token lifecycle (auto-refresh, concurrency-safe)
├── client.ts         HTTP client wrapping MB API v4 (public + authenticated requests)
├── guards.ts         Security: operation mode gates, spending tracker, confirmation previews
└── tools/
    ├── public.ts     7 tools — orderbook, trades, symbols, tickers, candles, fees, networks
    ├── account.ts    6 tools — accounts, balances, tier, positions, fees, internal transfer
    ├── trading.ts    6 tools — place/cancel/list orders (with confirmation flow)
    └── wallet.ts     11 tools — deposits, withdrawals, addresses, bank accounts, sub-accounts
```

### Security model (3 layers)

1. **Operation mode** (`MB_OPERATION_MODE`): controls which tool groups are registered at startup. `readonly` < `trading` < `full`.
2. **Confirmation flow**: dangerous tools require `confirm=true` parameter. Default call returns a preview; user must approve before execution.
3. **Spending guards**: `MB_MAX_ORDER_BRL` (per-order), `MB_DAILY_LIMIT_BRL` (daily), `MB_DRY_RUN` (simulate). Tracked in `SpendingTracker`.

### Key patterns

- All tools return `{ content: [{ type: "text", text: JSON.stringify(data) }] }`.
- Auth token is cached and auto-refreshed 60s before expiry. Concurrent refresh requests are coalesced.
- Guard checks (`requireAuth`, `requireMode`) run at tool invocation, returning error content if denied.
- `console.error()` for all logging (never stdout — it's the MCP transport).

## MB API reference

- Base URL: `https://api.mercadobitcoin.net/api/v4`
- Auth: OAuth2 client_credentials → Bearer token (1h TTL)
- Swagger: `https://api.mercadobitcoin.net/api/v4/docs/swagger.yaml`
- Rate limit: 500 req/min global, per-endpoint limits vary (1-10 req/sec)
