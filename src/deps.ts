import type { Config } from "./config.ts";
import { DenoKvStore } from "./store/denokv.ts";
import type { Clock, Store } from "./store/store.ts";

/** Everything the app needs from the outside world, injected once at startup. */
export interface AppDeps {
  store: Store;
  clock: Clock;
  config: Config;
  fetch: typeof fetch;
}

export async function buildDeps(config: Config): Promise<AppDeps> {
  const clock: Clock = Date.now;
  if (config.storage === "firestore") {
    throw new Error("STORAGE=firestore is not available in this build yet");
  }
  if (config.cipher === "gcpkms") {
    throw new Error("CIPHER=gcpkms is not available in this build yet");
  }
  const store = await DenoKvStore.open({ path: config.kvPath, clock });
  return { store, clock, config, fetch: (input, init) => fetch(input, init) };
}
