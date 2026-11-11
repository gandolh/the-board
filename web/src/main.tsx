import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./auth";
import { AuthGate } from "./AuthGate";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root");
createRoot(root).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);
