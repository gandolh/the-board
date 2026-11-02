/**
 * Where the API is, as the browser sees it: Caddy (and the Vite dev proxy)
 * forward `/brief-board-api/*` to the server with the prefix stripped, and the
 * server strips it itself when reached directly, so one build runs in both
 * places.
 */
export const API_BASE = "/brief-board-api";
