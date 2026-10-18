import type { AppDeps } from "../deps.ts";
import type { TokenStore } from "../auth/token-store.ts";
import { refreshGoogleToken } from "./oauth.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger({ component: "google-client" });

/** What the Tasks API functions need: a valid Google access token and a fetch. */
export interface GoogleClient {
  getAccessToken(): Promise<string>;
  fetch: typeof fetch;
}

/** Google client for one MCP bearer token in the original token model. */
export function createLegacyGoogleClient(deps: AppDeps, tokenStore: TokenStore, mcpToken: string): GoogleClient {
  return {
    fetch: deps.fetch,
    async getAccessToken() {
      const tokenData = await tokenStore.getTokens(mcpToken);
      if (!tokenData) {
        throw new Error("Invalid or expired MCP token");
      }
      if (deps.clock() >= tokenData.expiresAt - 60000) {
        logger.info("Access token expired, refreshing");
        const refreshed = await refreshGoogleToken(deps, tokenData.googleRefreshToken);
        await tokenStore.updateTokens(mcpToken, {
          googleAccessToken: refreshed.accessToken,
          googleRefreshToken: refreshed.refreshToken,
          expiresAt: deps.clock() + refreshed.expiresIn * 1000,
        });
        return refreshed.accessToken;
      }
      return tokenData.googleAccessToken;
    },
  };
}
