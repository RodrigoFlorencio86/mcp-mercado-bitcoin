export type OperationMode = "readonly" | "trading" | "full";

export interface Config {
  apiKey: string;
  apiSecret: string;
  operationMode: OperationMode;
  autoConfirm: boolean;
  maxOrderBrl: number | null;
  dailyLimitBrl: number | null;
  dryRun: boolean;
  baseUrl: string;
}

function parsePositiveNumber(name: string, val: string | undefined): number | null {
  if (!val) return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n) || n <= 0) {
    console.error(`[mcp-mb] WARNING: ${name}="${val}" is not a valid positive number — ignoring.`);
    return null;
  }
  return n;
}

export function loadConfig(): Config {
  const mode = process.env.MB_OPERATION_MODE as OperationMode | undefined;
  return {
    apiKey: process.env.MB_API_KEY ?? "",
    apiSecret: process.env.MB_API_SECRET ?? "",
    operationMode: mode && ["readonly", "trading", "full"].includes(mode) ? mode : "trading",
    autoConfirm: process.env.MB_AUTO_CONFIRM === "true",
    maxOrderBrl: parsePositiveNumber("MB_MAX_ORDER_BRL", process.env.MB_MAX_ORDER_BRL),
    dailyLimitBrl: parsePositiveNumber("MB_DAILY_LIMIT_BRL", process.env.MB_DAILY_LIMIT_BRL),
    dryRun: process.env.MB_DRY_RUN === "true",
    baseUrl: "https://api.mercadobitcoin.net/api/v4",
  };
}
