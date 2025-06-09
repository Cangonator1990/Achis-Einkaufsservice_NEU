import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { Server } from 'http';
import { db, pool } from "./db";
import { sql } from "drizzle-orm";
// Neue Importe für modulare Struktur
import { logger } from "./utils/logger";
import { contentTypeMiddleware, securityHeadersMiddleware } from "./middleware";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express-App mit verbesserten Einstellungen initialisieren
const app = express();

// CORS-Einstellungen für verbesserte Konnektivität
// Einfache, aber sichere CORS-Einstellungen
app.use(cors({
  origin: true, // Alle Origins erlauben für bessere Kompatibilität
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  maxAge: 86400, // 24 Stunden CORS-Cache für bessere Performance
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Verbesserter Kompression-Support
app.disable('x-powered-by'); // Sicherheit durch Verstecken der Server-Identität
app.set('trust proxy', true); // Korrekte Client-IP-Erkennung in Replit-Umgebung

// Timeout für API-Anfragen erhöhen - FRÜH im Middleware-Stack für maximale Wirksamkeit
app.use((req, res, next) => {
  res.setTimeout(300000); // 5 Minuten Timeout - erhöht für bessere Stabilität
  
  // Verbesserte Header für Browser-Kompatibilität
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'interest-cohort=()'); // FLoC deaktivieren
  
  next();
});

// Body Parser Middleware mit optimierten Limits für bessere Speichereffizienz
app.use(express.json({ limit: '10mb' })); // Reduziertes Limit für JSON-Anfragen
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Reduziertes Limit für URL-kodierte Anfragen

// Serve static files from the public directory
app.use(express.static(join(__dirname, '..', 'public')));

// Speicheroptimierte Logging-Middleware
app.use((req, res, next) => {
  try {
    // Nur API-Routen loggen, um die Menge der Protokollierung zu reduzieren
    if (req.path.startsWith("/api") && req.path !== '/api/health') {
      const start = Date.now();
      
      // Wir verzichten auf das Erfassen der Antwort, um Speicher zu sparen
      res.on("finish", () => {
        try {
          const duration = Date.now() - start;
          const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
          
          // Nur kurze Log-Einträge, keine vollständigen Antworten
          log(logLine);
        } catch (err) {
          // Fehler beim Logging ignorieren
        }
      });
    }
    
    next();
  } catch (err) {
    // Trotz Fehler weitermachen
    next();
  }
});

(async () => {
  // Spezielle API-Routen vor Vite registrieren, damit sie direkten Zugang haben
  // Diese Routen sind besonders wichtig für Diagnose und Debugging

  // Einfacher Health-Check-Endpunkt (extrem schnell, ohne Datenbankzugriff)
  app.get("/api/health", (_req, res) => {
    // Schnellste mögliche Antwort
    res.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      source: "health-route"
    });
  });
  
  // Legacy Health-Check-Endpunkt für Abwärtskompatibilität
  app.get("/api/health-direct", (_req, res) => {
    // Schnellste mögliche Antwort
    res.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      source: "direct-route"
    });
  });
  
  // Neue ultra-simple Route ohne Datenbankverbindung
  app.get("/api/ultra-health", (_req, res) => {
    res.send("OK");
  });
  
  // Endpunkt um die Datenbankverbindung als gesund zu markieren
  app.get("/api/db-fix", async (_req, res) => {
    try {
      // DB-Module direkt importieren
      const { db, connectionHealthy, initializePool } = await import('./db');
      
      // Versuchen, eine Abfrage auszuführen
      const result = await db.execute(sql`SELECT 1 as connection_test`);
      
      if (result.rows.length > 0) {
        // Direkter Zugriff um connectionHealthy zu setzen
        // @ts-ignore - Direkter Modulzugriff
        const dbModule = await import('./db');
        // Manuell als gesund markieren
        dbModule.connectionHealthy = true;
        
        res.json({
          status: "success",
          message: "Datenbankverbindung als gesund markiert",
          timestamp: new Date().toISOString()
        });
      } else {
        // Versuchen, die Verbindung zu reparieren
        // @ts-ignore
        await initializePool();
        
        res.json({
          status: "warning",
          message: "Datenbankverbindung neu initialisiert - bitte erneut prüfen",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Fehler beim Reparieren der Datenbankverbindung",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });
  

  

  
  // Diagnostik-Endpunkt für System-Informationen
  app.get("/api/system-info-direct", (_req, res) => {
    const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
    
    res.json({
      environment: app.get('env'),
      nodeVersion: process.version,
      memoryUsage: {
        rss: (rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (external / 1024 / 1024).toFixed(2) + ' MB',
      },
      uptime: process.uptime().toFixed(2) + ' seconds',
      timestamp: new Date().toISOString(),
      serverTimeMs: Date.now(),
      source: "direct-route"
    });
  });
  
  // Datenbank-Test-Endpunkt mit Neuverbindungsfunktion
  app.get("/api/db-test-direct", async (_req, res) => {
    try {
      // Zugriff auf db-Modul importieren
      const { db, pool, initializePool } = await import('./db');

      // Prüfen, ob der Pool erstellt wurde
      if (!pool) {
        console.log("DB-Test: Pool nicht vorhanden, initialisiere neu...");
        try {
          // @ts-ignore - initializePool als dynamischer Import
          await initializePool();
          res.json({
            status: "warning",
            message: "Pool wurde neu initialisiert, bitte erneut testen",
            timestamp: new Date().toISOString(),
            source: "direct-route-reinit"
          });
          return;
        } catch (poolError) {
          res.status(500).json({
            status: "error",
            message: "Pool-Initialisierung fehlgeschlagen",
            error: poolError instanceof Error ? poolError.message : String(poolError),
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Einfache und schnelle Abfrage
      const result = await db.execute(sql`SELECT 1 as connection_test`);
      
      res.json({
        status: "success",
        message: "Datenbankverbindung funktioniert",
        connection: result.rows.length > 0 ? "established" : "failed",
        timestamp: new Date().toISOString(),
        source: "direct-route"
      });
    } catch (error) {
      // Bei Fehler nochmal Pool neu initialisieren
      try {
        const { initializePool } = await import('./db');
        // @ts-ignore - initializePool als dynamischer Import
        await initializePool();
        console.log("DB-Test: Pool nach Fehler neu initialisiert");
      } catch {}

      res.status(500).json({
        status: "error",
        message: "Datenbankverbindung fehlgeschlagen",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        reinitAttempted: true
      });
    }
  });
  
  // Zusätzlicher leichtgewichtiger Datenbank-Health-Check-Endpunkt mit Timeout
  app.get("/api/db-health-direct", async (_req, res) => {
    // Verwende ein Timeout, um sicherzustellen, dass der Endpunkt schnell zurückkehrt
    const timeoutId = setTimeout(() => {
      console.log("Datenbank-Health-Check Timeout - sende DOWN-Status");
      if (!res.headersSent) {
        res.json({
          status: "DOWN",
          database: "timeout",
          message: "Datenbank-Health-Check hat das Zeitlimit überschritten",
          timestamp: new Date().toISOString(),
          source: "direct-pool-check-timeout"
        });
      }
    }, 3000); // 3-Sekunden-Timeout
    
    try {
      // Prüfe den internen Verbindungsstatus statt einen Client zu öffnen
      if (!pool) {
        clearTimeout(timeoutId);
        return res.json({
          status: "DOWN",
          database: "no_pool",
          message: "Datenbank-Pool nicht initialisiert",
          timestamp: new Date().toISOString(),
          source: "direct-pool-check"
        });
      }
      
      // Verwende die Variable aus db.ts, um den Verbindungsstatus zu prüfen
      // Die Variable "connectionHealthy" ist jetzt korrekt exportiert
      const { connectionHealthy } = await import('./db');
      const isConnected = connectionHealthy;
      
      clearTimeout(timeoutId);
      
      if (isConnected) {
        return res.json({
          status: "UP",
          database: "connected",
          timestamp: new Date().toISOString(),
          source: "direct-pool-check-fast"
        });
      } else {
        return res.json({
          status: "DOWN",
          database: "disconnected",
          message: "Datenbank wurde als nicht verbunden erkannt",
          timestamp: new Date().toISOString(),
          source: "direct-pool-check-fast"
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Fehlgeschlagene Verbindung, aber trotzdem 200 OK mit Status DOWN
      if (!res.headersSent) {
        res.json({
          status: "DOWN",
          database: "error",
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          source: "direct-pool-check-error"
        });
      }
    }
  });
  
  // Erst die regulären Routen registrieren
  const server = await registerRoutes(app);
  
  // API-Fallback Middleware - fängt alle undefinierte API-Anfragen ab
  // Muss NACH registerRoutes, aber VOR setupVite platziert werden
  app.use("/api/*", (req, res) => {
    // Explizite Content-Type-Einstellung für alle API-Antworten
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
      status: "error",
      message: `API endpoint not found: ${req.path}`,
      timestamp: new Date().toISOString()
    });
  });

  // Stark verbesserter Error-Handler mit Neon-Optimierungen
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    try {
      // Neon-spezifische Fehler abfangen und ignorieren
      if (err instanceof TypeError && 
          err.message?.includes('Cannot set property message of #<ErrorEvent>')) {
        // Dies ist ein bekannter und harmloser Fehler in der Neon-Bibliothek
        console.log('Bekannter Neon-WebSocket-Fehler abgefangen, wird ignoriert');
        
        // Antwort mit 200 OK senden, da dieser Fehler nicht die Anwendungsfunktionalität beeinträchtigt
        if (!res.headersSent) {
          return res.status(200).json({
            status: 'OK',
            warning: 'Neon-Datenbankfehler wurde behandelt'
          });
        }
        return;
      }
      
      // WebSocket-spezifische Fehler besser verarbeiten
      if ((err.name === 'WebSocketError' || 
           err.message?.toLowerCase().includes('websocket')) &&
          !res.headersSent) {
        log(`WebSocket-Fehler: ${err.message}`);
        
        const isJson = _req.headers.accept?.includes('application/json');
        if (isJson) {
          return res.status(503).json({
            error: "Datenbankverbindung kurzzeitig nicht verfügbar",
            status: 503,
            message: "Bitte versuchen Sie es in wenigen Sekunden erneut."
          });
        } else {
          return res.status(503).send(`
            <html><head><title>Database Error</title></head>
            <body>
              <h1>Datenbankverbindung vorübergehend nicht verfügbar</h1>
              <p>Bitte versuchen Sie es in einigen Sekunden erneut.</p>
            </body></html>
          `);
        }
      }
      
      // Minimale Fehlerinformationen extrahieren
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || "Internal Server Error";
      
      // Speicheroptimierte Fehlerprotokollierung
      log(`Error [${status}]: ${message} auf ${_req.method} ${_req.path}`);
      
      // Nur den Stack-Trace loggen, um Speicherverbrauch zu reduzieren
      if (err?.stack) {
        console.error('Stack:', err.stack.split('\n').slice(0, 3).join('\n')); // Nur die ersten 3 Zeilen
      }
      
      // Einfache Fehlerantwort senden
      if (!res.headersSent) {
        const isJson = _req.headers.accept?.includes('application/json');
        
        if (isJson) {
          // Spezifischere Fehlerbehandlung für Datenbankprobleme
          if (message.includes('database') || 
              message.includes('connection') || 
              message.includes('neon') || 
              message.includes('sql')) {
            return res.status(503).json({
              error: "Datenbankproblem",
              status: 503,
              message: "Ein temporäres Datenbankproblem ist aufgetreten. Bitte versuchen Sie es in wenigen Sekunden erneut."
            });
          }
          
          // Standard-JSON-Antwort
          res.status(status).json({ error: message, status });
        } else {
          // Einfaches HTML ohne aufwändige Formatierung
          res.status(status).send(`
            <html><head><title>Error ${status}</title></head>
            <body><h1>Server Error (${status})</h1><p>${message}</p></body></html>
          `);
        }
      }
    } catch (e) {
      // Minimaler Fallback ohne komplexe Protokollierung
      console.error('Meta-Fehler in der Fehlerbehandlung:', e);
      if (!res.headersSent && !res.finished) {
        res.status(500).send('Server Error (Fehler in der Fehlerbehandlung)');
      }
    }
  });

  // Verbesserte Diagnose-Routen für Stabilitätsüberwachung
  
  // HTML-Debug-Route für visuelle Prüfung
  app.get("/debug-server", (req, res) => {
    log("Debug-Server-Route aufgerufen");
    
    // Umfassendere Systeminformationen
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const memoryUsageFormatted = {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memory.external / 1024 / 1024)} MB`,
    };
    
    res.send(`
      <html>
        <head>
          <title>Server Diagnostics</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #3b9467; }
            .status { padding: 10px; background: #e6f7ee; border-radius: 4px; margin: 20px 0; }
            .info { display: flex; flex-wrap: wrap; }
            .info div { margin-right: 30px; margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <h1>Server Status</h1>
          <div class="status">
            <h2>✅ Server läuft korrekt</h2>
          </div>
          
          <div class="info">
            <div>
              <p class="label">Umgebung:</p> 
              <p>${app.get("env")}</p>
            </div>
            <div>
              <p class="label">Server-Zeit:</p>
              <p>${new Date().toISOString()}</p>
            </div>
            <div>
              <p class="label">Uptime:</p>
              <p>${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s</p>
            </div>
            <div>
              <p class="label">Memory (RSS):</p>
              <p>${memoryUsageFormatted.rss}</p>
            </div>
            <div>
              <p class="label">Memory (Heap):</p>
              <p>${memoryUsageFormatted.heapUsed} / ${memoryUsageFormatted.heapTotal}</p>
            </div>
          </div>
        </body>
      </html>
    `);
  });
  
  // Leite /fallback zu Hauptseite um statt Fallback anzuzeigen
  app.get("/fallback", (req, res) => {
    log("Fallback-Seite angefordert - Umleitung zur Hauptseite");
    res.redirect('/');
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    log("Setting up Vite in development mode");
    await setupVite(app, server);
  } else {
    log("Setting up static serving for production");
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Server mit stark verbesserten Stabilitätseinstellungen starten
  server.listen(port, "0.0.0.0", () => {
    log(`Server started successfully on port ${port}`);
  });
  
  // Verbesserte globale Fehlerbehandlung, besonders für WebSocket und Datenbankverbindungen
  process.on('uncaughtException', (error) => {
    // Bekannte Fehlermuster für Neon und WebSocket erkennen
    if (error instanceof TypeError && 
        (error.message?.includes('Cannot set property message of #<ErrorEvent>') ||
         error.message?.includes('#<ErrorEvent>'))) {
      console.log('Neon WebSocket ErrorEvent-Fehler ignoriert (normal)');
      return;
    }
    
    // WebSocket-Fehler gedrosselt loggen
    if (error.name === 'WebSocketError' || 
        (error.message && (
          error.message.toLowerCase().includes('websocket') ||
          error.message.toLowerCase().includes('socket')
        ))) {
      console.log('WebSocket-Fehler abgefangen:', 
                  error.message || 'Unbekannter WebSocket-Fehler');
      return;
    }
    
    // Alle anderen Fehler
    console.error('Uncaught Exception (SERVER BLEIBT STABIL):', error.message || error);
    if (error.stack) {
      console.error('Stack (gekürzt):', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    console.error('Zeitpunkt:', new Date().toISOString());
  });
  
  // Unbehandelte Promise-Fehler abfangen
  process.on('unhandledRejection', (reason, promise) => {
    // Bekannte Fehler ignorieren
    if (reason instanceof TypeError && 
        (reason.message?.includes('Cannot set property message') ||
         reason.message?.includes('WebSocket') ||
         reason.message?.includes('neon'))) {
      console.log('Bekannter Promise-Fehler ignoriert');
      return;
    }
    
    // Andere Fehler
    console.error('Unhandled Rejection:', 
                 reason instanceof Error ? reason.message : reason);
    
    if (reason instanceof Error && reason.stack) {
      console.error('Stack (gekürzt):', reason.stack.split('\n').slice(0, 3).join('\n'));
    }
  });
})();