import multer, { Options, StorageEngine } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Konfiguration für Datei-Uploads
 */
export interface UploadConfig {
  // Basis-Pfad für alle Uploads
  basePath: string;
  
  // Maximale Dateigröße in Bytes
  maxSize: number;
  
  // Erlaubte Dateitypen
  allowedTypes: string[];
  
  // Multer Storage Engine
  storage: StorageEngine;
  
  // Multer Optionen
  options: Options;
}

/**
 * Stellt sicher, dass Verzeichnisse existieren
 * 
 * @param directory Pfad zum Verzeichnis
 */
function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * Generiert einen eindeutigen Dateinamen
 * 
 * @param file Die hochgeladene Datei
 * @returns Eindeutiger Dateiname
 */
function generateUniqueFilename(file: Express.Multer.File): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const fileExtension = path.extname(file.originalname).toLowerCase();
  return `${timestamp}-${randomString}${fileExtension}`;
}

/**
 * Standard-Konfiguration für Produkt-Bild-Uploads
 */
export const productImageUploadConfig: UploadConfig = {
  basePath: path.join(process.cwd(), 'public', 'uploads', 'products'),
  maxSize: 5 * 1024 * 1024, // 5 MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  storage: multer.diskStorage({
    destination: function (req: Request, file: Express.Multer.File, cb) {
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'products');
      ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req: Request, file: Express.Multer.File, cb) {
      cb(null, generateUniqueFilename(file));
    }
  }),
  options: {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter: function (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Ungültiger Dateityp. Nur JPEG, PNG, WebP und GIF-Dateien sind erlaubt.'));
      }
    }
  }
};

/**
 * Standard-Konfiguration für Benutzer-Avatar-Uploads
 */
export const userAvatarUploadConfig: UploadConfig = {
  basePath: path.join(process.cwd(), 'public', 'uploads', 'avatars'),
  maxSize: 2 * 1024 * 1024, // 2 MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  storage: multer.diskStorage({
    destination: function (req: Request, file: Express.Multer.File, cb) {
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req: Request, file: Express.Multer.File, cb) {
      cb(null, generateUniqueFilename(file));
    }
  }),
  options: {
    limits: {
      fileSize: 2 * 1024 * 1024 // 2 MB
    },
    fileFilter: function (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Ungültiger Dateityp. Nur JPEG, PNG und WebP-Dateien sind erlaubt.'));
      }
    }
  }
};

/**
 * Erstellt eine Multer-Instance mit den angegebenen Konfigurationsoptionen
 * 
 * @param config Upload-Konfiguration
 * @returns Multer-Instance
 */
export function createUploader(config: UploadConfig): multer.Multer {
  return multer({
    storage: config.storage,
    ...config.options
  });
}