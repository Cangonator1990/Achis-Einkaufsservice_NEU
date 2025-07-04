import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertAddressSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertProductImageSchema,
  timeSlotSchema,
  orderStatusSchema
} from "@shared/schema";
import { z } from "zod";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import "./types"; // Import type augmentation
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sessionkonfiguration wird jetzt in auth.ts übernommen

  // Set up authentication routes (this will configure passport strategies)
  await setupAuth(app);
  
  // Sicherstellen, dass der Upload-Ordner existiert und persistent ist
  const uploadDir = 'public/uploads/products/';
  try {
    // Erstelle alle benötigten Verzeichnisse rekursiv
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    if (!fs.existsSync('public/uploads')) {
      fs.mkdirSync('public/uploads', { recursive: true });
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Setze Berechtigungen für bessere Persistenz (falls unterstützt)
    try {
      fs.chmodSync(uploadDir, 0o777);
    } catch (e) {
      console.warn('Konnte Berechtigungen nicht ändern:', e);
    }
    
    console.log('Upload-Verzeichnisse wurden überprüft und ggf. erstellt.');
  } catch (error) {
    console.error('Fehler beim Erstellen der Upload-Verzeichnisse:', error);
  }
  
  // Multer setup for file uploads mit verbesserter Persistenz
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Stelle sicher, dass das Verzeichnis existiert, bevor die Datei hochgeladen wird
      if (!fs.existsSync(uploadDir)) {
        try {
          fs.mkdirSync(uploadDir, { recursive: true });
        } catch (error) {
          console.error('Fehler beim Erstellen des Upload-Verzeichnisses:', error);
        }
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = `${randomUUID()}-${Date.now()}`
      const fileExt = path.extname(file.originalname).toLowerCase()
      const filename = `product-${uniqueSuffix}${fileExt}`;
      cb(null, filename);
    }
  })
  
  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
  
  const upload = multer({ 
    storage: multerStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB max size
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  
  // API-Endpunkt für Benutzereinstellungen - Anleitungen anzeigen/verstecken
  app.post('/api/user/preferences/order-instructions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { show } = req.body;
      
      if (typeof show !== 'boolean') {
        return res.status(400).json({ message: "Parameter 'show' muss ein Boolean sein" });
      }
      
      const success = await storage.setShowOrderInstructions(userId, show);
      
      if (success) {
        return res.status(200).json({ 
          success: true, 
          message: show ? "Anleitungen werden angezeigt" : "Anleitungen werden ausgeblendet",
          showOrderInstructions: show
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: "Einstellung konnte nicht aktualisiert werden" 
        });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Benutzereinstellungen:", error);
      res.status(500).json({ 
        success: false, 
        message: "Fehler beim Aktualisieren der Benutzereinstellungen" 
      });
    }
  });

  // Product image upload endpoint mit verbesserter Persistenz
  app.post('/api/upload/product-image', isAuthenticated, upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Sicherstellen, dass die Datei existiert und lesbar ist
      const fileName = req.file.filename;
      const fullPath = path.join('public', 'uploads', 'products', fileName);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(500).json({ 
          success: false,
          message: 'Die Datei wurde nicht korrekt gespeichert' 
        });
      }
      
      // Zusätzliches Logging
      console.log(`Bild erfolgreich hochgeladen: ${fullPath}`);
      
      // Setze Dateiberechtigungen (falls unterstützt)
      try {
        fs.chmodSync(fullPath, 0o666);
      } catch (e) {
        console.warn('Konnte Dateiberechtigungen nicht ändern:', e);
      }
      
      // Return the path relative to the public directory
      const filePath = `/uploads/products/${fileName}`;
      
      res.status(201).json({ 
        success: true,
        filePath,
        fileName: fileName,
        originalName: req.file.originalname
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error uploading file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint zum Löschen eines Produktbilds
  app.delete('/api/upload/product-image', isAuthenticated, (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: 'No file path provided' });
      }
      
      // Extrahiere den Dateinamen aus dem Pfad
      const fileName = filePath.split('/').pop();
      
      if (!fileName) {
        return res.status(400).json({ message: 'Invalid file path' });
      }
      
      // Erstelle den vollständigen Pfad zur Datei
      const fullFilePath = path.join('public', 'uploads', 'products', fileName);
      
      // Prüfe ob die Datei existiert
      if (!fs.existsSync(fullFilePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Lösche die Datei
      fs.unlinkSync(fullFilePath);
      
      res.status(200).json({ 
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin middleware
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Test endpoint to verify authentication
  app.get("/api/auth/check", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });
  
  // Benutzerinformationen mit allen Einstellungen holen
  app.get("/api/user", async (req, res) => {
    try {
      if (req.isAuthenticated() && req.user) {
        // Erweiterte Benutzerinformationen aus der Datenbank holen
        const user = await storage.getUser(req.user.id);
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ message: "Benutzer nicht gefunden" });
        }
      } else {
        res.status(401).json({ message: "Nicht authentifiziert" });
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Benutzerinformationen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzerinformationen" });
    }
  });

  // User profile
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      // req.user is already the user from passport
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = z.object({
        email: z.string().email().optional(),
        phoneNumber: z.string().optional()
      });

      const validated = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.user.id, validated);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating profile" });
    }
  });

  // Addresses
  app.get("/api/addresses", isAuthenticated, async (req, res) => {
    try {
      const addresses = await storage.getAddressesByUserId(req.user.id);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching addresses" });
    }
  });

  app.post("/api/addresses", isAuthenticated, async (req, res) => {
    try {
      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating address" });
    }
  });

  app.patch("/api/addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const address = await storage.getAddressById(addressId);
      
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      if (address.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateSchema = z.object({
        name: z.string().optional(),
        fullName: z.string().optional(),
        street: z.string().optional(),
        houseNumber: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        additionalInfo: z.string().optional(),
        isDefault: z.boolean().optional()
      });
      
      const validated = updateSchema.parse(req.body);
      const updatedAddress = await storage.updateAddress(addressId, validated);
      res.json(updatedAddress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating address" });
    }
  });

  // Reguläre Route zum Löschen einer Adresse
  app.delete("/api/addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      console.log(`DELETE-Anfrage für Adresse ID: ${addressId} von Benutzer ID: ${userId}`);
      
      if (!userId) {
        console.log(`Kein Benutzer gefunden für die Anfrage`);
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }
      
      // Direkte SQL-Ausführung anstelle der komplexen Funktionalität
      const address = await db.execute(sql`
        SELECT * FROM addresses WHERE id = ${addressId} LIMIT 1
      `);
      
      if (!address.rows || address.rows.length === 0) {
        console.log(`Adresse ID: ${addressId} nicht gefunden`);
        return res.status(404).json({ message: "Adresse nicht gefunden" });
      }
      
      const addressData = address.rows[0];
      
      // Prüfen, ob der Benutzer der Eigentümer der Adresse ist oder ein Admin
      const isOwner = addressData.user_id === userId;
      const isAdminUser = req.user.role === "admin";
      
      if (!isOwner && !isAdminUser) {
        console.log(`BERECHTIGUNGSFEHLER: Benutzer ID: ${userId} ist nicht berechtigt, Adresse ID: ${addressId} von Benutzer ID: ${addressData.user_id} zu löschen`);
        return res.status(403).json({ message: "Sie haben keine Berechtigung, diese Adresse zu löschen" });
      }
      
      // Prüfen, ob dies die einzige Adresse des Benutzers ist und sie die Standardadresse ist
      if (addressData.is_default) {
        const userAddressCount = await db.execute(sql`
          SELECT COUNT(*) AS count FROM addresses WHERE user_id = ${addressData.user_id}
        `);
        
        const count = parseInt(userAddressCount.rows[0].count);
        console.log(`Benutzer hat ${count} Adressen insgesamt`);
        
        if (count === 1) {
          console.log(`Die zu löschende Adresse ist die einzige und Standardadresse des Benutzers`);
          return res.status(400).json({ 
            message: "Diese Adresse kann nicht gelöscht werden, da sie die einzige und Standard-Adresse ist. Bitte fügen Sie zuerst eine neue Adresse hinzu."
          });
        }
        
        // Falls es nicht die einzige Adresse ist, aber die Standardadresse,
        // setzen wir eine andere Adresse als Standard
        console.log(`Setze eine andere Adresse als Standard vor dem Löschen`);
        
        // Transaktion starten
        await db.transaction(async (tx) => {
          // Andere Adresse finden
          const otherAddress = await tx.execute(sql`
            SELECT id FROM addresses 
            WHERE user_id = ${addressData.user_id} AND id != ${addressId}
            ORDER BY id DESC
            LIMIT 1
          `);
          
          if (otherAddress.rows && otherAddress.rows.length > 0) {
            const newDefaultId = otherAddress.rows[0].id;
            console.log(`Setze Adresse ID: ${newDefaultId} als neue Standardadresse`);
            
            // Alle auf false setzen
            await tx.execute(sql`
              UPDATE addresses SET is_default = false
              WHERE user_id = ${addressData.user_id}
            `);
            
            // Neue Default-Adresse setzen
            await tx.execute(sql`
              UPDATE addresses SET is_default = true
              WHERE id = ${newDefaultId}
            `);
            
            console.log(`Neue Standardadresse wurde gesetzt`);
          }
        });
      }
      
      // Adresse direkt mit einem SQL-Query löschen
      console.log(`Führe direkte SQL-Löschung für Adresse ID: ${addressId} aus`);
      
      const deleteResult = await db.execute(sql`
        DELETE FROM addresses WHERE id = ${addressId} RETURNING id
      `);
      
      if (!deleteResult.rows || deleteResult.rows.length === 0) {
        console.log(`Löschung fehlgeschlagen!`);
        return res.status(500).json({ message: "Die Adresse konnte nicht gelöscht werden." });
      }
      
      console.log(`Adresse ID: ${addressId} erfolgreich gelöscht`);
      res.status(204).send();
      
    } catch (error) {
      console.error(`Fehler beim Löschen der Adresse:`, error);
      res.status(500).json({ message: "Error deleting address" });
    }
  });
  
  // Neue alternative Route zum Löschen einer Adresse mit vereinfachter Logik
  app.post("/api/addresses/delete", isAuthenticated, async (req, res) => {
    try {
      // Da wir isAuthenticated nutzen, sollte req.user immer definiert sein
      // TypeScript braucht aber eine explizite Prüfung
      if (!req.user) {
        console.log("Benutzer nicht authentifiziert");
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }

      const { addressId } = req.body;
      
      console.log("Empfangene Anfrage zum Löschen einer Adresse:", req.body);
      
      if (!addressId || isNaN(parseInt(String(addressId)))) {
        console.log("Ungültige Adress-ID:", addressId);
        return res.status(400).json({ message: "Ungültige Adress-ID" });
      }
      
      const id = parseInt(String(addressId));
      const userId = req.user.id;
      
      console.log(`NEUE DELETE-Route: Anfrage für Adresse ID: ${id} von Benutzer ID: ${userId}`);
      
      // Vereinfachte Berechtigungsprüfung
      let addressOwnerId = null;
      
      // Ermittle den Besitzer der Adresse
      try {
        console.log(`Prüfe Besitzer der Adresse ID: ${id}`);
        const addressCheck = await db.execute(sql`
          SELECT user_id FROM addresses WHERE id = ${id}
        `);
        
        console.log(`Adressprüfung Ergebnis:`, addressCheck.rows);
        
        if (addressCheck.rows && addressCheck.rows.length > 0) {
          addressOwnerId = parseInt(String(addressCheck.rows[0].user_id));
          console.log(`Adressbesitzer ID: ${addressOwnerId}`);
        } else {
          console.log(`Adresse mit ID ${id} nicht gefunden`);
          return res.status(404).json({ message: "Adresse nicht gefunden" });
        }
      } catch (err) {
        console.error("Fehler beim Prüfen der Adresse:", err);
        return res.status(500).json({ message: "Fehler beim Prüfen der Adresse" });
      }
      
      // Prüfe, ob der Benutzer Eigentümer oder Admin ist
      const isOwner = addressOwnerId === userId;
      const isAdminUser = req.user.role === "admin";
      
      console.log(`Berechtigungsprüfung: Besitzer=${isOwner}, Admin=${isAdminUser}, BenutzerId=${userId}, AdressBesitzerId=${addressOwnerId}`);
      
      if (!isOwner && !isAdminUser) {
        console.log(`BERECHTIGUNGSFEHLER: Benutzer ID: ${userId} ist nicht berechtigt, Adresse ID: ${id} von Benutzer ID: ${addressOwnerId} zu löschen`);
        return res.status(403).json({ message: "Sie haben keine Berechtigung, diese Adresse zu löschen" });
      }
      
      // Keine Standardadressen-Prüfung mehr - Adressen können jederzeit gelöscht werden
      console.log(`Lösche Adresse ID: ${id}, keine Einschränkungen mehr für Standardadressen`);
      
      // Falls nötig, setzen wir eine andere Adresse als Standard, wenn mehr als eine Adresse vorhanden ist
      const addressCountCheck = await db.execute(sql`
        SELECT COUNT(*) as count FROM addresses WHERE user_id = ${addressOwnerId}
      `);
      
      const addressCount = parseInt(String(addressCountCheck.rows[0].count));
      console.log(`Benutzer hat ${addressCount} Adressen`);
      
      // Eine andere Adresse als Standard setzen, nur wenn mehr als eine vorhanden
      if (addressCount > 1) {
        const addressStatusCheck = await db.execute(sql`
          SELECT is_default FROM addresses WHERE id = ${id}
        `);
        
        if (addressStatusCheck.rows && addressStatusCheck.rows.length > 0 && addressStatusCheck.rows[0].is_default) {
          console.log(`Zu löschende Adresse ist eine Standardadresse, setze eine neue`);
          await db.transaction(async (tx) => {
            // Alle Adressen des Benutzers zurücksetzen
            await tx.execute(sql`
              UPDATE addresses SET is_default = FALSE 
              WHERE user_id = ${addressOwnerId}
            `);
            
            // Eine andere Adresse als Standard setzen
            await tx.execute(sql`
              UPDATE addresses SET is_default = TRUE
              WHERE user_id = ${addressOwnerId} AND id != ${id}
              LIMIT 1
            `);
          });
          console.log(`Neue Standardadresse gesetzt`);
        }
      }
      
      // Vereinfachte Löschung mit direktem SQL
      try {
        console.log(`Führe Löschung der Adresse ID: ${id} durch`);
        const deleteResult = await db.execute(sql`
          DELETE FROM addresses WHERE id = ${id} RETURNING id
        `);
        
        if (deleteResult.rows && deleteResult.rows.length > 0) {
          console.log(`Adresse ID: ${id} erfolgreich gelöscht`);
          return res.json({ success: true });
        } else {
          console.log(`Keine Zeile gelöscht, mögliches Problem mit Berechtigungen oder Constraints`);
          return res.status(404).json({ message: "Adresse konnte nicht gelöscht werden" });
        }
      } catch (deleteErr) {
        console.error("Fehler beim Löschen der Adresse:", deleteErr);
        return res.status(500).json({ message: "Fehler beim Löschen der Adresse" });
      }
    } catch (error) {
      console.error(`Hauptfehler beim Löschen der Adresse:`, error);
      res.status(500).json({ message: "Fehler beim Löschen der Adresse" });
    }
  });
  
  // Adressen eines bestimmten Benutzers abrufen (für Admins)
  app.get("/api/users/:userId/addresses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Aus Datenschutzgründen liefern wir keine persönlichen Adressen von Benutzern zurück
      // Der Admin soll nur seine eigenen Adressen sehen können
      if (req.user?.id !== parseInt(req.params.userId)) {
        // Stattdessen senden wir eine leere Adressliste
        console.log(`Admin (ID: ${req.user?.id}) versuchte, auf die Adressen von Benutzer ${req.params.userId} zuzugreifen. Aus Datenschutzgründen wird eine leere Liste zurückgegeben.`);
        return res.json([]);
      }
      
      // Falls Admin seine eigenen Adressen anfordert, diese regulär zurückgeben
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const addresses = await storage.getAddressesByUserId(userId);
      res.json(addresses);
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      res.status(500).json({ message: "Error fetching user addresses" });
    }
  });

  app.patch("/api/addresses/:id/default", isAuthenticated, async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const address = await storage.getAddressById(addressId);
      
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      if (address.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.setDefaultAddress(req.user.id, addressId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error setting default address" });
    }
  });

  // Orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrdersByUserId(req.user.id);
      
      // Bestellungen mit Artikeln und Bildern anreichern
      const enrichedOrders = [];
      for (const order of orders) {
        const items = await storage.getOrderItemsByOrderId(order.id);
        
        // Jedes OrderItem mit seinen Bildern anreichern
        const enrichedItems = [];
        for (const item of items) {
          // Bilder für dieses OrderItem abrufen
          const images = await storage.getProductImagesByOrderItemId(item.id);
          
          // Füge die Bilder dem OrderItem hinzu
          enrichedItems.push({
            ...item,
            productImages: images
          });
        }
        
        enrichedOrders.push({
          ...order,
          items: enrichedItems
        });
      }
      
      console.log(`Bestellungen mit Bildern geladen für User ${req.user.id}:`, 
        JSON.stringify(enrichedOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          itemCount: order.items?.length || 0,
          imageCount: order.items?.reduce((sum, item) => sum + (item.productImages?.length || 0), 0) || 0
        }))));
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching orders with images:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Bestellungsdetails mit Artikeln und Bildern anreichern
      const items = await storage.getOrderItemsByOrderId(orderId);
      
      // Jedes OrderItem mit seinen Bildern anreichern
      const enrichedItems = [];
      for (const item of items) {
        // Bilder für dieses OrderItem abrufen
        const images = await storage.getProductImagesByOrderItemId(item.id);
        
        // Füge die Bilder dem OrderItem hinzu
        enrichedItems.push({
          ...item,
          productImages: images
        });
      }
      
      console.log(`Bestellungsdetails mit Bildern geladen für Bestellung ${orderId}:`, 
        JSON.stringify({
          orderNumber: order.orderNumber,
          itemCount: enrichedItems.length,
          imageCount: enrichedItems.reduce((sum, item) => sum + (item.productImages?.length || 0), 0)
        }));
      
      res.json({ ...order, items: enrichedItems });
    } catch (error) {
      console.error("Error fetching order with images:", error);
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      console.log("Received order data:", JSON.stringify(req.body, null, 2));
      
      const { orderItems, ...orderData } = req.body;
      
      // Initial validation checks
      if (!orderData.desiredDeliveryDate) {
        return res.status(400).json({ message: "desiredDeliveryDate is required" });
      }
      
      if (!orderData.desiredTimeSlot) {
        return res.status(400).json({ message: "desiredTimeSlot is required" });
      }
      
      if (!orderData.addressId) {
        return res.status(400).json({ message: "addressId is required" });
      }
      
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return res.status(400).json({ message: "At least one order item is required" });
      }
      
      // Prüfe, ob eine Hauptfiliale angegeben ist oder ob jedes Produkt eine Filiale hat
      const itemsWithoutStore = orderItems.filter(item => !item.store || item.store.trim() === '');
      
      if (itemsWithoutStore.length > 0 && (!orderData.store || orderData.store.trim() === '')) {
        return res.status(400).json({ 
          message: "Alle Produkte müssen eine Filiale haben. Bitte fügen Sie entweder eine Hauptfiliale hinzu oder geben Sie für jedes Produkt eine Filiale an." 
        });
      }
      
      // Process date input if it's a string
      let desiredDeliveryDate;
      console.log("Date type:", typeof orderData.desiredDeliveryDate);
      
      if (typeof orderData.desiredDeliveryDate === 'string') {
        console.log("Converting string date:", orderData.desiredDeliveryDate);
        desiredDeliveryDate = new Date(orderData.desiredDeliveryDate);
        
        // Check if date is valid
        if (isNaN(desiredDeliveryDate.getTime())) {
          return res.status(400).json({ 
            message: `Invalid date format for desiredDeliveryDate: ${orderData.desiredDeliveryDate}` 
          });
        }
      } else if (orderData.desiredDeliveryDate instanceof Date) {
        desiredDeliveryDate = orderData.desiredDeliveryDate;
      } else {
        return res.status(400).json({ 
          message: `Unsupported date type: ${typeof orderData.desiredDeliveryDate}`
        });
      }
      
      const processedOrderData = {
        ...orderData,
        desiredDeliveryDate
      };
      
      console.log("Processed order data:", JSON.stringify(processedOrderData, (key, value) => {
        if (value instanceof Date) return value.toISOString();
        return value;
      }, 2));
      
      // Validate order data with schema
      let validatedOrder;
      try {
        validatedOrder = insertOrderSchema.parse({
          ...processedOrderData,
          userId: req.user.id,
        });
        
        console.log("Validated order data:", JSON.stringify(validatedOrder, (key, value) => {
          if (value instanceof Date) return value.toISOString();
          return value;
        }, 2));
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid order data", errors: validationError.errors });
        }
        throw validationError;
      }
      
      // Validate address ownership
      const address = await storage.getAddressById(validatedOrder.addressId);
      if (!address || address.userId !== req.user.id) {
        return res.status(400).json({ message: "Invalid address" });
      }
      
      // Adressdaten in die Bestellung kopieren - so bleiben diese auch erhalten, wenn die Adresse später gelöscht wird
      const orderWithAddressDetails = {
        ...validatedOrder,
        addressFullName: address.fullName,
        addressStreet: address.street,
        addressHouseNumber: address.houseNumber,
        addressPostalCode: address.postalCode,
        addressCity: address.city,
        addressAdditionalInfo: address.additionalInfo
      };
      
      // Create order with copied address details
      const order = await storage.createOrder(orderWithAddressDetails);
      console.log("Order created successfully with address details:", order.id);
      
      // Create order items
      const orderItemsSchema = z.array(insertOrderItemSchema);
      let validatedItems;
      try {
        console.log("Attempting to validate order items:", JSON.stringify(orderItems, null, 2));
        validatedItems = orderItemsSchema.parse(orderItems);
        console.log("Order items validated successfully");
      } catch (itemsError) {
        if (itemsError instanceof z.ZodError) {
          console.error("Order items validation failed:", JSON.stringify(itemsError.errors, null, 2));
          return res.status(400).json({ message: "Invalid order items", errors: itemsError.errors });
        }
        throw itemsError;
      }
      
      for (const item of validatedItems) {
        // Erhalte die vollständigen Daten inklusive Bildfelder aus den ursprünglichen Items
        const originalItem = orderItems.find(original => 
          original.productName === item.productName && 
          original.quantity === item.quantity &&
          original.store === item.store
        );
        
        // Füge die Bildinformationen hinzu, wenn sie vorhanden sind
        const createdOrderItem = await storage.createOrderItem({ 
          ...item, 
          orderId: order.id,
          imageUrl: originalItem?.imageUrl || null,
          filePath: originalItem?.filePath || null
        });
        
        // Verarbeite Produktbilder, wenn vorhanden
        if (originalItem && (originalItem.imageUrl || originalItem.filePath)) {
          // Prüfe, ob es mehrere Bilder im MULTI-Format gibt
          if (originalItem.imageUrl && originalItem.imageUrl.startsWith('MULTI:')) {
            try {
              // Extrahiere die Bilder aus dem MULTI-Format
              const base64Part = originalItem.imageUrl.replace("MULTI:", "");
              const decodedData = decodeURIComponent(atob(base64Part));
              const imageData = JSON.parse(decodedData);
              
              console.log(`Extrahierte ${imageData.length} Bilder aus MULTI-Format für OrderItem ${createdOrderItem.id}`);
              
              // Speichere jedes Bild in der productImages-Tabelle
              for (let i = 0; i < imageData.length; i++) {
                const img = imageData[i];
                await storage.createProductImage({
                  orderItemId: createdOrderItem.id,
                  imageUrl: img.url,
                  filePath: img.url || "",  // Verwende URL auch als filePath
                  isMain: img.isMain === true,
                  sortOrder: img.order || i
                });
              }
            } catch (error) {
              console.error("Fehler beim Verarbeiten von MULTI-Format Bildern:", error);
              // Fallback: Speichere das ursprüngliche Bild als einzelnes Bild
              if (originalItem.filePath) {
                await storage.createProductImage({
                  orderItemId: createdOrderItem.id,
                  imageUrl: originalItem.filePath,
                  filePath: originalItem.filePath || "",
                  isMain: true,
                  sortOrder: 0
                });
              } else if (originalItem.imageUrl) {
                // Falls kein filePath, aber imageUrl vorhanden ist
                await storage.createProductImage({
                  orderItemId: createdOrderItem.id,
                  imageUrl: originalItem.imageUrl,
                  filePath: originalItem.imageUrl || "",
                  isMain: true,
                  sortOrder: 0
                });
              }
            }
          } 
          // Nur ein einzelnes Bild
          else if (originalItem.filePath) {
            await storage.createProductImage({
              orderItemId: createdOrderItem.id,
              imageUrl: originalItem.filePath,
              filePath: originalItem.filePath || "",
              isMain: true,
              sortOrder: 0
            });
          }
          // Wenn nur imageUrl aber kein filePath vorhanden ist
          else if (originalItem.imageUrl) {
            await storage.createProductImage({
              orderItemId: createdOrderItem.id,
              imageUrl: originalItem.imageUrl,
              filePath: originalItem.imageUrl || "",
              isMain: true,
              sortOrder: 0
            });
          }
        }
      }
      console.log("Order items created successfully");
      
      // Create notification for admin
      try {
        const admins = Array.from((await storage.getAllUsers()) || [])
          .filter(user => user.role === "admin");
        
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "new_order",
            message: `Neue Bestellung eingegangen: ${order.orderNumber}`,
            relatedOrderId: order.id,
            isRead: false
          });
        }
        console.log("Admin notifications created successfully");
      } catch (notificationError) {
        console.error("Error creating admin notification:", notificationError);
        // Continue even if notification creation fails
      }
      
      // Get complete order with items and images
      const items = await storage.getOrderItemsByOrderId(order.id);
      
      // Jedes OrderItem mit seinen Bildern anreichern
      const enrichedItems = [];
      for (const item of items) {
        // Bilder für dieses OrderItem abrufen
        const images = await storage.getProductImagesByOrderItemId(item.id);
        
        // Füge die Bilder dem OrderItem hinzu
        enrichedItems.push({
          ...item,
          productImages: images
        });
      }
      
      console.log(`Neu erstellte Bestellung mit Bildern geladen:`, 
        JSON.stringify({
          orderNumber: order.orderNumber,
          itemCount: enrichedItems.length,
          imageCount: enrichedItems.reduce((sum, item) => sum + (item.productImages?.length || 0), 0)
        }));
      
      res.status(201).json({ ...order, items: enrichedItems });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ 
        message: "Error creating order", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Regular users can only update their own unlocked orders
      if (req.user.role !== "admin") {
        if (order.userId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
        
        if (order.isLocked) {
          return res.status(403).json({ message: "Order is locked" });
        }
        
        // Regular users can only update certain fields
        const userUpdateSchema = z.object({
          desiredDeliveryDate: z.string().or(z.instanceof(Date)).optional(),
          desiredTimeSlot: timeSlotSchema.optional(),
          additionalInstructions: z.string().optional(),
          addressId: z.number().optional()
        });
        
        const parsedData = userUpdateSchema.parse(req.body);
        
        // Convert string dates to Date objects
        const validated = {
          ...parsedData,
          desiredDeliveryDate: parsedData.desiredDeliveryDate ? 
            (typeof parsedData.desiredDeliveryDate === 'string' ? 
              new Date(parsedData.desiredDeliveryDate) : 
              parsedData.desiredDeliveryDate) : 
            undefined
        };
        
        // If updating address, validate ownership (Normale Benutzer dürfen nur ihre eigenen Adressen verwenden)
        if (validated.addressId) {
          const address = await storage.getAddressById(validated.addressId);
          if (!address || address.userId !== req.user.id) {
            return res.status(400).json({ message: "Invalid address" });
          }
        }
        
        const updatedOrder = await storage.updateOrder(orderId, validated);
        res.json(updatedOrder);
      } else {
        // Admin can update more fields
        const adminUpdateSchema = z.object({
          status: orderStatusSchema.optional(),
          desiredDeliveryDate: z.string().or(z.instanceof(Date)).optional(),
          desiredTimeSlot: timeSlotSchema.optional(),
          suggestedDeliveryDate: z.string().or(z.instanceof(Date)).optional(),
          suggestedTimeSlot: timeSlotSchema.optional(),
          finalDeliveryDate: z.string().or(z.instanceof(Date)).optional(),
          finalTimeSlot: timeSlotSchema.optional(),
          isLocked: z.boolean().optional(),
          additionalInstructions: z.string().optional(),
          addressId: z.number().optional()
        });
        
        const parsedData = adminUpdateSchema.parse(req.body);
        
        // Convert string dates to Date objects
        const validated = {
          ...parsedData,
          desiredDeliveryDate: parsedData.desiredDeliveryDate ? 
            (typeof parsedData.desiredDeliveryDate === 'string' ? 
              new Date(parsedData.desiredDeliveryDate) : 
              parsedData.desiredDeliveryDate) : 
            undefined,
          suggestedDeliveryDate: parsedData.suggestedDeliveryDate ? 
            (typeof parsedData.suggestedDeliveryDate === 'string' ? 
              new Date(parsedData.suggestedDeliveryDate) : 
              parsedData.suggestedDeliveryDate) : 
            undefined,
          finalDeliveryDate: parsedData.finalDeliveryDate ? 
            (typeof parsedData.finalDeliveryDate === 'string' ? 
              new Date(parsedData.finalDeliveryDate) : 
              parsedData.finalDeliveryDate) : 
            undefined
        };
        const updatedOrder = await storage.updateOrder(orderId, validated);
        
        // Hilfsfunktion für deutsche Statusbezeichnung
        const getGermanStatusLabel = (status: string) => {
          switch(status) {
            case 'new': return 'Neu';
            case 'processing': return 'In Bearbeitung';
            case 'completed': return 'Abgeschlossen';
            case 'cancelled': return 'Storniert';
            case 'date_forced': return 'Datum vom Admin festgelegt';
            case 'pending_customer_review': return 'Auf Kundenbestätigung wartend';
            case 'date_accepted': return 'Termin vom Kunden akzeptiert';
            case 'pending_admin_review': return 'Auf Admin-Bestätigung wartend';
            default: return status;
          }
        };
        
        // Create notification for status changes
        if (validated.status && validated.status !== order.status) {
          await storage.createNotification({
            userId: order.userId,
            type: "status_change",
            message: `Status Ihrer Bestellung ${order.orderNumber} wurde auf ${getGermanStatusLabel(validated.status)} geändert`,
            relatedOrderId: order.id,
            isRead: false
          });
        }
        
        // Create notification for suggested delivery date
        if (validated.suggestedDeliveryDate && validated.suggestedTimeSlot &&
            (validated.suggestedDeliveryDate !== order.suggestedDeliveryDate || 
             validated.suggestedTimeSlot !== order.suggestedTimeSlot)) {
          await storage.createNotification({
            userId: order.userId,
            type: "delivery_suggestion",
            message: `Neuer Liefertermin für Bestellung ${order.orderNumber} vorgeschlagen`,
            relatedOrderId: order.id,
            isRead: false
          });
        }
        
        // Create notification for final delivery date
        if (validated.finalDeliveryDate && validated.finalTimeSlot &&
            (validated.finalDeliveryDate !== order.finalDeliveryDate || 
             validated.finalTimeSlot !== order.finalTimeSlot)) {
          await storage.createNotification({
            userId: order.userId,
            type: "delivery_confirmation",
            message: `Finaler Liefertermin für Bestellung ${order.orderNumber} festgelegt`,
            relatedOrderId: order.id,
            isRead: false
          });
        }
        
        res.json(updatedOrder);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating order" });
    }
  });

  app.put("/api/orders/:id/accept-suggestion", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!order.suggestedDeliveryDate || !order.suggestedTimeSlot) {
        return res.status(400).json({ message: "No suggested delivery date" });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.suggestedDeliveryDate,
        finalTimeSlot: order.suggestedTimeSlot,
        status: 'date_accepted'
      });
      
      // Notify admin or user depending on who accepted
      if (req.user.role !== "admin") {
        // Notify admin when customer accepts
        const admins = Array.from((await storage.getAllUsers()) || [])
          .filter(user => user.role === "admin");
        
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "suggestion_accepted",
            message: `Vorgeschlagener Termin für Bestellung ${order.orderNumber} wurde akzeptiert`,
            relatedOrderId: order.id,
            isRead: false
          });
        }
      } else {
        // Notify customer when admin accepts
        await storage.createNotification({
          userId: order.userId,
          type: "date_accepted_by_admin",
          message: `Der Admin hat den von Ihnen gewünschten Termin für Bestellung ${order.orderNumber} akzeptiert`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error accepting suggested date" });
    }
  });

  app.patch("/api/orders/:id/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      const item = await storage.getOrderItem(itemId);
      if (!item || item.orderId !== orderId) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      const updateSchema = insertOrderItemSchema;
      const validated = updateSchema.parse(req.body);
      
      const updatedItem = await storage.updateOrderItem(itemId, validated);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating order item" });
    }
  });

  app.delete("/api/orders/:id/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      const item = await storage.getOrderItem(itemId);
      if (!item || item.orderId !== orderId) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      await storage.deleteOrderItem(itemId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting order item" });
    }
  });

  app.post("/api/orders/:id/items", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      // Holen Sie die vollständigen Daten aus der Anfrage
      const itemData = req.body;
      
      // Validieren Sie die grundlegenden Felder
      const validatedBasicData = insertOrderItemSchema.parse(itemData);
      
      // Erstellen Sie das Order-Item mit allen Daten, einschließlich Bilder
      const item = await storage.createOrderItem({ 
        ...validatedBasicData, 
        orderId,
        // Füge die Bildinformationen hinzu, wenn sie vorhanden sind
        imageUrl: itemData.imageUrl || null,
        filePath: itemData.filePath || null
      });
      
      // Verarbeite Produktbilder, wenn vorhanden
      if (itemData.imageUrl || itemData.filePath) {
        // Prüfe, ob es mehrere Bilder im MULTI-Format gibt
        if (itemData.imageUrl && itemData.imageUrl.startsWith('MULTI:')) {
          try {
            // Extrahiere die Bilder aus dem MULTI-Format
            const base64Part = itemData.imageUrl.replace("MULTI:", "");
            const decodedData = decodeURIComponent(atob(base64Part));
            const imageData = JSON.parse(decodedData);
            
            console.log(`Extrahierte ${imageData.length} Bilder aus MULTI-Format für OrderItem ${item.id}`);
            
            // Speichere jedes Bild in der productImages-Tabelle
            for (let i = 0; i < imageData.length; i++) {
              const img = imageData[i];
              await storage.createProductImage({
                orderItemId: item.id,
                imageUrl: img.url,
                filePath: img.url || "",
                isMain: img.isMain === true,
                sortOrder: img.order || i
              });
            }
          } catch (error) {
            console.error("Fehler beim Verarbeiten von MULTI-Format Bildern:", error);
            // Fallback: Speichere das ursprüngliche Bild als einzelnes Bild
            if (itemData.filePath) {
              await storage.createProductImage({
                orderItemId: item.id,
                imageUrl: itemData.filePath,
                filePath: itemData.filePath || "",
                isMain: true,
                sortOrder: 0
              });
            }
          }
        } 
        // Nur ein einzelnes Bild
        else if (itemData.filePath) {
          await storage.createProductImage({
            orderItemId: item.id,
            imageUrl: itemData.filePath,
            filePath: itemData.filePath || "",
            isMain: true,
            sortOrder: 0
          });
        }
        // Wenn nur imageUrl aber kein filePath vorhanden ist
        else if (itemData.imageUrl) {
          await storage.createProductImage({
            orderItemId: item.id,
            imageUrl: itemData.imageUrl,
            filePath: itemData.imageUrl || "",
            isMain: true,
            sortOrder: 0
          });
        }
      }
      
      // Wenn ein Admin den Artikel hinzugefügt hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          type: "order_updated",
          message: `Ihrer Bestellung ${order.orderNumber} wurde ein neuer Artikel hinzugefügt.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating order item" });
    }
  });
  

  /**************************************
   * Order draft routes (für die serverseitige Formularstatusverwaltung)
   **************************************/
  
  // Get current order draft
  app.get('/api/order-draft', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const draft = await storage.getOrderDraft(userId);
      res.json(draft || {});
    } catch (error) {
      console.error('Error getting order draft:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen des Bestellungsentwurfs' });
    }
  });
  
  // Save or update order draft
  app.post('/api/order-draft', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const draftData = req.body;
      
      const draft = await storage.saveOrderDraft({
        userId,
        addressId: draftData.addressId,
        desiredDeliveryDate: draftData.desiredDeliveryDate ? new Date(draftData.desiredDeliveryDate) : null,
        desiredTimeSlot: draftData.desiredTimeSlot,
        additionalInstructions: draftData.additionalInstructions,
        store: draftData.store,
      });
      
      res.json(draft);
    } catch (error) {
      console.error('Error saving order draft:', error);
      res.status(500).json({ message: 'Fehler beim Speichern des Bestellungsentwurfs' });
    }
  });
  
  // Delete order draft
  app.delete('/api/order-draft', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const success = await storage.deleteOrderDraft(userId);
      if (success) {
        res.json({ message: 'Bestellungsentwurf erfolgreich gelöscht' });
      } else {
        res.status(404).json({ message: 'Bestellungsentwurf nicht gefunden' });
      }
    } catch (error) {
      console.error('Error deleting order draft:', error);
      res.status(500).json({ message: 'Fehler beim Löschen des Bestellungsentwurfs' });
    }
  });

  // Cart routes
  app.get("/api/cart/active", isAuthenticated, async (req, res) => {
    try {
      // Since isAuthenticated middleware ensures req.user exists, we can safely use it
      const cart = await storage.getActiveCart(req.user.id);

      if (!cart) {
        return res.json({ items: [] });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(cart.id);
      
      // Jedes CartItem mit seinen Bildern anreichern
      const enrichedItems = [];
      for (const item of cartItems) {
        // Bilder für dieses CartItem abrufen
        const images = await storage.getProductImagesByCartItemId(item.id);
        
        // Bilder in MULTI-Format konvertieren
        const imageUrl = images.length > 0 ? 
          (await import('./imageService')).convertImagesToMultiFormat(images) : 
          null;
        
        // Füge die Bilder dem CartItem hinzu (sowohl als Array als auch als MULTI-Format)
        enrichedItems.push({
          ...item,
          productImages: images,
          imageUrl: imageUrl
        });
        
        console.log(`Found ${images.length} images for cartItem ${item.id}, converted to MULTI format`);
      }
      
      res.json({
        ...cart,
        items: enrichedItems
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Error fetching cart" });
    }
  });

  app.post("/api/cart", isAuthenticated, async (req, res) => {
    try {
      // Get or create active cart
      let cart = await storage.getActiveCart(req.user.id);

      if (!cart) {
        cart = await storage.createCart({
          userId: req.user.id,
          isActive: true,
          store: "" // Initialisiere mit leerem Store
        });
      }

      // Clear existing items
      await storage.clearCart(cart.id);

      // Add new items
      const { store, items } = req.body;

      // Validate input
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      // Verbesserte Validierung für Produkte und Bilder
      const validatedItems = [];
      
      for (const item of items) {
        // 1. Pflichtfelder prüfen
        if (!item.productName || typeof item.productName !== 'string' || item.productName.trim() === "") {
          return res.status(400).json({ 
            message: "Jedes Produkt muss einen Namen haben", 
            item: item
          });
        }
        
        // 2. Filiale prüfen
        if (!item.store || typeof item.store !== 'string' || item.store.trim() === "") {
          return res.status(400).json({ 
            message: "Jedes Produkt muss eine Filiale haben", 
            item: item.productName 
          });
        }
        
        // 3. Menge prüfen
        if (!item.quantity || typeof item.quantity !== 'string' || item.quantity.trim() === "") {
          return res.status(400).json({ 
            message: "Jedes Produkt muss eine Menge haben", 
            item: item.productName 
          });
        }
        
        // 4. Bildvalidierung
        let validatedImageUrl = null;
        
        if (item.imageUrl) {
          // Wenn es ein MULTI-Format ist, validieren
          if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith("MULTI:")) {
            try {
              // Dekodierungsversuch
              const base64 = item.imageUrl.replace("MULTI:", "");
              let jsonString;
              
              try {
                jsonString = atob(base64);
              } catch (e) {
                console.error("BASE64-Dekodierungsfehler für Warenkorb-Item:", item.productName, e);
                throw new Error("Ungültiges BASE64-Format in imageUrl");
              }
              
              try {
                jsonString = decodeURIComponent(jsonString);
              } catch (e) {
                console.error("URL-Dekodierungsfehler für Warenkorb-Item:", item.productName, e);
                // Versuche ohne URL-Dekodierung fortzufahren
              }
              
              // JSON-Parsing
              const imageData = JSON.parse(jsonString);
              
              // Validiere das Array-Format
              if (!Array.isArray(imageData)) {
                console.error("Ungültiges Bildformat für Warenkorb-Item:", item.productName, "Kein Array:", imageData);
                throw new Error("Ungültiges Bildformat: Kein Array");
              }
              
              // Validiere jedes Bild im Array
              const validImages = imageData.filter(img => img && typeof img.url === 'string');
              if (validImages.length === 0) {
                console.error("Keine gültigen Bilder im Array gefunden für:", item.productName);
                throw new Error("Keine gültigen Bilder");
              }
              
              console.log("Validiertes MULTI-Format für", item.productName, "enthält", validImages.length, "Bilder");
              validatedImageUrl = item.imageUrl; // Original-URL beibehalten, sie wurde validiert
            } catch (error) {
              console.error("Fehler bei der Bildvalidierung für MULTI-Format:", error);
              // Bei Validierungsfehlern setzen wir imageUrl auf null
              validatedImageUrl = null;
            }
          } else if (typeof item.imageUrl === 'string') {
            // Reguläre URL Validierung (einfache Prüfung)
            if (item.imageUrl.startsWith('/') || item.imageUrl.startsWith('http')) {
              validatedImageUrl = item.imageUrl;
            } else {
              console.warn("Ungültiges Bildformat für:", item.productName, "URL:", item.imageUrl);
              validatedImageUrl = null;
            }
          } else {
            console.warn("Ungültiger imageUrl-Typ für:", item.productName, "Typ:", typeof item.imageUrl);
            validatedImageUrl = null;
          }
        }
        
        // 5. Validiertes Item hinzufügen
        validatedItems.push({
          ...item,
          productName: item.productName.trim(),
          store: item.store.trim(),
          quantity: item.quantity.trim(),
          notes: item.notes || "",
          imageUrl: validatedImageUrl
        });
      }

      console.log("Saving cart items:", items);

      // Aktualisiere die Hauptfiliale im Warenkorb
      if (store) {
        await storage.updateCart(cart.id, { store });
        cart = { ...cart, store };
      }

      const cartItems = [];
      // Verwende die validierten Items statt der Rohdaten
      for (const item of validatedItems) {
        // WICHTIG: RESPEKTIERE IMMER DIE INDIVIDUELLEN FILIALWERTE JEDES ARTIKELS!
        // Wir verwenden hier NUR die store-Eigenschaft des Items, ohne Fallback auf die Hauptfiliale
        // Die Hauptfiliale dient nur als Referenz für neue Artikel, die in der UI hinzugefügt werden
        try {
          const cartItem = await storage.addCartItem({
            cartId: cart.id,
            productName: item.productName,
            quantity: item.quantity,
            // KRITISCH: Behalte IMMER den originalen store-Wert bei, ohne ihn zu überschreiben
            store: item.store, // Muss immer einen Wert haben (gemäß vorheriger Validierung)
            notes: item.notes || "",
            // Speichere den Bildpfad für Konsistenz und Persistenz - verwende validierte URL
            imageUrl: item.imageUrl // Kann null sein, was ok ist
          });
          cartItems.push(cartItem);
          
          // Zusätzlich: Speichere die Bilder in der productImages-Tabelle für Persistenz
          if (item.imageUrl) {
            try {
              // MULTI-Format für mehrere Bilder
              if (item.imageUrl.startsWith('MULTI:')) {
                // Extrahiere die Bilder aus dem MULTI-Format
                const base64Part = item.imageUrl.replace("MULTI:", "");
                const decodedData = decodeURIComponent(atob(base64Part));
                const imageData = JSON.parse(decodedData);
                
                // Speichere jedes Bild in der productImages-Tabelle
                for (let i = 0; i < imageData.length; i++) {
                  const img = imageData[i];
                  await storage.createProductImage({
                    cartItemId: cartItem.id,
                    imageUrl: img.url,
                    filePath: img.url || "",
                    isMain: img.isMain === true,
                    sortOrder: img.order || i
                  });
                }
                console.log(`Für Warenkorb-Item ${cartItem.id} wurden ${imageData.length} Bilder in productImages gespeichert`);
              } 
              // Einzelnes Bild
              else {
                await storage.createProductImage({
                  cartItemId: cartItem.id,
                  imageUrl: item.imageUrl,
                  filePath: item.imageUrl || "",
                  isMain: true,
                  sortOrder: 0
                });
                console.log(`Für Warenkorb-Item ${cartItem.id} wurde ein Bild in productImages gespeichert`);
              }
            } catch (error) {
              console.error("Fehler beim Speichern der Bilder in productImages:", error);
            }
          }
          
          console.log("Saved cart item:", item.productName, "with image URL:", item.imageUrl ? 
            (item.imageUrl.length > 50 ? item.imageUrl.substring(0, 50) + "..." : item.imageUrl) : 
            "no image");
        } catch (error) {
          console.error("Fehler beim Speichern des Warenkorb-Items:", item.productName, error);
          // Versuche es erneut ohne Bild, falls das Bild fehlerhaft ist
          try {
            const cartItem = await storage.addCartItem({
              cartId: cart.id,
              productName: item.productName,
              quantity: item.quantity,
              store: item.store,
              notes: item.notes || "",
              imageUrl: null // Fallback ohne Bild
            });
            cartItems.push(cartItem);
            console.log("Saved cart item (fallback without image):", item.productName);
          } catch (innerError) {
            console.error("Kritischer Fehler beim Speichern des Warenkorb-Items:", innerError);
            // Log genug Daten für Fehleranalyse, aber vermeide sensible Daten
            console.error("Item data:", {
              productName: item.productName,
              store: item.store,
              hasImage: item.imageUrl ? "yes" : "no",
              imageLength: item.imageUrl ? item.imageUrl.length : 0
            });
          }
        }
      }

      console.log("Cart items saved successfully");

      res.json({
        ...cart,
        items: cartItems
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Error updating cart" });
    }
  });

  app.delete("/api/cart", isAuthenticated, async (req, res) => {
    try {
      console.log("Clearing cart for user:", req.user.id);
      const cart = await storage.getActiveCart(req.user.id);

      if (cart) {
        await storage.clearCart(cart.id);
        await storage.deactivateCart(cart.id);
        console.log("Cart cleared successfully");
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  // Admin routes
  app.get("/api/admin/orders", isAdmin, async (req, res) => {
    try {
      // Holen Sie zunächst alle Bestellungen
      const orders = await storage.getAllOrders();
      
      // Array zum Speichern der erweiterten Bestellungen
      const enrichedOrders = [];
      
      // Laden Sie für jede Bestellung die relevanten Benutzerdaten und Adressdaten
      for (const order of orders) {
        // Benutzerdaten laden
        const user = await storage.getUser(order.userId);
        
        // Adressdaten laden
        const address = order.addressId ? await storage.getAddressById(order.addressId) : null;
        
        // Bestellungselemente laden
        const items = await storage.getOrderItemsByOrderId(order.id);
        
        // Bestellung mit zusätzlichen Daten anreichern
        enrichedOrders.push({
          ...order,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          } : null,
          address: address,
          items: items
        });
      }
      
      // Sortierte angereicherte Bestellungen zurückgeben
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error in /api/admin/orders:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Erweiterte Benutzerinformationen mit Sicherheitsvorkehrungen (keine Passwörter)
      const enrichedUsers = await Promise.all(users.map(async (user) => {
        // Aus Datenschutzgründen laden wir keine Adressen anderer Benutzer
        // Stattdessen nur die Anzahl der Adressen aus der Datenbank abfragen
        const addressCount = await db.execute(sql`
          SELECT COUNT(*) as count FROM addresses WHERE user_id = ${user.id}
        `);
        const addressCountValue = parseInt(addressCount.rows?.[0]?.count || "0");
        
        // Bestellungen des Benutzers laden
        const orders = await storage.getOrdersByUserId(user.id);
        
        // Rückgabe der Benutzerdaten ohne sensible Informationen wie Passwörter
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          role: user.role,
          birthDate: user.birthDate,
          isActive: user.isActive !== false, // Aktiv standardmäßig, sofern nicht explizit deaktiviert
          // Statistiken
          addressCount: addressCountValue,
          orderCount: orders.length,
          lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
        };
      }));
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error in /api/admin/users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.patch("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getOrderItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      const order = await storage.getOrderById(item.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Prüfen, ob der Benutzer Zugriff hat (Admin oder Besitzer)
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prüfen, ob die Bestellung gesperrt ist und der Benutzer kein Admin ist
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      // Erweitertes Schema, das auch Bildpfade berücksichtigt
      const updateSchema = z.object({
        productName: z.string().optional(),
        quantity: z.string().optional(),
        store: z.string().optional(),
        notes: z.string().optional(),
        // Optionale Bildpfade hinzufügen
        imageUrl: z.string().nullable().optional(),
        filePath: z.string().nullable().optional()
      });
      
      // Die vollständigen Anfrage-Daten validieren
      const validated = updateSchema.parse(req.body);
      
      // Aktualisiere das Item mit allen Daten, einschließlich Bildpfaden
      const updatedItem = await storage.updateOrderItem(itemId, validated);
      
      // Wenn ein Admin den Artikel geändert hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.id,
          type: "order_updated",
          message: `Ein Artikel in Ihrer Bestellung ${order.orderNumber} wurde aktualisiert.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating order item" });
    }
  });
  

  app.delete("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getOrderItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      const order = await storage.getOrderById(item.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Prüfen, ob der Benutzer Zugriff hat (Admin oder Besitzer)
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prüfen, ob die Bestellung gesperrt ist und der Benutzer kein Admin ist
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      await storage.deleteOrderItem(itemId);
      
      // Wenn ein Admin den Artikel gelöscht hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          type: "order_updated",
          message: `Ein Artikel wurde aus Ihrer Bestellung ${order.orderNumber} entfernt.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting order item" });
    }
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  app.get("/api/notifications/unread/count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error marking notifications as read" });
    }
  });
  

  // Add new endpoints for delivery date negotiation
  app.post("/api/admin/orders/:id/force-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const { finalDeliveryDate, finalTimeSlot } = req.body;
      
      if (!finalDeliveryDate || !finalTimeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Update order with forced date and lock it
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: new Date(finalDeliveryDate),
        finalTimeSlot,
        status: 'date_forced',
        isLocked: true // Verhindert weitere Änderungen
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_forced",
        message: `Der Administrator hat einen verbindlichen Liefertermin für Ihre Bestellung ${order.orderNumber} festgelegt.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error forcing delivery date" });
    }
  });

  app.post("/api/admin/orders/:id/suggest-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const { suggestedDate, suggestedTimeSlot } = req.body;
      
      if (!suggestedDate || !suggestedTimeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Update order with suggested date
      const updatedOrder = await storage.updateOrder(orderId, {
        suggestedDeliveryDate: new Date(suggestedDate),
        suggestedTimeSlot,
        status: 'pending_customer_review'
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_suggested",
        message: `Ein alternativer Liefertermin wurde für Ihre Bestellung ${order.orderNumber} vorgeschlagen.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error suggesting delivery date" });
    }
  });

  app.post("/api/orders/:id/accept-date", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!order.suggestedDeliveryDate || !order.suggestedTimeSlot) {
        return res.status(400).json({ message: "No suggested date to accept" });
      }
      
      // Update order with accepted date and set as final
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.suggestedDeliveryDate,
        finalTimeSlot: order.suggestedTimeSlot,
        status: 'date_accepted',
        isLocked: false // Ermöglicht weitere Änderungen
      });
      
      // Notify admin
      const admins = (await storage.getAllUsers()).filter(user => user.role === "admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "date_accepted",
          message: `Der Kunde hat den vorgeschlagenen Liefertermin für Bestellung ${order.orderNumber} akzeptiert.`,
          relatedOrderId: order.id
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error accepting delivery date" });
    }
  });

  app.post("/api/admin/orders/:id/accept-customer-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!order.desiredDeliveryDate || !order.desiredTimeSlot) {
        return res.status(400).json({ message: "No desired date to accept" });
      }
      
      // Update order with customer's desired date as final
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.desiredDeliveryDate,
        finalTimeSlot: order.desiredTimeSlot,
        status: 'date_accepted',
        isLocked: false // Allow further changes if needed
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_accepted_by_admin",
        message: `Der Administrator hat Ihren gewünschten Liefertermin für Bestellung ${order.orderNumber} akzeptiert.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error accepting customer date" });
    }
  });

  app.post("/api/orders/:id/suggest-date", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { suggestedDate, suggestedTimeSlot } = req.body;
      
      if (!suggestedDate || !suggestedTimeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Update order with customer's suggested date
      const updatedOrder = await storage.updateOrder(orderId, {
        desiredDeliveryDate: new Date(suggestedDate),
        desiredTimeSlot: suggestedTimeSlot,
        status: 'pending_admin_review'
      });
      
      // Notify admin
      const admins = (await storage.getAllUsers()).filter(user => user.role === "admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "customer_suggested_date",
          message: `Der Kunde hat einen neuen Liefertermin für Bestellung ${order.orderNumber} vorgeschlagen.`,
          relatedOrderId: order.id
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error suggesting delivery date" });
    }
  });

  // Order Items Management
  app.get("/api/order-items/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Nur Admin oder Besitzer dürfen auf Bestellartikel zugreifen
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const items = await storage.getOrderItemsByOrderId(orderId);
      
      // Jedes OrderItem mit seinen Bildern anreichern
      const enrichedItems = [];
      for (const item of items) {
        // Bilder für dieses OrderItem abrufen
        const images = await storage.getProductImagesByOrderItemId(item.id);
        
        // Bilder in MULTI-Format konvertieren
        const imageUrl = images.length > 0 ? 
          (await import('./imageService')).convertImagesToMultiFormat(images) : 
          null;
        
        // Füge die Bilder dem OrderItem hinzu (sowohl als Array als auch als MULTI-Format)
        enrichedItems.push({
          ...item,
          productImages: images,
          imageUrl: imageUrl
        });
        
        console.log(`Found ${images.length} images for orderItem ${item.id}, converted to MULTI format`);
      }
      
      res.json(enrichedItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order items" });
    }
  });

  app.post("/api/order-items", isAuthenticated, async (req, res) => {
    try {
      const { orderId, ...itemData } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "orderId is required" });
      }
      
      const order = await storage.getOrderById(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Prüfen, ob der Benutzer Zugriff hat (Admin oder Besitzer)
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prüfen, ob die Bestellung gesperrt ist und der Benutzer kein Admin ist
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      const item = await storage.createOrderItem({
        ...itemData,
        orderId: parseInt(orderId)
      });
      
      // Wenn ein Admin den Artikel hinzugefügt hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          type: "order_updated",
          message: `Ihrer Bestellung ${order.orderNumber} wurde ein neuer Artikel hinzugefügt.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating order item" });
    }
  });
  

  app.patch("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getOrderItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      const order = await storage.getOrderById(item.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Prüfen, ob der Benutzer Zugriff hat (Admin oder Besitzer)
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prüfen, ob die Bestellung gesperrt ist und der Benutzer kein Admin ist
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      const updateSchema = z.object({
        productName: z.string().optional(),
        quantity: z.string().optional(), // Als String, um mit der Datenbank konsistent zu sein
        store: z.string().optional(),
        notes: z.string().optional()
      });
      
      const validated = updateSchema.parse(req.body);
      const updatedItem = await storage.updateOrderItem(itemId, validated);
      
      // Wenn ein Admin den Artikel geändert hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          type: "order_updated",
          message: `Ein Artikel in Ihrer Bestellung ${order.orderNumber} wurde aktualisiert.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating order item" });
    }
  });
  

  app.delete("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getOrderItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      const order = await storage.getOrderById(item.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Prüfen, ob der Benutzer Zugriff hat (Admin oder Besitzer)
      if (order.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prüfen, ob die Bestellung gesperrt ist und der Benutzer kein Admin ist
      if (order.isLocked && req.user.role !== "admin") {
        return res.status(403).json({ message: "Order is locked" });
      }
      
      await storage.deleteOrderItem(itemId);
      
      // Wenn ein Admin den Artikel gelöscht hat, benachrichtige den Besitzer
      if (req.user.role === "admin" && req.user.id !== order.userId) {
        await storage.createNotification({
          userId: order.userId,
          type: "order_updated",
          message: `Ein Artikel wurde aus Ihrer Bestellung ${order.orderNumber} entfernt.`,
          relatedOrderId: order.id,
          isRead: false
        });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting order item" });
    }
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  app.get("/api/notifications/unread/count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Error fetching notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error marking notifications as read" });
    }
  });
  

  // Add new endpoints for delivery date negotiation
  app.post("/api/admin/orders/:id/force-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const { finalDeliveryDate, finalTimeSlot } = req.body;
      
      if (!finalDeliveryDate || !finalTimeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Update order with forced date and lock it
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: new Date(finalDeliveryDate),
        finalTimeSlot,
        status: 'date_forced',
        isLocked: true // Verhindert weitere Änderungen
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_forced",
        message: `Der Administrator hat einen verbindlichen Liefertermin für Ihre Bestellung ${order.orderNumber} festgelegt.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error forcing delivery date" });
    }
  });

  app.post("/api/admin/orders/:id/suggest-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const { suggestedDate, suggestedTimeSlot } = req.body;
      
      if (!suggestedDate || !suggestedTimeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Update order with suggested date
      const updatedOrder = await storage.updateOrder(orderId, {
        suggestedDeliveryDate: new Date(suggestedDate),
        suggestedTimeSlot,
        status: 'pending_customer_review'
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_suggested",
        message: `Ein alternativer Liefertermin wurde für Ihre Bestellung ${order.orderNumber} vorgeschlagen.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error suggesting delivery date" });
    }
  });

  app.post("/api/orders/:id/accept-date", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!order.suggestedDeliveryDate || !order.suggestedTimeSlot) {
        return res.status(400).json({ message: "No suggested date to accept" });
      }
      
      // Update order with accepted date and set as final
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.suggestedDeliveryDate,
        finalTimeSlot: order.suggestedTimeSlot,
        status: 'date_accepted',
        isLocked: false // Ermöglicht weitere Änderungen
      });
      
      // Notify admin
      const admins = (await storage.getAllUsers()).filter(user => user.role === "admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "date_accepted",
          message: `Der Kunde hat den vorgeschlagenen Liefertermin für Bestellung ${order.orderNumber} akzeptiert.`,
          relatedOrderId: order.id
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error accepting delivery date" });
    }
  });

  app.post("/api/admin/orders/:id/accept-customer-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!order.desiredDeliveryDate || !order.desiredTimeSlot) {
        return res.status(400).json({ message: "No desired date to accept" });
      }
      
      // Update order with customer's desired date as final
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.desiredDeliveryDate,
        finalTimeSlot: order.desiredTimeSlot,
        status: 'date_accepted',
        isLocked: false // Allow further changes if needed
      });
      
      // Notify customer
      await storage.createNotification({
        userId: order.userId,
        type: "date_accepted_by_admin",
        message: `Der Administrator hat Ihren gewünschten Liefertermin für Bestellung ${order.orderNumber} akzeptiert.`,
        relatedOrderId: order.id
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error accepting customer date" });
    }
  });

  // Produktbild-Routen
  app.get("/api/product-images/order-item/:id", isAuthenticated, async (req, res) => {
    try {
      const orderItemId = parseInt(req.params.id);
      
      // Prüfe, ob das OrderItem existiert und dem Benutzer gehört
      const orderItem = await storage.getOrderItem(orderItemId);
      if (!orderItem) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      // Prüfe, ob der Benutzer Zugriff auf diese Bestellung hat
      const order = await storage.getOrderById(orderItem.orderId);
      if (!order || (order.userId !== req.user.id && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const images = await storage.getProductImagesByOrderItemId(orderItemId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching product images:", error);
      res.status(500).json({ message: "Error fetching product images" });
    }
  });
  
  app.get("/api/product-images/cart-item/:id", isAuthenticated, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      
      // Prüfe, ob das CartItem existiert und dem Benutzer gehört
      const cartItems = await storage.getCartItems(parseInt(req.params.id));
      const cartItem = cartItems.find(item => item.id === cartItemId);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Prüfe, ob der Benutzer Zugriff auf diesen Warenkorb hat
      const cart = await storage.getActiveCart(req.user.id);
      if (!cart || cart.id !== cartItem.cartId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const images = await storage.getProductImagesByCartItemId(cartItemId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching product images:", error);
      res.status(500).json({ message: "Error fetching product images" });
    }
  });
  
  app.post("/api/product-images", isAuthenticated, async (req, res) => {
    try {
      const imageData = req.body;
      
      // Validiere, dass entweder orderItemId oder cartItemId angegeben wird
      if (!imageData.orderItemId && !imageData.cartItemId) {
        return res.status(400).json({ message: "Either orderItemId or cartItemId is required" });
      }
      
      // Validiere, dass imageUrl und filePath angegeben werden
      if (!imageData.imageUrl || !imageData.filePath) {
        return res.status(400).json({ message: "imageUrl and filePath are required" });
      }
      
      // Validiere, dass der Benutzer Zugriff auf das angegebene Item hat
      if (imageData.orderItemId) {
        const orderItem = await storage.getOrderItem(imageData.orderItemId);
        if (!orderItem) {
          return res.status(404).json({ message: "Order item not found" });
        }
        
        const order = await storage.getOrderById(orderItem.orderId);
        if (!order || (order.userId !== req.user.id && req.user.role !== "admin")) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else if (imageData.cartItemId) {
        const cartItems = await storage.getCartItems(imageData.cartItemId);
        const cartItem = cartItems.find(item => item.id === imageData.cartItemId);
        
        if (!cartItem) {
          return res.status(404).json({ message: "Cart item not found" });
        }
        
        const cart = await storage.getActiveCart(req.user.id);
        if (!cart || cart.id !== cartItem.cartId) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      // Produktbild erstellen
      const validatedImage = insertProductImageSchema.parse(imageData);
      const newImage = await storage.createProductImage(validatedImage);
      
      res.status(201).json(newImage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating product image:", error);
      res.status(500).json({ message: "Error creating product image" });
    }
  });
  
  app.put("/api/product-images/:id/main", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const image = await storage.getProductImage(imageId);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Prüfe, ob der Benutzer Zugriff auf das Bild hat
      if (image.orderItemId) {
        const orderItem = await storage.getOrderItem(image.orderItemId);
        if (!orderItem) {
          return res.status(404).json({ message: "Order item not found" });
        }
        
        const order = await storage.getOrderById(orderItem.orderId);
        if (!order || (order.userId !== req.user.id && req.user.role !== "admin")) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else if (image.cartItemId) {
        const cartItems = await storage.getCartItems(image.cartItemId);
        const cartItem = cartItems.find(item => item.id === image.cartItemId);
        
        if (!cartItem) {
          return res.status(404).json({ message: "Cart item not found" });
        }
        
        const cart = await storage.getActiveCart(req.user.id);
        if (!cart || cart.id !== cartItem.cartId) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      // Bild als Hauptbild festlegen
      await storage.setMainProductImage(imageId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting main product image:", error);
      res.status(500).json({ message: "Error setting main product image" });
    }
  });
  
  app.delete("/api/product-images/:id", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const image = await storage.getProductImage(imageId);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Prüfe, ob der Benutzer Zugriff auf das Bild hat
      if (image.orderItemId) {
        const orderItem = await storage.getOrderItem(image.orderItemId);
        if (!orderItem) {
          return res.status(404).json({ message: "Order item not found" });
        }
        
        const order = await storage.getOrderById(orderItem.orderId);
        if (!order || (order.userId !== req.user.id && req.user.role !== "admin")) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else if (image.cartItemId) {
        const cartItems = await storage.getCartItems(image.cartItemId);
        const cartItem = cartItems.find(item => item.id === image.cartItemId);
        
        if (!cartItem) {
          return res.status(404).json({ message: "Cart item not found" });
        }
        
        const cart = await storage.getActiveCart(req.user.id);
        if (!cart || cart.id !== cartItem.cartId) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      // Bild löschen
      await storage.deleteProductImage(imageId);
      
      // Auch die Datei im Dateisystem löschen
      if (image.filePath) {
        const fileName = image.filePath.split('/').pop();
        if (fileName) {
          const fullFilePath = path.join('public', 'uploads', 'products', fileName);
          if (fs.existsSync(fullFilePath)) {
            fs.unlinkSync(fullFilePath);
          }
        }
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product image:", error);
      res.status(500).json({ message: "Error deleting product image" });
    }
  });

  // Neuer Endpunkt: Admin akzeptiert direkt den gewünschten Termin des Kunden
  app.post("/api/admin/orders/:id/accept-desired-date", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!order.desiredDeliveryDate || !order.desiredTimeSlot) {
        return res.status(400).json({ message: "No desired date to accept" });
      }
      
      // Update order with customer's desired date as final
      const updatedOrder = await storage.updateOrder(orderId, {
        finalDeliveryDate: order.desiredDeliveryDate,
        finalTimeSlot: order.desiredTimeSlot,
        status: 'date_accepted',
        isLocked: false // Entsperren, um weitere Änderungen zu ermöglichen
      });
      
      // Benachrichtigung für den Kunden erstellen
      await storage.createNotification({
        userId: order.userId,
        type: "date_accepted",
        message: `Der Admin hat Ihren gewünschten Liefertermin für die Bestellung ${order.orderNumber} akzeptiert.`,
        relatedOrderId: order.id
      });
      
      // Benachrichtigung für den Admin erstellen
      if (req.user && req.user.id) {
        await storage.createNotification({
          userId: req.user.id,
          type: "admin_info",
          message: `Sie haben den Wunschtermin für Bestellung ${order.orderNumber} akzeptiert.`,
          relatedOrderId: order.id
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error accepting desired date:", error);
      res.status(500).json({ message: "Error accepting desired date" });
    }
  });

  // ===== ADMIN PORTAL API ENDPUNKTE =====
  
  // Admin Dashboard Stats (API Endpoint für Frontend)
  app.get("/api/admin/dashboard/stats", isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const totalOrders = allOrders.length;
      const newOrders = allOrders.filter(order => order.status === 'new').length;
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const upcomingDeliveries = allOrders.filter(order => 
        ['processing', 'confirmed'].includes(order.status)
      ).length;
      
      res.setHeader('Content-Type', 'application/json');
      res.json({
        totalOrders,
        newOrders,
        totalUsers,
        upcomingDeliveries
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  });

  // Admin Recent Orders (API Endpoint für Frontend)
  app.get("/api/admin/recent-orders", isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const recentOrders = allOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      res.setHeader('Content-Type', 'application/json');
      res.json(recentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching recent orders" });
    }
  });

  // Admin Recent Users (API Endpoint für Frontend)
  app.get("/api/admin/recent-users", isAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const recentUsers = allUsers
        .sort((a, b) => b.id - a.id)
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }));
      
      res.setHeader('Content-Type', 'application/json');
      res.json(recentUsers);
    } catch (error) {
      console.error("Error fetching recent users:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching recent users" });
    }
  });

  // Admin Dashboard Stats (Legacy Endpoint)
  app.get("/admin/dashboard/stats-direct", isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const totalOrders = allOrders.length;
      const newOrders = allOrders.filter(order => order.status === 'new').length;
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const upcomingDeliveries = allOrders.filter(order => 
        ['processing', 'confirmed'].includes(order.status)
      ).length;
      
      res.setHeader('Content-Type', 'application/json');
      res.json({
        totalOrders,
        newOrders,
        totalUsers,
        upcomingDeliveries
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  });

  // Admin Recent Orders
  app.get("/admin/orders/recent-direct", isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const recentOrders = allOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      res.setHeader('Content-Type', 'application/json');
      res.json(recentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching recent orders" });
    }
  });

  // Admin Recent Users  
  app.get("/admin/users/recent-direct", isAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const recentUsers = allUsers
        .sort((a, b) => b.id - a.id)
        .slice(0, 10)
        .map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }));
      
      res.setHeader('Content-Type', 'application/json');
      res.json(recentUsers);
    } catch (error) {
      console.error("Error fetching recent users:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching recent users" });
    }
  });

  // Admin All Orders with Customer Data
  app.get("/admin/orders", isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      
      // Erweitere jede Bestellung um Kundendaten
      const ordersWithCustomers = await Promise.all(
        allOrders.map(async (order) => {
          const customer = await storage.getUser(order.userId);
          return {
            ...order,
            customer: customer ? {
              id: customer.id,
              name: `${customer.firstName} ${customer.lastName}`,
              email: customer.email,
              phone: customer.phoneNumber
            } : null
          };
        })
      );
      
      res.setHeader('Content-Type', 'application/json');
      res.json(ordersWithCustomers);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Error fetching admin orders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}