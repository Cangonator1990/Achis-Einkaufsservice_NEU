/**
 * Datenbank-Konfigurationsmodul
 * 
 * Dieses Modul enthält die Konfiguration für die Datenbankverbindung.
 * Es verwendet einen fest definierten Connection-String für die Verbindung
 * und bietet Funktionen für den Verbindungsaufbau und -abbau.
 */

/**
 * Fest definierter PostgreSQL-Connection-String
 * Diese Konfiguration wird direkt für die Produktionsumgebung verwendet
 */
// Für die Entwicklung auf Replit wird die DATABASE_URL-Umgebungsvariable verwendet
// Für die Produktion wird dieser feste Connection-String verwendet, wenn keine Umgebungsvariable verfügbar ist
export const DB_CONNECTION_STRING = 'postgresql://achis_user:Jaguar2222@localhost:5432/einkaufsservice';

/**
 * Schnittstelle für Datenbank-Konfigurationsoptionen
 */
export interface DatabaseConfig {
  // Die URL der Datenbankverbindung
  connectionString: string;
  
  // Maximale Anzahl an Verbindungen im Pool
  maxConnections: number;
  
  // Zeit in Millisekunden, nach der eine inaktive Verbindung freigegeben wird
  idleTimeoutMillis: number;
  
  // Zeit in Millisekunden, nach der eine Anfrage als Timeout gilt
  connectionTimeoutMillis: number;
  
  // Zeit in Millisekunden, für die eine Client-Verbindung aktiv bleibt
  maxLifetimeMillis: number;
  
  // SSL-Verbindung erzwingen
  ssl: boolean | { rejectUnauthorized: boolean };
}

/**
 * Standard-Datenbankkonfiguration
 * Verwendet den fest definierten Connection-String mit der Möglichkeit, 
 * durch Umgebungsvariablen überschrieben zu werden (für Entwicklungsumgebungen)
 */
export const defaultDatabaseConfig: DatabaseConfig = {
  // Umgebungsvariable wird priorisiert, fester Connection-String als Fallback für die Produktion
  connectionString: process.env.DATABASE_URL || DB_CONNECTION_STRING,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  maxLifetimeMillis: parseInt(process.env.DB_MAX_LIFETIME || '3600000', 10),
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false
};

/**
 * Prüft, ob die Datenbankkonfiguration gültig ist
 * 
 * @param config Datenbankkonfiguration
 * @returns True, wenn die Konfiguration gültig ist, andernfalls False
 */
export function validateDatabaseConfig(config: DatabaseConfig): boolean {
  if (!config.connectionString) {
    console.error('Fehler: Keine Datenbankverbindung definiert');
    return false;
  }
  
  return true;
}

/**
 * Gibt die aktuelle Datenbankkonfiguration zurück
 * 
 * @returns Datenbankkonfiguration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return defaultDatabaseConfig;
}