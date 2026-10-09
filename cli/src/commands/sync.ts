import type { Runtime } from "../runtime.js";
import { UsageError } from "../errors.js";

/** `sync`: brief 05 builds it. */
export async function sync(_rt: Runtime, _args: string[]): Promise<void> {
  throw new UsageError("sync is not implemented yet");
}
