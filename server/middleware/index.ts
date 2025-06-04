/**
 * Middleware-Exporte
 * 
 * Diese Datei exportiert alle Middleware-Komponenten
 * für eine bessere Organisation und Modularität.
 */

import { Request, Response, NextFunction } from 'express';

// Middleware für einheitliche Inhaltstypen
export const contentTypeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Für API-Routen JSON als Standard-Inhaltstyp setzen
  if (req.path.startsWith('/api')) {
    res.type('application/json');
  }
  
  next();
};

// Middleware für erweiterte Sicherheits-Header
export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  // Wichtige Sicherheits-Header setzen
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'interest-cohort=()'); // FLoC deaktivieren
  
  next();
};

// Re-Export aller Middleware-Module
export * from './auth/auth.middleware';
export * from './error/error.middleware';
export * from './validation/schema.middleware';