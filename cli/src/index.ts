#!/usr/bin/env node
import { readFileSync } from "node:fs";

/**
 * `brief-board`: the one client agents use. Brief 04 adds the commands; for
 * now it answers `--version`. It must run with plain `node` from `dist/`, with
 * no dev tools on PATH, because other repos call it by name.
 */
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  console.log(pkg.version);
} else {
  console.log(`brief-board ${pkg.version}. Commands arrive with brief 04.`);
}
