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
    // Class order and unknown classes are errors: the one stylesheet is the entry.
    tailwind: { css: "web/src/styles/index.css", order: true },
    server: "server/src",
    // Scripts run by hand: the demo seeder prints and reads the environment.
    scripts: ["scripts"],
    // Allowed to print: the CLI's one output boundary, the server entry, and the seed command.
    console: ["cli/src/index.ts", "server/src/server.ts", "server/src/seed.ts"],
    // scripts/*.ts sits outside every tsconfig, so typed lint takes it as a default project.
    typed: { allowDefaultProject: ["scripts/*.ts"] },
    // The CLI entry hands the environment to its commands: the one place the CLI reads it.
    env: ["**/config.ts", "cli/src/index.ts"],
    // data/ is the local database.
    ignores: ["data/**"],
  }),
];
