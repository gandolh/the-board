import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The board itself is brief 07's. This only proves the toolchain end to end.
function App() {
  return <h1>brief-board</h1>;
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
