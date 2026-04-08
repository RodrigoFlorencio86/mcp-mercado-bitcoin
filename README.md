# mcp-mercado-bitcoin

MCP Server for [Mercado Bitcoin](https://www.mercadobitcoin.com.br) — trade, monitor and manage your crypto portfolio via any LLM or AI agent.

> **Model Context Protocol (MCP)** is an open protocol that enables LLM applications to connect to external tools and data sources. This server exposes the full Mercado Bitcoin API v4 as MCP tools.

## Features

- **31 tools** covering the complete Mercado Bitcoin API v4
- **Public data**: tickers, orderbook, trades, candles, symbols, fees, networks
- **Account management**: balances, positions, tiers, trading fees
- **Trading**: place/cancel orders (market, limit, stoplimit, post-only)
- **Wallet**: deposits, withdrawals, addresses, bank accounts, sub-accounts
- **Three-layer security model** to protect against unauthorized operations
- Works with **Claude Desktop, Claude Code, OpenClaw, Cursor, and any MCP-compatible client**

## Security Model

### Layer 1 — Operation Modes

Control which capabilities are exposed to the LLM:

| Mode | Public Data | Account Queries | Trading | Withdrawals |
|------|:-----------:|:---------------:|:-------:|:-----------:|
| `readonly` | ✓ | ✓ | ✗ | ✗ |
| `trading` (default) | ✓ | ✓ | ✓ | ✗ |
| `full` | ✓ | ✓ | ✓ | ✓ |

### Layer 2 — Confirmation Flow

All operations that move money (place order, cancel order, withdraw, transfer) use a **two-step confirmation**:

1. First call → returns a detailed preview of what will happen
2. The LLM shows the preview to the user and asks for approval
3. Second call with `confirm=true` → executes the operation

Set `MB_AUTO_CONFIRM=true` only if you trust your agent to operate autonomously.

### Layer 3 — Spending Guards

| Variable | Description |
|----------|-------------|
| `MB_MAX_ORDER_BRL` | Maximum value for a single order in BRL |
| `MB_DAILY_LIMIT_BRL` | Maximum total daily trading volume in BRL |
| `MB_DRY_RUN=true` | Simulate all operations without executing |

## Quick Start

### 1. Get API Credentials

1. Log into [Mercado Bitcoin](https://www.mercadobitcoin.com.br)
2. Go to Settings → API
3. Create a new API key (requires 2FA)
4. Set appropriate permissions: **Read** for monitoring, **Trading** for orders
5. Save your `client_id` (API Key) and `client_secret` (API Secret)

### 2. Install

```bash
npm install -g mcp-mercado-bitcoin
```

Or run directly with npx:

```bash
npx mcp-mercado-bitcoin
```

### 3. Configure

Set environment variables:

```bash
export MB_API_KEY=your_client_id
export MB_API_SECRET=your_client_secret
export MB_OPERATION_MODE=trading        # readonly | trading | full
```

### 4. Connect to your LLM client

#### Claude Code

```bash
claude mcp add --transport stdio -e MB_API_KEY=your_key -e MB_API_SECRET=your_secret mcp-mercado-bitcoin -- npx mcp-mercado-bitcoin
```

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mercado-bitcoin": {
      "command": "npx",
      "args": ["mcp-mercado-bitcoin"],
      "env": {
        "MB_API_KEY": "your_client_id",
        "MB_API_SECRET": "your_client_secret",
        "MB_OPERATION_MODE": "trading"
      }
    }
  }
}
```

#### MCP-compatible clients (Cursor, OpenClaw, etc.)

Use stdio transport with the command `npx mcp-mercado-bitcoin` and pass credentials via environment variables.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MB_API_KEY` | For auth ops | — | OAuth2 client_id from Mercado Bitcoin |
| `MB_API_SECRET` | For auth ops | — | OAuth2 client_secret from Mercado Bitcoin |
| `MB_OPERATION_MODE` | No | `trading` | `readonly`, `trading`, or `full` |
| `MB_AUTO_CONFIRM` | No | `false` | Skip confirmation for dangerous operations |
| `MB_MAX_ORDER_BRL` | No | unlimited | Max single order value (BRL) |
| `MB_DAILY_LIMIT_BRL` | No | unlimited | Max daily trading volume (BRL) |
| `MB_DRY_RUN` | No | `false` | Simulate operations without executing |

## Available Tools

### Public Data (no auth required)

| Tool | Description |
|------|-------------|
| `mb_get_orderbook` | Order book (asks/bids) for a trading pair |
| `mb_get_trades` | Recent executed trades |
| `mb_get_symbols` | All available trading pairs and metadata |
| `mb_get_tickers` | Current price tickers |
| `mb_get_candles` | OHLCV candlestick data |
| `mb_get_asset_fees` | Deposit/withdrawal fees per asset |
| `mb_get_asset_networks` | Available blockchain networks per asset |

### Account (auth required)

| Tool | Description |
|------|-------------|
| `mb_list_accounts` | List all accounts/wallets |
| `mb_get_balances` | Asset balances (available, on_hold, total) |
| `mb_get_tier` | Account fee tier level |
| `mb_get_trading_fees` | Maker/taker fee rates per market |
| `mb_get_positions` | Open positions with avg price |
| `mb_internal_transfer` | Transfer between your own sub-accounts |

### Trading (auth + mode ≥ trading)

| Tool | Description |
|------|-------------|
| `mb_place_order` | Place buy/sell order (market, limit, stoplimit, post-only) |
| `mb_list_orders` | List orders for a market |
| `mb_get_order` | Get order details with executions |
| `mb_cancel_order` | Cancel a specific order |
| `mb_cancel_all_orders` | Cancel all open orders |
| `mb_list_all_orders` | List orders across all markets |

### Wallet (auth + mode = full)

| Tool | Description |
|------|-------------|
| `mb_create_account` | Create a new sub-account |
| `mb_list_deposits` | Crypto deposit history |
| `mb_get_deposit_addresses` | Get deposit addresses with QR codes |
| `mb_list_fiat_deposits` | BRL deposit history (PIX) |
| `mb_withdraw` | Withdraw crypto or BRL |
| `mb_list_withdrawals` | Withdrawal history |
| `mb_get_withdrawal` | Withdrawal details by ID |
| `mb_get_withdraw_limits` | Withdrawal limits per asset |
| `mb_get_brl_withdraw_config` | BRL withdrawal config and fees |
| `mb_list_withdraw_addresses` | Trusted crypto addresses |
| `mb_list_bank_accounts` | Trusted bank accounts |

### Utility

| Tool | Description |
|------|-------------|
| `mb_status` | Server config, auth status, spending summary |

## Development

```bash
git clone https://github.com/RodrigoFlorencio86/mcp-mercado-bitcoin.git
cd mcp-mercado-bitcoin
npm install
npm run build
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT
