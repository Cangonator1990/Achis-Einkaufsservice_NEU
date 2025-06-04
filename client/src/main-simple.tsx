import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Starting application...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
  throw new Error("Root element not found");
}

// Clear loading indicator
rootElement.innerHTML = '';

console.log("Rendering React app...");

try {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("App rendered successfully!");
} catch (error) {
  console.error("Error rendering app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: system-ui;">
      <h2>Fehler beim Laden der Anwendung</h2>
      <p>Bitte laden Sie die Seite neu.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Neu laden
      </button>
      <pre style="margin-top: 20px; text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
        ${error}
      </pre>
    </div>
  `;
}