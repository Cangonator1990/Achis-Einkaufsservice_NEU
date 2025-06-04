import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validierungs-Middleware für Request-Körper
 * Validiert den Request-Körper gegen ein Zod-Schema
 * 
 * @param schema Zod-Schema für die Validierung
 * @returns Express-Middleware
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validiere den Request-Körper gegen das Schema
      const validatedData = schema.parse(req.body);
      // Ersetze den Körper durch die validierten Daten (ggf. mit Transformationen)
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatiere den Zod-Fehler für eine bessere Lesbarkeit
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: {
            message: 'Validierungsfehler',
            status: 400,
            details: formattedErrors
          }
        });
      }
      
      next(error);
    }
  };
};

/**
 * Validierungs-Middleware für URL-Parameter
 * Validiert URL-Parameter gegen ein Zod-Schema
 * 
 * @param schema Zod-Schema für die Validierung
 * @returns Express-Middleware
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validiere die Parameter gegen das Schema
      const validatedData = schema.parse(req.params);
      // Ersetze die Parameter durch die validierten Daten
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: {
            message: 'Validierungsfehler in URL-Parametern',
            status: 400,
            details: formattedErrors
          }
        });
      }
      
      next(error);
    }
  };
};

/**
 * Validierungs-Middleware für Query-Parameter
 * Validiert Query-Parameter gegen ein Zod-Schema
 * 
 * @param schema Zod-Schema für die Validierung
 * @returns Express-Middleware
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validiere die Query-Parameter gegen das Schema
      const validatedData = schema.parse(req.query);
      // Ersetze die Query-Parameter durch die validierten Daten
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: {
            message: 'Validierungsfehler in Query-Parametern',
            status: 400,
            details: formattedErrors
          }
        });
      }
      
      next(error);
    }
  };
};