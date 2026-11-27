import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initStore } from "./lib/store";
import "./index.css";

initStore();
createRoot(document.getElementById("root")!).render(<App />);
