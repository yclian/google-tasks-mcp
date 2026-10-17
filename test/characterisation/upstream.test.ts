// CHARACTERISATION, NOT CERTIFICATION. These goldens record what upstream did
// before the GCP-deployment changes. Each one is deleted when the scenario that
// certifies the same behaviour lands (see README.md here).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GoogleFake } from "../support/google-fake.ts";
import { login, req } from "../support/oauth-driver.ts";
import { callTool, mcp } from "../support/mcp-client.ts";
import { TOOL_CASES } from "../support/tool-cases.ts";
import { makeCharacterisationApp } from "./app.ts";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

function normalise(v: unknown): unknown {
  if (typeof v === "string") {
    const s = v.replace(UUID, "<uuid>");
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return { __json: normalise(parsed) };
    } catch {
      // not JSON
    }
    return s;
  }
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalise(x)]));
  return v;
}

const golden = (name: string) => `__goldens__/${name}.json`;
const pretty = (v: unknown) => JSON.stringify(normalise(v), null, 2) + "\n";

describe("characterisation: upstream behaviour", () => {
  const google = new GoogleFake();
  let app: Awaited<ReturnType<typeof makeCharacterisationApp>>["app"];
  let cleanup: () => Promise<void>;
  let token: string;
  let tokenResponse: unknown;

  beforeAll(async () => {
    ({ app, cleanup } = await makeCharacterisationApp(google));
    const l = await login(app, google);
    token = l.tokens.access_token;
    tokenResponse = { ...l.tokens };
  });
  afterAll(async () => {
    await cleanup();
  });

  it("token_response", async () => {
    await expect(pretty(tokenResponse)).toMatchFileSnapshot(golden("token_response"));
  });

  it("as_metadata", async () => {
    const r = await req(app, "/.well-known/oauth-authorization-server");
    await expect(pretty(await r.json())).toMatchFileSnapshot(golden("as_metadata"));
  });

  it("initialize", async () => {
    const r = await mcp(app, token, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "characterisation", version: "0" },
    });
    await expect(pretty(r.messages)).toMatchFileSnapshot(golden("initialize"));
  });

  it("tools_list", async () => {
    const r = await mcp(app, token, "tools/list");
    await expect(pretty(r.messages)).toMatchFileSnapshot(golden("tools_list"));
  });

  for (const c of TOOL_CASES) {
    it(`${c.tool}_ok`, async () => {
      google.queue(`${c.endpoint}.ok`);
      const r = await callTool(app, token, c.tool, c.args);
      await expect(pretty({ result: r.result, error: r.error })).toMatchFileSnapshot(golden(`${c.tool}_ok`));
    });
    it(`${c.tool}_google_error`, async () => {
      google.queue(`${c.endpoint}.err`);
      const r = await callTool(app, token, c.tool, c.args);
      await expect(pretty({ result: r.result, error: r.error })).toMatchFileSnapshot(golden(`${c.tool}_google_error`));
    });
  }
});
