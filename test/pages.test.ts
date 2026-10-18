import { describe, expect, it } from "vitest";
import { startTestServer } from "./support/test-server.ts";
import { req } from "./support/oauth-driver.ts";

describe("public pages", () => {
  it("public_pages_false", async () => {
    const s = await startTestServer({ env: { PUBLIC_PAGES: "false" } });
    const root = await req(s.app, "/");
    expect(root.status).toBe(200);
    expect(root.headers.get("content-type")).toMatch(/application\/json/);
    expect(await root.json()).toEqual({ message: "Google Tasks MCP Server" });
    const health = await req(s.app, "/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect((await req(s.app, "/privacy-policy")).status).toBe(404);
    for (const path of ["/", "/health", "/privacy-policy", "/favicon.ico"]) {
      const r = await req(s.app, path);
      expect(r.headers.get("content-security-policy") ?? "", path).not.toContain("googletagmanager");
    }
  });

  it("public_pages_default", async () => {
    const s = await startTestServer();
    const root = await req(s.app, "/");
    expect(root.headers.get("content-type")).toMatch(/text\/html/);
    expect(await root.text()).toContain("<html");
  });
});
