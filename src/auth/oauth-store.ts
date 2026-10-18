import type { AppDeps } from "../deps.ts";

export interface OAuthSession {
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  redirectUri: string;
  clientId?: string;
}

export interface AuthCode {
  googleCode: string;
  clientId?: string;
  redirectUri: string;
  codeChallenge?: string;
}

export interface RegisteredClient {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
}

const TEN_MINUTES = 600000;

export type OAuthStore = ReturnType<typeof createOAuthStore>;

export function createOAuthStore(deps: Pick<AppDeps, "store">) {
  const { store } = deps;
  return {
    storeSession: (sessionId: string, session: OAuthSession) =>
      store.set(["oauth_sessions", sessionId], session, { ttlMs: TEN_MINUTES }),
    getSession: (sessionId: string) => store.get<OAuthSession>(["oauth_sessions", sessionId]),
    deleteSession: (sessionId: string) => store.delete(["oauth_sessions", sessionId]),
    storeAuthCode: (code: string, data: AuthCode) => store.set(["auth_codes", code], data, { ttlMs: TEN_MINUTES }),
    getAuthCode: (code: string) => store.get<AuthCode>(["auth_codes", code]),
    deleteAuthCode: (code: string) => store.delete(["auth_codes", code]),
    registerClient: (clientId: string, client: RegisteredClient) => store.set(["clients", clientId], client),
    getClient: (clientId: string) => store.get<RegisteredClient>(["clients", clientId]),
  };
}
