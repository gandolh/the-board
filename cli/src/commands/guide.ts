import { readFileSync } from "node:fs";
import type { Runtime } from "../runtime.js";

/** `guide`: print the rules agents follow, from `src/guide.md` (brief 06 writes them). */
export async function guide(rt: Runtime, _args: string[], packageRoot: URL): Promise<void> {
  rt.out(readFileSync(new URL("src/guide.md", packageRoot), "utf8").trimEnd());
}
