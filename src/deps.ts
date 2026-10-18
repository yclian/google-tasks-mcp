import type { Config } from "./config.ts";
import type { TokenCipher } from "./crypto/cipher.ts";
import { StaticCipher } from "./crypto/static.ts";
import { DenoKvStore } from "./store/denokv.ts";
import type { Clock, Store } from "./store/store.ts";

/** Everything the app needs from the outside world, injected once at startup. */
export interface AppDeps {
  store: Store;
  clock: Clock;
  config: Config;
  cipher: TokenCipher;
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
  const cipher = new StaticCipher(config.encryptionSecret!);
  const store = await DenoKvStore.open({ path: config.kvPath, clock });
  return { store, clock, config, cipher, fetch: (input, init) => fetch(input, init) };
}
