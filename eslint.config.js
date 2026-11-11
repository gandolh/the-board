import { houseStyle } from "./vendor/house-style/eslint.config.js";

/**
 * The house config from the vendored house-style copy, given brief-board's folders. Thin on purpose:
 * the compiler is the first gate, and the house adds only what it cannot see. The rules and the
 * reason for each are in the copy.
 */
export default [
  ...houseStyle({
    root: import.meta.dirname,
    web: "web/src",
    server: "server/src",
    // Scripts run by hand: the demo seeder prints and reads the environment.
    scripts: ["scripts"],
    // Allowed to print: the CLI's one output boundary, the server entry, and the seed command.
    console: ["cli/src/index.ts", "server/src/index.ts", "server/src/seed.ts"],
    // scripts/*.ts sits outside every tsconfig, so typed lint takes it as a default project.
    typed: { allowDefaultProject: ["scripts/*.ts"] },
    // The CLI entry hands the environment to its commands: the one place the CLI reads it.
    env: ["**/config.ts", "cli/src/index.ts"],
    // data/ is the local database.
    ignores: ["data/**"],
  }),
  {
    // A warning for now (2026-11-11): these files still read the environment themselves. When the
    // server takes its settings from config.ts, this block goes and the rule is an error again.
    name: "brief-board/process-env-warns",
    files: ["server/src/index.ts", "server/src/seed.ts"],
    rules: { "n/no-process-env": "warn" },
  },
  {
    // The CommonJS dependency-cruiser config needs Node's globals.
    name: "brief-board/cjs-globals",
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { module: "readonly", require: "readonly" } },
  },
];
