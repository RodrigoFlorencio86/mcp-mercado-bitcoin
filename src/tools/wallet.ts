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

export function registerWalletTools(
  server: McpServer,
  client: MBClient,
  config: Config,
  _tracker: SpendingTracker,
): void {
  // ─── 1. Create Account (sub-wallet) ───
  server.tool(
    "mb_create_account",
    "Create a new sub-account (wallet) on Mercado Bitcoin. " +
    "Useful for separating funds for different strategies. Requires confirmation.",
    {
      name: z.string().min(3).describe("Name for the new account (min 3 chars)"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ name, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "full");
      if (modeErr) return err(modeErr);

      if (!confirm && !config.autoConfirm) {
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Create Sub-Account", { "Name": name }, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "Account would be created", name });
      }

      const data = await client.authPost("/accounts", { name });
      return ok(data);
    },
  );

  // ─── 2. List Crypto Deposits ───
  server.tool(
    "mb_list_deposits",
    "List cryptocurrency deposit history for an account. " +
    "Shows amounts, confirmations, status and transaction IDs.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Asset symbol, e.g. BTC, ETH"),
      limit: z.number().optional().describe("Max results (up to 10)"),
      page: z.number().optional().describe("Page number"),
      from: z.string().optional().describe("Start timestamp (Unix seconds)"),
      to: z.string().optional().describe("End timestamp (Unix seconds)"),
    },
    async ({ accountId, symbol, limit, page, from, to }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/${symbol}/deposits`, {
        limit: limit !== undefined ? String(limit) : undefined,
        page: page !== undefined ? String(page) : undefined,
        from,
        to,
      });
      return ok(data);
    },
  );

  // ─── 3. Get Deposit Addresses ───
  server.tool(
    "mb_get_deposit_addresses",
    "Get deposit addresses for receiving cryptocurrency. " +
    "Returns address hashes and QR codes. Specify network for multi-network assets.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Asset symbol, e.g. BTC, USDT"),
      network: z.string().optional().describe("Network, e.g. ethereum, stellar (required for multi-network assets)"),
    },
    async ({ accountId, symbol, network }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/${symbol}/deposits/addresses`, { network });
      return ok(data);
    },
  );

  // ─── 4. List Fiat Deposits (BRL) ───
  server.tool(
    "mb_list_fiat_deposits",
    "List BRL (fiat) deposit history via PIX. " +
    "Shows amounts, status, source bank info and timestamps.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().default("BRL").describe("Fiat currency (default: BRL)"),
      limit: z.number().optional().describe("Max results (up to 50)"),
      page: z.number().optional().describe("Page number (starts at 1)"),
      from: z.string().optional().describe("Start timestamp (Unix seconds)"),
      to: z.string().optional().describe("End timestamp (Unix seconds)"),
    },
    async ({ accountId, symbol, limit, page, from, to }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/fiat/${symbol}/deposits`, {
        limit: limit !== undefined ? String(limit) : undefined,
        page: page !== undefined ? String(page) : undefined,
        from,
        to,
      });
      return ok(data);
    },
  );

  // ─── 5. Withdraw ───
  server.tool(
    "mb_withdraw",
    "Withdraw cryptocurrency or BRL from your Mercado Bitcoin account.\n\n" +
    "CRITICAL SAFETY NOTES:\n" +
    "- Only pre-registered ('reliable') addresses/bank accounts are allowed\n" +
    "- Crypto withdrawals may require email confirmation\n" +
    "- BRL minimum withdrawal: R$50\n" +
    "- This is the highest-risk operation — requires MB_OPERATION_MODE=full\n\n" +
    "Two-step confirmation: call with confirm=false first to preview, then confirm=true.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Asset to withdraw, e.g. BTC, ETH, BRL"),
      quantity: z.string().describe("Amount to withdraw"),
      address: z.string().optional().describe("Crypto destination address (must be pre-registered as 'reliable')"),
      accountRef: z.number().optional().describe("Bank account reference ID (for BRL withdrawals)"),
      network: z.string().optional().describe("Blockchain network (required for multi-network assets)"),
      destinationTag: z.string().optional().describe("Memo/tag if required by the destination"),
      txFee: z.string().optional().describe("Custom transaction fee (crypto only)"),
      description: z.string().optional().describe("Description (max 30 chars)"),
      confirm: z.boolean().default(false).describe("Set true to execute after preview"),
    },
    async ({ accountId, symbol, quantity, address, accountRef, network, destinationTag, txFee, description, confirm }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const modeErr = requireMode(config, "full");
      if (modeErr) return err(modeErr);

      if (!confirm && !config.autoConfirm) {
        const isCrypto = symbol !== "BRL";
        const details: Record<string, string | number | undefined> = {
          "Asset": symbol,
          "Quantity": quantity,
          "Destination": isCrypto ? address : `Bank account ref #${accountRef}`,
          "Network": network,
          "Memo/Tag": destinationTag,
          "Fee": txFee,
          "Description": description,
          "WARNING": "Withdrawals send REAL funds out of your account. Verify the destination carefully!",
        };
        return {
          content: [{
            type: "text" as const,
            text: confirmationPreview("Withdrawal", details, config.dryRun),
          }],
        };
      }

      if (config.dryRun) {
        return ok({ dryRun: true, message: "Withdrawal would be executed", symbol, quantity, address, accountRef });
      }

      const body: Record<string, unknown> = { quantity };
      if (address) body.address = address;
      if (accountRef !== undefined) body.account_ref = accountRef;
      if (network) body.network = network;
      if (destinationTag) body.destination_tag = destinationTag;
      if (txFee) body.tx_fee = txFee;
      if (description) body.description = description;

      const data = await client.authPost(`/accounts/${accountId}/wallet/${symbol}/withdraw`, body);
      return ok(data);
    },
  );

  // ─── 6. List Withdrawals ───
  server.tool(
    "mb_list_withdrawals",
    "List withdrawal history for an asset. Shows amounts, status (open/done/canceled), " +
    "destination addresses and timestamps.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Asset symbol, e.g. BTC, BRL"),
      page: z.number().optional().describe("Page number"),
      pageSize: z.number().optional().describe("Page size (up to 50)"),
      from: z.string().optional().describe("Start timestamp (Unix seconds)"),
    },
    async ({ accountId, symbol, page, pageSize, from }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/${symbol}/withdraw`, {
        page: page !== undefined ? String(page) : undefined,
        page_size: pageSize !== undefined ? String(pageSize) : undefined,
        from,
      });
      return ok(data);
    },
  );

  // ─── 7. Get Withdrawal by ID ───
  server.tool(
    "mb_get_withdrawal",
    "Get detailed information about a specific withdrawal. " +
    "Status codes: 1=open (processing), 2=done (completed), 3=canceled.",
    {
      accountId: z.string().describe("Account ID"),
      symbol: z.string().describe("Asset symbol"),
      withdrawId: z.string().describe("Withdrawal ID"),
    },
    async ({ accountId, symbol, withdrawId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/${symbol}/withdraw/${withdrawId}`);
      return ok(data);
    },
  );

  // ─── 8. Get Withdraw Limits ───
  server.tool(
    "mb_get_withdraw_limits",
    "Get withdrawal limits per asset. Shows the maximum quantity allowed for withdrawals.",
    {
      accountId: z.string().describe("Account ID"),
      symbols: z.string().optional().describe("Comma-separated assets, e.g. BTC,ETH,BRL"),
    },
    async ({ accountId, symbols }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/withdraw/config/limits`, { symbols });
      return ok(data);
    },
  );

  // ─── 9. Get BRL Withdraw Config ───
  server.tool(
    "mb_get_brl_withdraw_config",
    "Get BRL withdrawal configuration: minimum/maximum limits, used limits and fee structure.",
    {
      accountId: z.string().describe("Account ID"),
    },
    async ({ accountId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/withdraw/config/BRL`);
      return ok(data);
    },
  );

  // ─── 10. List Trusted Crypto Addresses ───
  server.tool(
    "mb_list_withdraw_addresses",
    "List pre-registered ('reliable') crypto wallet addresses allowed for withdrawals. " +
    "Addresses must be registered via the Mercado Bitcoin web/app interface before they can be used.",
    {
      accountId: z.string().describe("Account ID"),
    },
    async ({ accountId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/withdraw/addresses`);
      return ok(data);
    },
  );

  // ─── 11. List Trusted Bank Accounts ───
  server.tool(
    "mb_list_bank_accounts",
    "List pre-registered bank accounts allowed for BRL withdrawals. " +
    "Bank accounts must be registered via the Mercado Bitcoin web/app interface before they can be used.",
    {
      accountId: z.string().describe("Account ID"),
    },
    async ({ accountId }) => {
      const authErr = requireAuth(config);
      if (authErr) return err(authErr);
      const data = await client.authGet(`/accounts/${accountId}/wallet/withdraw/bank-accounts`);
      return ok(data);
    },
  );
}
