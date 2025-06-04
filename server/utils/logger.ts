/**
 * Logger
 * 
 * Ein einfaches Logging-Modul für die Anwendung.
 * Bei Bedarf kann dieses später durch ein umfassenderes Logging-System (Winston, Pino, etc.) ersetzt werden.
 */

// Log-Level
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Mindeststufe für die Protokollierung (zur Laufzeit konfigurierbar)
let MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Numerische Werte für die Log-Level (für Vergleiche)
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Farbcodes für die Konsole
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Grün
  warn: '\x1b[33m',  // Gelb
  error: '\x1b[31m', // Rot
  bold: '\x1b[1m'
};

/**
 * Logger-Klasse für einheitliches Logging in der Anwendung
 */
class Logger {
  /**
   * Gibt eine Debug-Nachricht aus
   * 
   * @param message - Die Log-Nachricht
   * @param meta - Zusätzliche Metadaten (optional)
   */
  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }
  
  /**
   * Gibt eine Info-Nachricht aus
   * 
   * @param message - Die Log-Nachricht
   * @param meta - Zusätzliche Metadaten (optional)
   */
  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }
  
  /**
   * Gibt eine Warnungs-Nachricht aus
   * 
   * @param message - Die Log-Nachricht
   * @param meta - Zusätzliche Metadaten (optional)
   */
  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }
  
  /**
   * Gibt eine Fehler-Nachricht aus
   * 
   * @param message - Die Log-Nachricht
   * @param meta - Zusätzliche Metadaten (optional)
   */
  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }
  
  /**
   * Ändert den Mindest-Log-Level zur Laufzeit
   * 
   * @param level - Der neue Mindest-Log-Level
   */
  setMinLevel(level: LogLevel): void {
    MIN_LOG_LEVEL = level;
  }
  
  /**
   * Interne Log-Methode
   * 
   * @param level - Log-Level
   * @param message - Die Log-Nachricht
   * @param meta - Zusätzliche Metadaten (optional)
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    // Prüfen, ob der Log-Level über dem Mindestlevel liegt
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[MIN_LOG_LEVEL]) {
      return;
    }
    
    // Zeitstempel im ISO-Format
    const timestamp = new Date().toISOString();
    
    // Formatierte Log-Nachricht
    const color = COLORS[level];
    const formattedMessage = `${COLORS.bold}[${timestamp}] ${color}${level.toUpperCase()}${COLORS.reset}: ${message}`;
    
    // Konsolenausgabe
    if (level === 'error') {
      console.error(formattedMessage);
      if (meta) {
        if (meta.error && meta.error instanceof Error) {
          // Fehler-Stack ausgeben (nur wenn ein Fehler vorhanden ist)
          console.error(`${COLORS.error}Stack:${COLORS.reset}`, meta.error.stack || meta.error);
          
          // Andere Metadaten ohne den Fehler
          const { error, ...otherMeta } = meta;
          if (Object.keys(otherMeta).length > 0) {
            console.error('Meta:', otherMeta);
          }
        } else {
          console.error('Meta:', meta);
        }
      }
    } else if (level === 'warn') {
      console.warn(formattedMessage);
      if (meta) console.warn('Meta:', meta);
    } else {
      console.log(formattedMessage);
      if (meta) console.log('Meta:', meta);
    }
  }
}

// Singleton-Instanz exportieren
export const logger = new Logger();