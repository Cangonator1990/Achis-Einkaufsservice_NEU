import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

/**
 * Konfiguration für die lokale PostgreSQL Datenbank
 * Verwendet die von Replit bereitgestellten Umgebungsvariablen
 */
const POOL_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximale Anzahl von Verbindungen
  idleTimeoutMillis: 20000, // Zeitlimit für inaktive Verbindungen: 20 Sekunden
  connectionTimeoutMillis: 10000, // Zeitlimit für Verbindungsaufbau: 10 Sekunden
  allowExitOnIdle: false, // Beende den Pool nicht, wenn er inaktiv wird
};

// Fehlersichere Pool-Initialisierung
let pool: Pool;
let db: any;
let connectionHealthy = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Funktion zur Initialisierung des Pools mit Fehlerbehandlung
function initializePool() {
  try {
    console.log("Initialisiere Datenbankverbindung...");
    
    // Pool schließen, falls er bereits existiert
    if (pool) {
      try {
        pool.end().catch(err => console.error("Fehler beim Schließen des Pools:", err));
      } catch (err) {
        console.error("Fehler beim Beenden des vorherigen Pools:", err);
      }
    }
    
    // Neuen Pool erstellen
    pool = new Pool(POOL_CONFIG);
    
    // Event-Listener für Fehler im Pool hinzufügen
    pool.on('error', (err) => {
      console.error('Unerwarteter Fehler im Datenbankpool:', err);
      connectionHealthy = false;
      
      // Bei schwerwiegenden Fehlern Pool neu initialisieren
      if (err.message.includes('terminated') || 
          err.message.includes('Connection terminated') ||
          err.message.includes('cannot acquire')) {
        
        // Nach 3 Sekunden versuchen, neu zu verbinden
        setTimeout(() => {
          reconnectAttempts++;
          if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            console.log(`Wiederherstellungsversuch ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
            initializePool();
          } else {
            console.error(`Maximale Anzahl von Wiederverbindungsversuchen (${MAX_RECONNECT_ATTEMPTS}) erreicht`);
            // Führe einen finalen Versuch durch
            reconnectAttempts = 0;
            initializePool();
          }
        }, 3000);
      }
    });
    
    // Drizzle ORM initialisieren
    db = drizzle({ client: pool, schema });
    
    // Sofortiger Healthcheck, um Verbindung zu testen
    pool.query('SELECT NOW()').then(result => {
      if (result.rows?.length > 0) {
        console.log(`Datenbankverbindung erfolgreich initialisiert. Serverzeit: ${result.rows[0].now}`);
        connectionHealthy = true;
        reconnectAttempts = 0;
      }
    }).catch(err => {
      console.error("Initialer DB-Healthcheck fehlgeschlagen:", err);
      connectionHealthy = false;
    });
    
  } catch (error) {
    console.error("Fehler beim Initialisieren der Datenbankverbindung:", error);
    
    // Fallback: Stelle sicher, dass wir einen Pool und db haben, auch wenn sie nicht funktionieren
    pool = new Pool(POOL_CONFIG);
    db = drizzle({ client: pool, schema });
    connectionHealthy = false;
  }
}

// Initialisiere den Pool beim Start
initializePool();

// Globale Fehlerbehandlung für Datenbankfehler
process.on('uncaughtException', (err) => {
  // Allgemeine Datenbankfehler abfangen
  if (err.message && (
      err.message.includes('database') || 
      err.message.includes('pg') || 
      err.message.includes('connection') ||
      err.message.includes('terminated'))) {
    
    console.error('Datenbankfehler abgefangen (SERVER BLEIBT STABIL):', err.message);
    connectionHealthy = false;
    
    // Bei schwerwiegenden Fehlern erneut versuchen
    if (err.message.includes('terminated') || 
        err.message.includes('closed')) {
      setTimeout(() => {
        if (!connectionHealthy) {
          console.log('Versuche, die Datenbankverbindung nach Verbindungsfehler neu herzustellen...');
          initializePool();
        }
      }, 5000);
    }
  } else {
    // Nicht-Datenbankfehler normal protokollieren
    console.error('Unbehandelte Ausnahme (nicht datenbankbezogen):', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
  }
});

// Wrapper-Funktionen, um Fehlerbehandlung zu zentralisieren
async function executeQuery(queryFn: Function, ...args: any[]) {
  try {
    return await queryFn(...args);
  } catch (error: any) {
    // Bei bestimmten Fehlertypen Pool neu initialisieren
    if (error.message?.includes('Connection terminated') || 
        error.message?.includes('cannot acquire a connection') ||
        error.message?.includes('terminated by administrator command')) {
      console.error('Datenbankverbindung unterbrochen. Versuche Neuinitialisierung...');
      connectionHealthy = false;
      setTimeout(() => initializePool(), 1000);
    }
    throw error; // Fehler weiterleiten
  }
}

// Exportiere den Pool, die Drizzle-DB, Query-Wrapper, Verbindungsstatus und die Initialisierungsfunktion
export { pool, db, executeQuery, connectionHealthy, initializePool };

// Periodische Healthchecks für die Datenbankverbindung
setInterval(async () => {
  if (!pool) {
    console.log('Pool nicht initialisiert. Initialisiere neu...');
    initializePool();
    return;
  }
  
  try {
    // Führe eine einfache Abfrage aus, um die Verbindung zu testen
    const result = await pool.query('SELECT 1 as connected');
    
    if (result.rows?.[0]?.connected === 1) {
      // Verbindung funktioniert
      if (!connectionHealthy) {
        console.log('Datenbankverbindung wiederhergestellt.');
        connectionHealthy = true;
      }
    } else {
      throw new Error('Ungültige Antwort vom Datenbankserver');
    }
  } catch (error) {
    console.error("Datenbank-Healthcheck fehlgeschlagen:", error);
    connectionHealthy = false;
    
    // Pool bei Verbindungsproblemen neu initialisieren
    setTimeout(() => {
      if (!connectionHealthy) {
        console.log('Verbindung tot. Initialisiere nach Healthcheck-Fehler neu...');
        initializePool();
      }
    }, 2000);
  }
}, 30000); // Überprüfung alle 30 Sekunden
