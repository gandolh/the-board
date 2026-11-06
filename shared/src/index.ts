/**
 * @brief-board/shared: what the server, the board and the CLI must agree on.
 * The statuses and their order, the move table, the key format, the zod
 * schema of every route, and how a run's duration is worked out and written.
 * The words come from the glossary in corpus/wiki/glossary.md.
 */
export * from "./status.js";
export * from "./moves.js";
export * from "./key.js";
export * from "./api.js";
export * from "./duration.js";
export * from "./needs.js";
