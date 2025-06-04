/**
 * Health-Check-Routen
 * 
 * Diese Routen dienen zur Überprüfung des Systemzustands und der Verbindung zur Datenbank.
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Registriert alle Health-Check-Routen
 * 
 * @param router - Express-Router-Instanz
 */
export function registerHealthRoutes(router: Router): void {
  // Einfacher Health-Check (ohne Datenbankverbindung)
  router.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      source: 'api-router'
    });
  });
  
  // Ausführlicher Health-Check mit Datenbankverbindung
  router.get('/health/detailed', async (_req, res) => {
    try {
      // Datenbankverbindung prüfen
      const dbStartTime = Date.now();
      const dbResult = await db.execute(sql`SELECT 1 as connection_test`);
      const dbDuration = Date.now() - dbStartTime;
      
      const dbConnected = dbResult && dbResult.rows && dbResult.rows.length > 0;
      
      // Systeminfo sammeln
      const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
      const memoryInfo = {
        rss: Math.round(rss / 1024 / 1024),
        heapTotal: Math.round(heapTotal / 1024 / 1024),
        heapUsed: Math.round(heapUsed / 1024 / 1024),
        external: Math.round(external / 1024 / 1024)
      };
      
      // Antwort senden
      res.json({
        status: dbConnected ? 'UP' : 'PARTIAL',
        timestamp: new Date().toISOString(),
        components: {
          api: {
            status: 'UP',
            uptime: Math.round(process.uptime())
          },
          database: {
            status: dbConnected ? 'UP' : 'DOWN',
            responseTime: dbDuration
          }
        },
        system: {
          memory: memoryInfo,
          node: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      logger.error('Health-Check-Fehler', { error });
      
      res.status(500).json({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}