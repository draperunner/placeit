import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const element = document.getElementById("root");
if (element) {
  createRoot(element).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
