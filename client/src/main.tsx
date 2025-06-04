import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

// Debug-Modus mit erweitertem Logging
const DEBUG = true;
console.log("[DEBUG-INIT] Anwendung startet...");

// Einfaches Logging mit Zeitstempel
function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString().substr(11, 8)}]`, ...args);
  }
}

// Einfache API-Überprüfung - keine auto-reloads
async function checkApiHealth() {
  try {
    logDebug("Prüfe API-Verfügbarkeit...");
    
    // Einfachere Version ohne dynamic import (vermeidet mögliche Race-Conditions)
    // Die direkte fetch-Anfrage beibehalten, um nicht vom ApiService abhängig zu sein
    const response = await fetch('/api/v2/health', { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      logDebug("API v2 ist verfügbar:", data.status);
      return true;
    } else {
      logDebug("API v2 nicht verfügbar:", response.status);
      
      // Fallback: Versuche den alten Endpunkt
      logDebug("Versuche Fallback auf alten API-Endpunkt...");
      const legacyResponse = await fetch('/api/health', { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      
      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        logDebug("Legacy-API ist verfügbar:", legacyData.status);
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logDebug("API-Prüfung fehlgeschlagen:", error);
    return false;
  }
}

// App rendern mit erweiterter Fehlerbehandlung
async function renderApp() {
  try {
    console.log("[DEBUG-RENDER] Starte renderApp()...");
    
    // API-Health-Check mit verbessertem Fehler-Reporting
    try {
      await checkApiHealth();
      console.log("[DEBUG-RENDER] API-Health-Check erfolgreich");
    } catch (healthError) {
      console.error("[DEBUG-RENDER] API-Health-Check fehlgeschlagen:", healthError);
      // Trotz Fehler fortfahren
    }
    
    logDebug("Initialisiere Anwendung");
    
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error("[DEBUG-RENDER] Root-Element nicht gefunden");
      return;
    }
    
    console.log("[DEBUG-RENDER] Root-Element gefunden, entferne Lade-Indikator...");
    
    // Lade-Indikator entfernen
    rootElement.innerHTML = '';
    
    try {
      console.log("[DEBUG-RENDER] Starte Rendering der Hauptanwendung...");
      // App rendern
      createRoot(rootElement).render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
      
      logDebug("App erfolgreich gerendert");
      console.log("[DEBUG-RENDER] Rendering abgeschlossen!");
    } catch (renderError) {
      console.error("[DEBUG-RENDER] Fehler beim React-Rendering:", renderError);
      
      // Fallback für kritische Rendering-Fehler
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Ein Fehler ist aufgetreten</h2>
          <p>Die Anwendung konnte nicht geladen werden.</p>
          <button onclick="window.location.reload()">Neu laden</button>
          <pre style="margin-top: 15px; text-align: left;">${renderError}</pre>
        </div>
      `;
    }
  } catch (error) {
    console.error("[DEBUG-RENDER] Kritischer Fehler in renderApp():", error);
  }
}

// App starten
renderApp();