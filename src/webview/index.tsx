import { createRoot } from "react-dom/client";
import App from "./apps/App";
import React from "react";
import "./index.css";

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
