import type { AppDeps } from "../deps.ts";
import { encrypt, decrypt } from "../utils/encryption.ts";

export interface TokenData {
  googleAccessToken: string;
  googleRefreshToken: string;
  expiresAt: number;
}

interface EncryptedTokenData {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: number;
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type TokenStore = ReturnType<typeof createTokenStore>;

export function createTokenStore(deps: Pick<AppDeps, "store">) {
  const { store } = deps;

  async function storeTokens(mcpToken: string, tokenData: TokenData): Promise<void> {
    const encryptedData: EncryptedTokenData = {
      encryptedAccessToken: encrypt(tokenData.googleAccessToken),
      encryptedRefreshToken: encrypt(tokenData.googleRefreshToken),
      expiresAt: tokenData.expiresAt,
    };
    await store.set(["tokens", mcpToken], encryptedData, { ttlMs: TTL_MS });
  }

  async function getTokens(mcpToken: string): Promise<TokenData | null> {
    const value = await store.get<EncryptedTokenData>(["tokens", mcpToken]);
    if (!value) {
      return null;
    }
    return {
      googleAccessToken: decrypt(value.encryptedAccessToken),
      googleRefreshToken: decrypt(value.encryptedRefreshToken),
      expiresAt: value.expiresAt,
    };
  }

  async function isValid(mcpToken: string): Promise<boolean> {
    return (await getTokens(mcpToken)) !== null;
  }

  async function updateTokens(mcpToken: string, updates: Partial<TokenData>): Promise<void> {
    const existing = await getTokens(mcpToken);
    if (!existing) throw new Error("Token not found");
    await storeTokens(mcpToken, { ...existing, ...updates });
  }

  async function deleteToken(mcpToken: string): Promise<void> {
    await store.delete(["tokens", mcpToken]);
  }

  return { storeTokens, getTokens, isValid, updateTokens, deleteToken };
}
