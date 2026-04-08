#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { MBClient } from "./client.js";
import { SpendingTracker } from "./guards.js";
import { registerPublicTools } from "./tools/public.js";
import { registerAccountTools } from "./tools/account.js";
import { registerTradingTools } from "./tools/trading.js";
import { registerWalletTools } from "./tools/wallet.js";

const config = loadConfig();
const client = new MBClient(config);
const tracker = new SpendingTracker(config);

const server = new McpServer({
  name: "mcp-mercado-bitcoin",
  version: "1.0.0",
});

// ─── Status tool (always available) ───
server.tool(
  "mb_status",
  "Check the current configuration and health of the Mercado Bitcoin MCP server. " +
  "Shows operation mode, security limits, authentication status and daily spending.",
  {},
  async () => {
    const spending = tracker.getSummary();
    const status = {
      operationMode: config.operationMode,
      authenticated: client.hasCredentials,
      autoConfirm: config.autoConfirm,
      dryRun: config.dryRun,
      limits: {
        maxOrderBrl: spending.maxOrder !== null ? `R$ ${spending.maxOrder.toFixed(2)}` : "unlimited",
        dailyLimitBrl: spending.dailyLimit !== null ? `R$ ${spending.dailyLimit.toFixed(2)}` : "unlimited",
        dailySpent: `R$ ${spending.dailySpent.toFixed(2)}`,
      },
      availableCapabilities: [
        "public data (always available)",
        ...(config.operationMode !== "readonly" ? ["trading (place/cancel orders)"] : []),
        ...(config.operationMode === "full" ? ["wallet (withdrawals, sub-accounts)"] : []),
      ],
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }] };
  },
);

// ─── Register tool groups based on operation mode ───
// Public tools are always available
registerPublicTools(server, client);

// Account read tools are always available (they just need auth)
registerAccountTools(server, client, config, tracker);

// Trading tools require mode >= "trading"
if (config.operationMode === "trading" || config.operationMode === "full") {
  registerTradingTools(server, client, config, tracker);
}

// Wallet tools require mode = "full"
if (config.operationMode === "full") {
  registerWalletTools(server, client, config, tracker);
}

// ─── Start server ───
async function main() {
  console.error("╔══════════════════════════════════════════════╗");
  console.error("║       MCP Mercado Bitcoin v1.0.0             ║");
  console.error("╠══════════════════════════════════════════════╣");
  console.error(`║  Mode:         ${config.operationMode.padEnd(30)}║`);
  console.error(`║  Auth:         ${(client.hasCredentials ? "configured" : "NOT SET").padEnd(30)}║`);
  console.error(`║  Auto-confirm: ${String(config.autoConfirm).padEnd(30)}║`);
  console.error(`║  Dry-run:      ${String(config.dryRun).padEnd(30)}║`);
  if (config.maxOrderBrl !== null)
    console.error(`║  Max order:    R$ ${config.maxOrderBrl.toFixed(2).padEnd(27)}║`);
  if (config.dailyLimitBrl !== null)
    console.error(`║  Daily limit:  R$ ${config.dailyLimitBrl.toFixed(2).padEnd(27)}║`);
  console.error("╚══════════════════════════════════════════════╝");

  if (!client.hasCredentials) {
    console.error("[mcp-mb] WARNING: No API credentials configured. Only public data tools will work.");
    console.error("[mcp-mb] Set MB_API_KEY and MB_API_SECRET for full functionality.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp-mb] Server connected via stdio transport");
}

main().catch((error) => {
  console.error("[mcp-mb] Fatal error:", error);
  process.exit(1);
});
