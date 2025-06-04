/**
 * Authentifizierungs-Middleware
 * 
 * Stellt Middleware-Funktionen für Authentifizierung und Autorisierung bereit.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../../utils/errors';

/**
 * Middleware zur Überprüfung der Benutzerauthentifizierung
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    // Benutzer ist angemeldet
    return next();
  }
  
  // Keine Authentifizierung gefunden
  return next(new AuthError('Sie müssen angemeldet sein, um auf diese Ressource zuzugreifen.', 401));
}

/**
 * Middleware zur Überprüfung der Admin-Rechte
 * Setzt voraus, dass isAuthenticated vorher ausgeführt wurde
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    // Keine Authentifizierung
    return next(new AuthError('Sie müssen angemeldet sein, um auf diese Ressource zuzugreifen.', 401));
  }
  
  // Prüfen, ob der Benutzer Admin-Rechte hat
  const user = req.user as any;
  if (user && user.role === 'admin') {
    return next();
  }
  
  // Benutzer hat keine Admin-Rechte
  return next(new AuthError('Sie haben keine Berechtigung, um auf diese Ressource zuzugreifen.', 403));
}

/**
 * Middleware zur Überprüfung der Ressourcen-Eigentümerschaft
 * 
 * @param paramName - Name des URL-Parameters, der die Ressourcen-ID enthält
 * @param userIdGetter - Funktion zum Ermitteln der Benutzer-ID aus der Ressource
 */
export function isResourceOwner(
  paramName: string,
  userIdGetter: (req: Request) => Promise<number | undefined>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      // Keine Authentifizierung
      return next(new AuthError('Sie müssen angemeldet sein, um auf diese Ressource zuzugreifen.', 401));
    }
    
    // Ressourcen-ID und Benutzer-ID ermitteln
    const resourceId = parseInt(req.params[paramName], 10);
    if (isNaN(resourceId)) {
      return next(new Error(`Ungültige ${paramName} ID: ${req.params[paramName]}`));
    }
    
    try {
      // Benutzer-ID der Ressource abrufen
      const resourceUserId = await userIdGetter(req);
      
      // Ressource nicht gefunden
      if (resourceUserId === undefined) {
        return next(new Error(`Ressource mit ID ${resourceId} nicht gefunden.`));
      }
      
      // Aktueller Benutzer
      const user = req.user as any;
      
      // Admin darf alles
      if (user.role === 'admin') {
        return next();
      }
      
      // Prüfen, ob der angemeldete Benutzer der Eigentümer ist
      if (user.id === resourceUserId) {
        return next();
      }
      
      // Benutzer ist nicht der Eigentümer
      return next(new AuthError('Sie haben keine Berechtigung, um auf diese Ressource zuzugreifen.', 403));
    } catch (error) {
      return next(error);
    }
  };
}