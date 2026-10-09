#!/usr/bin/env node
import { homedir } from "node:os";
import { main } from "./main.js";

/**
 * The `brief-board` binary. It runs from `dist/` with plain `node` and no dev
 * tools on PATH, because other repos call it by name. `src/` and `dist/` sit
 * one level under the package, so `../` is the package root either way.
 */
process.exitCode = await main(
  process.argv.slice(2),
  {
    env: process.env,
    cwd: process.cwd(),
    home: homedir(),
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
  new URL("../", import.meta.url),
);
