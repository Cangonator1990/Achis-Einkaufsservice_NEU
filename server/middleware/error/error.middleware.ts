/**
 * Fehlerbehandlung-Middleware
 * 
 * Middleware zur zentralen Fehlerbehandlung in der Anwendung.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, ApiError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Middleware für die zentrale Fehlerbehandlung
 * Fängt alle Fehler ab und sendet passende Fehlerantworten
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Wenn die Antwort bereits gesendet wurde, zum nächsten Middleware übergehen
  if (res.headersSent) {
    return next(err);
  }
  
  // Standard-Fehlerantwort
  let statusCode = 500;
  let errorMessage = 'Ein interner Serverfehler ist aufgetreten.';
  let errorDetails: any = null;
  
  // Fehler nach Typ verarbeiten
  if (err instanceof BaseError) {
    // Benutzerdefinierte Fehler
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorDetails = err.details;
    
    // Je nach Fehlertyp entsprechend protokollieren
    if (statusCode >= 500) {
      logger.error(`[${statusCode}] ${req.method} ${req.path}: ${errorMessage}`, {
        error: err,
        user: req.user ? (req.user as any).id : 'anonymous'
      });
    } else if (statusCode >= 400) {
      logger.warn(`[${statusCode}] ${req.method} ${req.path}: ${errorMessage}`, {
        user: req.user ? (req.user as any).id : 'anonymous'
      });
    }
  } else if (err instanceof ApiError || (err as any).statusCode) {
    // Express oder andere API-Fehler
    statusCode = (err as any).statusCode || 500;
    errorMessage = err.message;
    
    logger.error(`[${statusCode}] ${req.method} ${req.path}: ${errorMessage}`, {
      error: err,
      user: req.user ? (req.user as any).id : 'anonymous'
    });
  } else {
    // Unbekannte Fehler vollständig protokollieren
    logger.error(`Unerwarteter Fehler bei ${req.method} ${req.path}`, {
      error: err,
      user: req.user ? (req.user as any).id : 'anonymous',
      stack: err.stack
    });
  }
  
  // JSON-Fehlerantwort senden
  res.status(statusCode).json({
    error: errorMessage,
    status: statusCode,
    details: errorDetails
  });
}