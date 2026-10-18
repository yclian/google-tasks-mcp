import type { ApiAuth } from "../google/api.ts";
import { registerTaskListsTools } from "./tasklists.ts";
import { registerTasksTools } from "./tasks.ts";

export function registerAllTools(server: any, mcpAccessToken: ApiAuth) {
  registerTaskListsTools(server, mcpAccessToken);
  registerTasksTools(server, mcpAccessToken);
}
