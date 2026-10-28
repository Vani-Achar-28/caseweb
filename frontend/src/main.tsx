import { createRoot } from "react-dom/client";
import "./styles.css";
import { startSync } from "./lib/sync";

const root = document.getElementById("root")!;
root.textContent = "Loading cases...";

// 1. load the saved cases from the database, 2. then start the app (store first, then App, as before)
startSync()
  .catch(() => undefined)
  .then(async () => {
    await import("./data/store");
    const { default: App } = await import("./App");
    createRoot(root).render(<App />);
  });