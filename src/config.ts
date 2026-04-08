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

export function loadConfig(): Config {
  const mode = process.env.MB_OPERATION_MODE as OperationMode | undefined;
  return {
    apiKey: process.env.MB_API_KEY ?? "",
    apiSecret: process.env.MB_API_SECRET ?? "",
    operationMode: mode && ["readonly", "trading", "full"].includes(mode) ? mode : "trading",
    autoConfirm: process.env.MB_AUTO_CONFIRM === "true",
    maxOrderBrl: process.env.MB_MAX_ORDER_BRL ? Number(process.env.MB_MAX_ORDER_BRL) : null,
    dailyLimitBrl: process.env.MB_DAILY_LIMIT_BRL ? Number(process.env.MB_DAILY_LIMIT_BRL) : null,
    dryRun: process.env.MB_DRY_RUN === "true",
    baseUrl: "https://api.mercadobitcoin.net/api/v4",
  };
}
