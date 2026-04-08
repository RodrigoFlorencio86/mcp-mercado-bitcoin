import { Config } from "./config.js";
import { AuthManager } from "./auth.js";

export class MBClient {
  readonly auth: AuthManager;

  constructor(private config: Config) {
    this.auth = new AuthManager(config);
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  get hasCredentials(): boolean {
    return this.auth.hasCredentials();
  }

  // --- Public (unauthenticated) requests ---

  async publicGet<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url);
    return this.handleResponse<T>(res);
  }

  // --- Authenticated requests ---

  async authGet<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const token = await this.auth.getToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return this.handleResponse<T>(res);
  }

  async authPost<T = unknown>(path: string, body?: unknown): Promise<T> {
    const token = await this.auth.getToken();
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async authDelete<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const token = await this.auth.getToken();
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return this.handleResponse<T>(res);
  }

  // --- Helpers ---

  private buildUrl(path: string, params?: Record<string, string | undefined>): string {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Mercado Bitcoin API error (HTTP ${res.status}): ${body}`);
    }
    return (await res.json()) as T;
  }
}
