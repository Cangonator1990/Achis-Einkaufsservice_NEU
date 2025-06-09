/**
 * Zentrale Routenregistrierung
 */
import { Router, Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/error/error.middleware';
import { NotFoundError } from '../utils/errors';
import adminRoutes from './admin.routes';


// Standardrouten importieren
import { registerHealthRoutes } from './health.routes';

/**
 * Middleware für 404-Fehler (nicht gefundene Routen)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route nicht gefunden: ${req.method} ${req.path}`));
};

/**
 * Registriert alle API-Routen
 * 
 * @param router - Express-Router-Instanz
 */
export function registerApiRoutes(router: Router): void {
  // Health-Check-Routen
  registerHealthRoutes(router);
  
  // Admin-Routen
  router.use('/api/v2/admin', adminRoutes);
  
  // Weitere Routengruppen hier registrieren
  // z.B. registerAuthRoutes(router);
  
  // 404-Handler für nicht gefundene API-Routen
  router.use('*', notFoundHandler);
  
  // Zentrale Fehlerbehandlung für API-Routen
  router.use(errorHandler);
}

/**
 * Erstellt und konfiguriert einen API-Router
 * 
 * @returns Konfigurierter Express-Router
 */
export function createApiRouter(): Router {
  const router = Router();
  
  // API-Routen registrieren
  registerApiRoutes(router);
  
  return router;
}