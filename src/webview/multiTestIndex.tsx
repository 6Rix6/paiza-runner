import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";

import MultiTestApp from "./apps/MultiTestApp";

const root = createRoot(document.getElementById("app")!);
root.render(<MultiTestApp />);
