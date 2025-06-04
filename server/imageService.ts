/**
 * ImageService - Zentraler Service für die Bildverwaltung
 * 
 * Dieser Service verwaltet die konsistente Speicherung von Bildern in der Anwendung.
 * Er stellt sicher, dass:
 * 1. Bilder immer korrekt in der productImages-Tabelle gespeichert werden
 * 2. Die OrderItems und CartItems korrekte Bildpfade enthalten
 * 3. Fehlerbehandlung und Logging für Bildoperationen
 */

import { db } from './db';
import { productImages, ProductImage } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { IStorage } from './storage';

// Interface für einfache Bildstruktur
interface ImageData {
  url: string;
  isMain?: boolean;
  order?: number;
}

/**
 * Dekodiert einen MULTI-Format-String in ein Array von Bildern
 */
export function decodeMultipleImages(multiString: string): ImageData[] {
  if (!multiString || !multiString.startsWith('MULTI:')) {
    return [];
  }

  try {
    const base64Part = multiString.replace("MULTI:", "");
    const decodedData = decodeURIComponent(atob(base64Part));
    return JSON.parse(decodedData);
  } catch (error) {
    console.error("Fehler beim Dekodieren von MULTI-Format:", error);
    return [];
  }
}

/**
 * Extrahiert alle Bilder aus einem imageUrl String
 * Unterstützt sowohl MULTI-Format als auch einzelne Bilder
 */
export function extractImages(imageUrl: string | null): ImageData[] {
  if (!imageUrl) {
    return [];
  }

  // Wenn es ein MULTI-Format ist, dekodiere es
  if (imageUrl.startsWith('MULTI:')) {
    return decodeMultipleImages(imageUrl);
  }
  
  // Sonst erstelle ein Array mit einem einzigen Bild
  return [{
    url: imageUrl,
    isMain: true,
    order: 0
  }];
}

/**
 * Kodiert ein Array von Bildern in einen MULTI-Format-String
 */
export function encodeMultipleImages(images: ImageData[]): string {
  if (!images || images.length === 0) {
    return "";
  }
  
  try {
    // JSON-Serialisierung
    const jsonString = JSON.stringify(images);
    // URL-Kodierung
    const encodedJsonString = encodeURIComponent(jsonString);
    // Base64-Kodierung
    const base64String = Buffer.from(encodedJsonString).toString('base64');
    // MULTI-Präfix hinzufügen
    return "MULTI:" + base64String;
  } catch (error) {
    console.error("Fehler beim Kodieren der Bilder:", error);
    return "";
  }
}

/**
 * Konvertiert ein Array von ProductImage-Objekten in ein MULTI-Format
 */
export function convertImagesToMultiFormat(images: ProductImage[]): string {
  if (!images || images.length === 0) {
    return "";
  }
  
  // Konvertiere ProductImage-Objekte in ImageData-Objekte
  const imageData = images.map((img, index) => ({
    url: img.imageUrl,
    isMain: img.isMain,
    order: img.sortOrder || index
  }));
  
  return encodeMultipleImages(imageData);
}

/**
 * ImageService-Klasse für zentrale Bildverwaltung
 */
export class ImageService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Zentrale Methode zum Speichern von Bildern für ein OrderItem
   * Sichert Bilder sowohl aus imageUrl als auch aus filePath
   */
  async saveImagesForOrderItem(orderItemId: number, imageUrl: string | null, filePath: string | null): Promise<void> {
    console.log(`Saving images for orderItem ${orderItemId}`, { 
      hasImageUrl: !!imageUrl, 
      hasFilePath: !!filePath 
    });

    try {
      // Sammle alle Bilder aus beiden Quellen
      const images: ImageData[] = [];
      
      // 1. Sammle Bilder aus imageUrl
      if (imageUrl) {
        const extractedImages = extractImages(imageUrl);
        images.push(...extractedImages);
      }
      
      // 2. Füge filePath hinzu, wenn es nicht schon enthalten ist
      if (filePath && !images.some(img => img.url === filePath)) {
        images.push({
          url: filePath,
          isMain: images.length === 0, // Nur wenn es das erste Bild ist
          order: images.length
        });
      }
      
      // Wenn keine Bilder vorhanden sind, nichts zu tun
      if (images.length === 0) {
        console.log(`No images to save for orderItem ${orderItemId}`);
        return;
      }
      
      console.log(`Saving ${images.length} images for orderItem ${orderItemId}`);
      
      // Speichere alle Bilder in der Datenbank
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        // Bild-Metadaten vorbereiten
        const imgData = {
          orderItemId: orderItemId,
          imageUrl: img.url,
          filePath: img.url, // Verwende die URL auch als filePath
          isMain: img.isMain === true || i === 0, // Erstes Bild ist standardmäßig Main
          sortOrder: img.order || i
        };
        
        // In die Datenbank speichern
        await this.storage.createProductImage(imgData);
      }
      
      console.log(`Successfully saved ${images.length} images for orderItem ${orderItemId}`);
    } catch (error) {
      console.error(`Error saving images for orderItem ${orderItemId}:`, error);
      // Wir werfen den Fehler nicht weiter, um die Produkterstellung nicht zu beeinträchtigen
    }
  }

  /**
   * Zentrale Methode zum Speichern von Bildern für ein CartItem
   */
  async saveImagesForCartItem(cartItemId: number, imageUrl: string | null): Promise<void> {
    console.log(`Saving images for cartItem ${cartItemId}`, { hasImageUrl: !!imageUrl });

    try {
      // Sammle alle Bilder
      const images: ImageData[] = imageUrl ? extractImages(imageUrl) : [];
      
      // Wenn keine Bilder vorhanden sind, nichts zu tun
      if (images.length === 0) {
        console.log(`No images to save for cartItem ${cartItemId}`);
        return;
      }
      
      console.log(`Saving ${images.length} images for cartItem ${cartItemId}`);
      
      // Speichere alle Bilder in der Datenbank
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        // Bild-Metadaten vorbereiten
        const imgData = {
          cartItemId: cartItemId,
          imageUrl: img.url,
          filePath: img.url, // Verwende die URL auch als filePath
          isMain: img.isMain === true || i === 0, // Erstes Bild ist standardmäßig Main
          sortOrder: img.order || i
        };
        
        // In die Datenbank speichern
        await this.storage.createProductImage(imgData);
      }
      
      console.log(`Successfully saved ${images.length} images for cartItem ${cartItemId}`);
    } catch (error) {
      console.error(`Error saving images for cartItem ${cartItemId}:`, error);
      // Wir werfen den Fehler nicht weiter, um die Warenkorb-Erstellung nicht zu beeinträchtigen
    }
  }
}