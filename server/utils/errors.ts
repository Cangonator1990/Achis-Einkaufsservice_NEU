/**
 * Fehlerklassen
 * 
 * Diese Datei definiert alle Fehlerklassen für die Anwendung.
 * Durch die Verwendung von eigenen Fehlerklassen können wir:
 * 1. Fehler besser typisieren
 * 2. Fehlermeldungen standardisieren
 * 3. Fehlerbehandlung in einer zentralen Middleware umsetzen
 */

/**
 * Basis-Fehlerklasse für alle API-Fehler
 */
export class BaseError extends Error {
  statusCode: number;
  details: any;
  
  constructor(message: string, statusCode = 500, details: any = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

/**
 * Standard-API-Fehler
 */
export class ApiError extends BaseError {
  constructor(message: string, statusCode = 500, details: any = null) {
    super(message, statusCode, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Authentifizierungsfehler
 */
export class AuthError extends BaseError {
  constructor(message: string, statusCode = 401, details: any = null) {
    super(message, statusCode, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Validierungsfehler
 */
export class ValidationError extends BaseError {
  constructor(message: string, details: any = null) {
    super(message, 400, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Ressource nicht gefunden
 */
export class NotFoundError extends BaseError {
  constructor(message: string, details: any = null) {
    super(message, 404, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Konflikt mit bestehendem Datensatz
 */
export class ConflictError extends BaseError {
  constructor(message: string, details: any = null) {
    super(message, 409, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Business-Logik-Fehler
 */
export class BusinessError extends BaseError {
  constructor(message: string, details: any = null) {
    super(message, 422, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

/**
 * Datenbank-Fehler
 */
export class DatabaseError extends BaseError {
  constructor(message: string, details: any = null) {
    super(message, 500, details);
    
    // Für korrektes Error-Handling in TypeScript
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}