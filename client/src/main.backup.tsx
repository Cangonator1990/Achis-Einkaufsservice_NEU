import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Erweiterte Fehlerbehandlung für stabilere Frontend-Initialisierung
try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root-Element nicht gefunden! Erstelle Fallback-Element...");
    const fallbackRoot = document.createElement("div");
    fallbackRoot.id = "root";
    document.body.appendChild(fallbackRoot);
    
    createRoot(fallbackRoot).render(<App />);
  } else {
    console.log("Root-Element gefunden, starte App normal...");
    createRoot(rootElement).render(<App />);
  }
  
  console.log("Anwendung erfolgreich initialisiert!");
} catch (error) {
  console.error("Kritischer Fehler beim Initialisieren der Anwendung:", error);
  
  // Mindestfeedback für Benutzer bei kritischen Fehlern
  const errorDiv = document.createElement("div");
  errorDiv.innerHTML = `
    <div style="font-family: sans-serif; padding: 20px; text-align: center;">
      <h2>Es ist ein Fehler aufgetreten</h2>
      <p>Die Anwendung konnte nicht geladen werden. Bitte laden Sie die Seite neu.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px;">Seite neu laden</button>
      <p style="color: gray; font-size: 12px; margin-top: 20px;">Fehler: ${error instanceof Error ? error.message : String(error)}</p>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
}