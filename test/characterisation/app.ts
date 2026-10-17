// Builds the app the characterisation goldens run against. Upstream wires
// module-level singletons and calls the global fetch, so Google is stubbed at
// the global (a third-party edge, not src/).
import { vi } from "vitest";
import process from "node:process";
import type { GoogleFake } from "../support/google-fake.ts";
import {
  PLANTED_GOOGLE_CLIENT_CREDENTIAL,
  PLANTED_GOOGLE_CLIENT_ID,
  PLANTED_KEY_MATERIAL,
  PLANTED_REDIRECT_URI,
} from "../support/planted.ts";

export async function makeCharacterisationApp(google: GoogleFake) {
  process.env.ENCRYPTION_SECRET = PLANTED_KEY_MATERIAL;
  vi.stubGlobal("fetch", google.fetch);
  const { tokenStore } = await import("../../src/auth/token-store.ts");
  const { initOAuthStore } = await import("../../src/auth/oauth.ts");
  const { initRateLimiter } = await import("../../src/server/rate-limiter.ts");
  const { setOAuthConfig } = await import("../../src/config.ts");
  const { createApp } = await import("../../src/server/app.ts");
  await tokenStore.init();
  await initOAuthStore();
  await initRateLimiter();
  const oauthConfig = {
    clientId: PLANTED_GOOGLE_CLIENT_ID,
    clientSecret: PLANTED_GOOGLE_CLIENT_CREDENTIAL,
    redirectUri: PLANTED_REDIRECT_URI,
  };
  setOAuthConfig(oauthConfig);
  const app = createApp({ oauthConfig });
  return {
    app,
    cleanup: async () => {
      vi.unstubAllGlobals();
    },
  };
}
