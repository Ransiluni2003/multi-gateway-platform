/**
 * Upstash REST Rate Limiter
 *
 * Uses Upstash Redis REST API (no TCP connection needed)
 *
 * Requires:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { IRateLimiter, RateLimiterConfig } from "./IRateLimiter";

interface UpstashResponse<T> {
  result?: T;
  error?: string;
}

export class UpstashRateLimiter implements IRateLimiter {
  private restUrl: string;
  private restToken: string;
  private keyPrefix = "ratelimit";

  constructor(private config: RateLimiterConfig) {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!restUrl || !restToken) {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
    }
    this.restUrl = restUrl.replace(/\/$/, "");
    this.restToken = restToken;
  }

  private async call<T>(path: string): Promise<UpstashResponse<T>> {
    const resp = await fetch(`${this.restUrl}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.restToken}`,
      },
    });
    return resp.json();
  }

  private key(identifier: string) {
    return `${this.keyPrefix}:${identifier}`;
  }

  async isRateLimited(identifier: string): Promise<{ limited: boolean; resetAt?: Date }> {
    const key = this.key(identifier);
    try {
      const data = await this.call<string>(`get/${encodeURIComponent(key)}`);
      if (!data.result) return { limited: false };

      const entry = JSON.parse(data.result) as { resetAt: string; blocked: boolean };
      const resetAt = new Date(entry.resetAt);
      if (resetAt < new Date()) {
        await this.call<number>(`del/${encodeURIComponent(key)}`);
        return { limited: false };
      }

      return entry.blocked ? { limited: true, resetAt } : { limited: false };
    } catch (error) {
      console.error("Upstash isRateLimited error:", error);
      return { limited: false };
    }
  }

  async incrementAttempt(identifier: string): Promise<void> {
    const key = this.key(identifier);
    const now = new Date();

    try {
      const data = await this.call<string>(`get/${encodeURIComponent(key)}`);
      let entry: { count: number; resetAt: string; blocked: boolean };

      if (!data.result) {
        entry = {
          count: 1,
          resetAt: new Date(now.getTime() + this.config.windowMinutes * 60 * 1000).toISOString(),
          blocked: false,
        };
      } else {
        entry = JSON.parse(data.result);
        const resetAt = new Date(entry.resetAt);

        if (resetAt < now) {
          entry = {
            count: 1,
            resetAt: new Date(now.getTime() + this.config.windowMinutes * 60 * 1000).toISOString(),
            blocked: false,
          };
        } else {
          entry.count += 1;
          if (entry.count > this.config.maxAttempts) {
            entry.blocked = true;
            entry.resetAt = new Date(
              now.getTime() + this.config.blockDurationMinutes * 60 * 1000
            ).toISOString();
          }
        }
      }

      const ttl = Math.ceil((new Date(entry.resetAt).getTime() - now.getTime()) / 1000);
      await this.call<string>(
        `setex/${encodeURIComponent(key)}/${ttl}/${encodeURIComponent(JSON.stringify(entry))}`
      );
    } catch (error) {
      console.error("Upstash incrementAttempt error:", error);
    }
  }

  async blockIdentifier(identifier: string): Promise<void> {
    const key = this.key(identifier);
    const now = new Date();
    const entry = {
      count: this.config.maxAttempts + 1,
      resetAt: new Date(
        now.getTime() + this.config.blockDurationMinutes * 60 * 1000
      ).toISOString(),
      blocked: true,
    };

    try {
      const ttl = this.config.blockDurationMinutes * 60;
      await this.call<string>(
        `setex/${encodeURIComponent(key)}/${ttl}/${encodeURIComponent(JSON.stringify(entry))}`
      );
    } catch (error) {
      console.error("Upstash blockIdentifier error:", error);
    }
  }

  async resetIdentifier(identifier: string): Promise<void> {
    const key = this.key(identifier);
    try {
      await this.call<number>(`del/${encodeURIComponent(key)}`);
    } catch (error) {
      console.error("Upstash resetIdentifier error:", error);
    }
  }

  async getAttemptCount(identifier: string): Promise<number> {
    const key = this.key(identifier);
    try {
      const data = await this.call<string>(`get/${encodeURIComponent(key)}`);
      if (!data.result) return 0;

      const entry = JSON.parse(data.result) as { count: number; resetAt: string };
      if (new Date(entry.resetAt) < new Date()) {
        await this.call<number>(`del/${encodeURIComponent(key)}`);
        return 0;
      }

      return entry.count;
    } catch (error) {
      console.error("Upstash getAttemptCount error:", error);
      return 0;
    }
  }
}
