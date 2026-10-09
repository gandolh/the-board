/**
 * @brief-board/shared: what the server, the board and the CLI must agree on.
 * The statuses and their order, the move table, the key format, and the zod
 * schema of every route (brief 02). The words come from the glossary in
 * corpus/wiki/glossary.md.
 */
export * from "./status.js";
export * from "./moves.js";
export * from "./key.js";
export * from "./api.js";
