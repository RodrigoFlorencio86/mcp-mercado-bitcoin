import { Config } from "./config.js";

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

export class AuthManager {
  private token: TokenState | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(private config: Config) {}

  async getToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }

    // Prevent concurrent refresh races
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.refresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refresh(): Promise<string> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error(
        "MB_API_KEY and MB_API_SECRET are required for authenticated operations. " +
        "Generate API credentials at https://www.mercadobitcoin.com.br (Settings > API)."
      );
    }

    const res = await fetch("https://api.mercadobitcoin.net/api/v4/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "global",
        client_id: this.config.apiKey,
        client_secret: this.config.apiSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Authentication failed (HTTP ${res.status}). ` +
        `Verify your MB_API_KEY and MB_API_SECRET. Response: ${body}`
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    console.error(`[mcp-mb] Token refreshed, expires in ${data.expires_in}s`);
    return this.token.accessToken;
  }

  hasCredentials(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret);
  }
}
