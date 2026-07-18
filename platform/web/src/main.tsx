import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { KageApi } from "./api/client";

// Bootstrap. The portal is served same-origin by the Kage daemon under `/app/`, so the API base is
// the empty string (relative `/v2/...` requests, satisfying `connect-src 'self'`). The machine token
// is injected by the daemon at serve time via a global it writes into the page; until Task 3 wires
// the token/onboarding flow, fall back to an empty token so the shell still mounts in dev.
declare global {
  interface Window {
    __KAGE_TOKEN__?: string;
  }
}

const token = window.__KAGE_TOKEN__ ?? "";
const api = new KageApi("", token);

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
