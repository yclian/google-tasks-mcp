import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import { createOAuthRouter } from "../auth/oauth.ts";
import { createTokenStore } from "../auth/token-store.ts";
import { createGoogleTokenProvider } from "../google/client.ts";
import type { AppDeps } from "../deps.ts";
import { authenticateBearer } from "./middleware.ts";
import { issuer, MCP_PATH, PRM_PATH } from "../auth/issuer.ts";
import { handleMcpMethodNotAllowed, handleMcpPost } from "./mcp-endpoints.ts";

const MCP_ENDPOINT = MCP_PATH;

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const tokenStore = createTokenStore(deps);
  const google = createGoogleTokenProvider(deps, tokenStore);
  const requireBearer = authenticateBearer(deps, tokenStore, google);

  app.use("*", async (c, next) => {
    await next();

    if (c.req.url.startsWith("https://")) {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    // Only set restrictive CSP if a route-specific one hasn't been set already
    if (!c.res.headers.get("Content-Security-Policy")) {
      c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    }
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  });

  app.use("*", cors({
    origin: (origin) => {
      if (!origin) {
        return "*";
      }

      if (origin.match(/^https?:\/\/localhost(:\d+)?$/) ||
          origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
        return origin;
      }

      const allowedOrigins = deps.config.allowedOrigins;
      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      return null;
    },
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "Mcp-Protocol-Version", "Accept"],
    exposeHeaders: ["Mcp-Session-Id", "Content-Type"],
    credentials: false,
    maxAge: 86400,
  }));

  const publicPages = deps.config.publicPages;

  app.get("/", async (c) => {
    if (!publicPages) {
      return c.json({ message: "Google Tasks MCP Server" });
    }
    try {
      const html = await readFile("./public/index.html", "utf-8");
      c.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://www.googletagmanager.com; connect-src https://www.google-analytics.com; frame-ancestors 'none'");
      return c.html(html);
    } catch {
      return c.json({ message: "Google Tasks MCP Server" });
    }
  });

  app.route("/", createOAuthRouter(deps, tokenStore));

  app.get("/auth/callback", (c) => {
    const url = new URL(c.req.url);
    url.pathname = "/callback";
    return c.redirect(url.toString());
  });

  app.post(MCP_ENDPOINT, requireBearer, handleMcpPost(deps, google));
  app.get(MCP_ENDPOINT, requireBearer, handleMcpMethodNotAllowed);
  app.delete(MCP_ENDPOINT, requireBearer, handleMcpMethodNotAllowed);

  // Protected-resource metadata, at the origin and at the /mcp path suffix.
  const protectedResource = (c: Context) => {
    const base = issuer(deps, c.req.raw);
    return c.json({
      resource: `${base}${MCP_ENDPOINT}`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
    });
  };
  app.get(PRM_PATH, protectedResource);
  app.get(`${PRM_PATH}${MCP_ENDPOINT}`, protectedResource);

  app.get("/.well-known/oauth-authorization-server", (c) => {
    const baseUrl = issuer(deps, c.req.raw);
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      grant_types_supported: ["authorization_code", "refresh_token"],
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      mcp_endpoint: `${baseUrl}${MCP_ENDPOINT}`,
    });
  });

  app.get("/favicon.ico", async (c) => {
    try {
      const file = await readFile("./public/favicon.ico");
      return c.body(file, 200, { "Content-Type": "image/x-icon" });
    } catch {
      return c.notFound();
    }
  });

  app.get("/privacy-policy", async (c) => {
    if (!publicPages) {
      return c.notFound();
    }
    try {
      const html = await readFile("./public/privacy-policy.html", "utf-8");
      c.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://www.googletagmanager.com; connect-src https://www.google-analytics.com; frame-ancestors 'none'");
      return c.html(html);
    } catch {
      return c.notFound();
    }
  });

  app.get("/health", async (c) => {
    if (!publicPages) {
      return c.json({ status: "ok" });
    }
    try {
      const html = await readFile("./public/health.html", "utf-8");
      c.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://www.googletagmanager.com; connect-src https://www.google-analytics.com; frame-ancestors 'none'");
      return c.html(html);
    } catch {
      return c.json({ status: "ok" });
    }
  });

  app.onError((err, c) => {
    console.error("Unhandled error:", err);
    return c.json({
      error: "internal_server_error",
      error_description: "An internal server error occurred. Please try again later."
    }, 500);
  });

  return app;
}
