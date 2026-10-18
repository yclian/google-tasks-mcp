import { Context } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAllTools } from "../tools/index.ts";
import type { AppDeps } from "../deps.ts";
import type { TokenStore } from "../auth/token-store.ts";
import { createLegacyGoogleClient } from "../google/client.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger({ component: "mcp-endpoints" });

/**
 * POST /mcp: stateless Streamable HTTP. Each request gets its own server and
 * transport, so any instance can serve any request (no sessions, no SSE).
 */
export const handleMcpPost = (deps: AppDeps, tokenStore: TokenStore) => async (c: Context) => {
  const mcpToken = c.get("mcpToken") as string;

  const server = new McpServer(
    {
      name: "google-tasks-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  registerAllTools(server, createLegacyGoogleClient(deps, tokenStore, mcpToken));

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
    logger.error("Failed to handle MCP request", { error: String(error) });
    throw error;
  } finally {
    // JSON responses are complete once handleRequest resolves.
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
};

/** GET/DELETE /mcp: no server-initiated streams or sessions in stateless mode. */
export function handleMcpMethodNotAllowed(c: Context) {
  return c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    405,
    { Allow: "POST" },
  );
}
