import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../../utils/errors';

/**
 * Middleware zur Validierung des Request-Bodys mit einem Zod-Schema
 * 
 * @param schema Das Zod-Schema zur Validierung
 * @returns Express-Middleware-Funktion
 */
export const validateBody = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Request-Body mit Zod-Schema validieren
      const validData = schema.parse(req.body);
      
      // Validierten Body zurück in den Request schreiben
      req.body = validData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Validierungsfehler an ErrorHandler weitergeben
        next(new ValidationError('Validierungsfehler im Request-Body', error.errors));
      } else {
        // Unerwarteten Fehler weitergeben
        next(error);
      }
    }
  };
};

/**
 * Middleware zur Validierung von URL-Parametern mit einem Zod-Schema
 * 
 * @param schema Das Zod-Schema zur Validierung
 * @returns Express-Middleware-Funktion
 */
export const validateParams = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // URL-Parameter mit Zod-Schema validieren
      const validParams = schema.parse(req.params);
      
      // Validierte Parameter zurück in den Request schreiben
      req.params = validParams;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Validierungsfehler an ErrorHandler weitergeben
        next(new ValidationError('Validierungsfehler in URL-Parametern', error.errors));
      } else {
        // Unerwarteten Fehler weitergeben
        next(error);
      }
    }
  };
};

/**
 * Middleware zur Validierung von Query-Parametern mit einem Zod-Schema
 * 
 * @param schema Das Zod-Schema zur Validierung 
 * @returns Express-Middleware-Funktion
 */
export const validateQuery = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Query-Parameter mit Zod-Schema validieren
      const validQuery = schema.parse(req.query);
      
      // Validierte Query-Parameter zurück in den Request schreiben
      req.query = validQuery;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Validierungsfehler an ErrorHandler weitergeben
        next(new ValidationError('Validierungsfehler in Query-Parametern', error.errors));
      } else {
        // Unerwarteten Fehler weitergeben
        next(error);
      }
    }
  };
};