import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/atcoder.css";

import AtCoderProblemApp from "./apps/AtCoderProblemApp";

const root = createRoot(document.getElementById("app")!);
root.render(<AtCoderProblemApp />);
