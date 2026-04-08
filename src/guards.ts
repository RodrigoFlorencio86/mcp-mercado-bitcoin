import { Config, OperationMode } from "./config.js";

const MODE_LEVEL: Record<OperationMode, number> = {
  readonly: 0,
  trading: 1,
  full: 2,
};

/**
 * Checks if the current operation mode allows the required mode.
 * Returns an error message if denied, null if allowed.
 */
export function requireMode(config: Config, required: OperationMode): string | null {
  if (MODE_LEVEL[config.operationMode] < MODE_LEVEL[required]) {
    return (
      `This operation requires MB_OPERATION_MODE="${required}" but the current mode is "${config.operationMode}". ` +
      `Update the environment variable to enable this capability.`
    );
  }
  return null;
}

/**
 * Checks that API credentials are configured.
 */
export function requireAuth(config: Config): string | null {
  if (!config.apiKey || !config.apiSecret) {
    return (
      "This operation requires authentication. " +
      "Set MB_API_KEY and MB_API_SECRET environment variables with your Mercado Bitcoin API credentials."
    );
  }
  return null;
}

/**
 * Tracks daily spending to enforce configurable limits.
 * Resets automatically at midnight (server timezone).
 * This is a soft guard — resets on server restart by design.
 */
export class SpendingTracker {
  private dailySpent = 0;
  private lastResetDate = new Date().toDateString();

  constructor(private config: Config) {}

  private checkReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailySpent = 0;
      this.lastResetDate = today;
      console.error("[mcp-mb] Daily spending tracker reset");
    }
  }

  /**
   * Validates an order against configured limits.
   * Returns an error message if the order should be blocked, null if OK.
   */
  validateOrder(estimatedValueBrl: number): string | null {
    this.checkReset();

    if (this.config.maxOrderBrl !== null && estimatedValueBrl > this.config.maxOrderBrl) {
      return (
        `BLOCKED: Order value R$${estimatedValueBrl.toFixed(2)} exceeds the per-order limit of ` +
        `R$${this.config.maxOrderBrl.toFixed(2)} (MB_MAX_ORDER_BRL).`
      );
    }

    if (
      this.config.dailyLimitBrl !== null &&
      this.dailySpent + estimatedValueBrl > this.config.dailyLimitBrl
    ) {
      return (
        `BLOCKED: This order would push daily spending to R$${(this.dailySpent + estimatedValueBrl).toFixed(2)}, ` +
        `exceeding the daily limit of R$${this.config.dailyLimitBrl.toFixed(2)} (MB_DAILY_LIMIT_BRL). ` +
        `Already spent today: R$${this.dailySpent.toFixed(2)}.`
      );
    }

    return null;
  }

  recordSpend(valueBrl: number): void {
    this.checkReset();
    this.dailySpent += valueBrl;
    console.error(`[mcp-mb] Daily spend recorded: R$${valueBrl.toFixed(2)} (total today: R$${this.dailySpent.toFixed(2)})`);
  }

  getSummary(): { dailySpent: number; dailyLimit: number | null; maxOrder: number | null } {
    this.checkReset();
    return {
      dailySpent: this.dailySpent,
      dailyLimit: this.config.dailyLimitBrl,
      maxOrder: this.config.maxOrderBrl,
    };
  }
}

/**
 * Builds a confirmation preview for dangerous operations.
 * Returns the preview text that the LLM should show to the user.
 */
export function confirmationPreview(
  operation: string,
  details: Record<string, string | number | undefined>,
  dryRun: boolean,
): string {
  let text = dryRun ? `[DRY-RUN] ` : ``;
  text += `** CONFIRMATION REQUIRED: ${operation} **\n\n`;

  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined) {
      text += `  ${key}: ${value}\n`;
    }
  }

  text += `\nTo proceed, call this tool again with confirm = true.`;
  text += `\nTo cancel, simply do not call again.`;
  return text;
}
