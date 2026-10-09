import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the board runs on Vite's own server and reaches the API through this
// proxy, so the browser sees one origin, as it does when the server serves the
// built board.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8806",
    },
  },
});
