import { 
  users, type User, type InsertUser,
  addresses, type Address, type InsertAddress,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  notifications, type Notification, type InsertNotification,
  carts, type Cart, type InsertCart,
  cartItems, type CartItem, type InsertCartItem,
  orderDrafts, type OrderDraft, type InsertOrderDraft,
  productImages, type ProductImage, type InsertProductImage
} from "@shared/schema";
import { db, executeQuery } from "./db";
import { eq, and, desc, sql, ne, gte } from "drizzle-orm";
import session from "express-session";
import memorystore from "memorystore";
// PostgreSQL Session Store importieren
import pgSession from "connect-pg-simple";
// Importiere Connection-String aus der Konfiguration
import { DB_CONNECTION_STRING } from "./config/db.config";

// MemoryStore als Fallback-Option
const MemoryStore = memorystore(session);
// PostgreSQL Session Store für Produktionsumgebung
const PgStore = pgSession(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // User preferences methods
  setShowOrderInstructions(userId: number, show: boolean): Promise<boolean>;

  // Address methods
  getAddressesByUserId(userId: number): Promise<Address[]>;
  getAddressById(id: number): Promise<Address | undefined>;
  getDefaultAddress(userId: number): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, data: Partial<Address>): Promise<Address>;
  deleteAddress(id: number): Promise<{success: boolean; message?: string}>;
  setDefaultAddress(userId: number, addressId: number): Promise<boolean>;

  // Order methods
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getAllOrdersIncludingDeleted(): Promise<Order[]>; // Alle Bestellungen inklusive gelöschte (nur für Admin)
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order>;
  cancelOrder(id: number): Promise<Order>; // Bestellung stornieren
  deleteOrder(id: number): Promise<boolean>; // Bestellung löschen (soft-delete)
  restoreOrder(id: number): Promise<Order | undefined>; // Gelöschte Bestellung wiederherstellen

  // Order item methods
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  createOrderItem(item: InsertOrderItem & { orderId: number }): Promise<OrderItem>;
  updateOrderItem(id: number, data: Partial<OrderItem>): Promise<OrderItem>;
  deleteOrderItem(id: number): Promise<boolean>;

  // Notification methods
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllNotifications(userId: number): Promise<boolean>;

  // Session store
  sessionStore: any;

  // Cart methods
  getActiveCart(userId: number): Promise<Cart | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  updateCart(cartId: number, data: Partial<Cart>): Promise<Cart>;
  deactivateCart(cartId: number): Promise<boolean>;

  // Cart item methods
  getCartItems(cartId: number): Promise<CartItem[]>;
  addCartItem(item: InsertCartItem): Promise<CartItem>;
  removeCartItem(itemId: number): Promise<boolean>;
  clearCart(cartId: number): Promise<boolean>;
  
  // Order draft methods (für die Speicherung des Formularstatus)
  getOrderDraft(userId: number): Promise<OrderDraft | undefined>;
  saveOrderDraft(draft: InsertOrderDraft): Promise<OrderDraft>;
  updateOrderDraft(userId: number, data: Partial<OrderDraft>): Promise<OrderDraft>;
  deleteOrderDraft(userId: number): Promise<boolean>;

  // Product image methods
  getProductImagesByOrderItemId(orderItemId: number): Promise<ProductImage[]>;
  getProductImagesByCartItemId(cartItemId: number): Promise<ProductImage[]>;
  getProductImage(id: number): Promise<ProductImage | undefined>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(id: number, data: Partial<ProductImage>): Promise<ProductImage>;
  deleteProductImage(id: number): Promise<boolean>;
  setMainProductImage(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // In der Entwicklungsumgebung (Replit) verwenden wir MemoryStore
    // In der Produktionsumgebung verwenden wir PgStore
    if (process.env.NODE_ENV === 'development' || process.env.REPLIT_ENVIRONMENT) {
      console.log('Verwende MemoryStore für Sessions in der Entwicklungsumgebung');
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // Prüfe nur einmal täglich auf abgelaufene Sessions
        ttl: 7 * 24 * 60 * 60 * 1000  // 7 Tage Session-Lebensdauer
      });
    } else {
      console.log('Verwende PostgreSQL-Store für Sessions in der Produktionsumgebung');
      // Verwende die Verbindungseinstellungen aus der Konfiguration
      // In der Produktion wird der feste Connection-String verwendet
      this.sessionStore = new PgStore({
        conString: DB_CONNECTION_STRING,
        tableName: 'session', // Standard-Tabellenname
        createTableIfMissing: true, // Erstellt die Tabelle automatisch, falls nicht vorhanden
        pruneSessionInterval: 60 * 60, // Aufräumen stündlich (in Sekunden)
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await executeQuery(async () => {
        return await db.select().from(users).where(eq(users.id, id));
      });
      return user;
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzers:', error);
      return undefined; // Robustere Fehlerbehandlung
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await executeQuery(async () => {
        return await db.select().from(users).where(eq(users.username, username));
      });
      return user;
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzers anhand des Benutzernamens:', error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await executeQuery(async () => {
        return await db.select().from(users).where(eq(users.email, email));
      });
      return user;
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzers anhand der E-Mail:', error);
      return undefined;
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await executeQuery(async () => {
        return await db.insert(users).values(user).returning();
      });
      return newUser;
    } catch (error) {
      console.error('Fehler beim Erstellen des Benutzers:', error);
      throw error; // Hier müssen wir den Fehler weiterwerfen, da ein Rückgabewert erwartet wird
    }
  }
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  // User preferences methods
  async setShowOrderInstructions(userId: number, show: boolean): Promise<boolean> {
    const result = await db.update(users)
      .set({ showOrderInstructions: show })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  // Address methods
  async getAddressesByUserId(userId: number): Promise<Address[]> {
    return db.select().from(addresses).where(eq(addresses.userId, userId));
  }
  async getAddressById(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address;
  }
  async getDefaultAddress(userId: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
    return address;
  }
  async createAddress(address: InsertAddress): Promise<Address> {
    // Prüfen, ob es bereits eine Adresse für diesen Benutzer gibt
    const existingAddresses = await db.select().from(addresses).where(eq(addresses.userId, address.userId));
    
    // Wenn keine Adressen gefunden wurden, setze isDefault auf true
    // Ansonsten behalte den übergebenen Wert bei
    const isDefault = existingAddresses.length === 0 ? true : address.isDefault;
    
    // Bei der ersten Adresse eines Benutzers oder wenn explizit als Standard markiert:
    // Setze alle anderen Adressen des Benutzers auf isDefault = false
    if (isDefault) {
      await db.update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, address.userId));
    }
    
    console.log(`[storage] Erstelle neue Adresse für Benutzer ${address.userId}, isDefault: ${isDefault}`);
    
    // Einfügen der neuen Adresse mit dem korrekten isDefault-Wert
    const [newAddress] = await db.insert(addresses)
      .values({ ...address, isDefault })
      .returning();
      
    return newAddress;
  }
  async updateAddress(id: number, data: Partial<Address>): Promise<Address> {
    // Wenn die Adresse als Standard markiert wird, müssen wir alle anderen Adressen des Benutzers aktualisieren
    if (data.isDefault === true) {
      // Zuerst die aktuelle Adresse abrufen, um den Benutzer zu identifizieren
      const address = await this.getAddressById(id);
      if (address) {
        // Alle anderen Adressen des Benutzers auf nicht-Standard setzen
        await db.update(addresses)
          .set({ isDefault: false })
          .where(and(
            eq(addresses.userId, address.userId),
            ne(addresses.id, id)
          ));
        
        console.log(`[storage] Alle anderen Adressen für Benutzer ${address.userId} wurden auf isDefault=false gesetzt`);
      }
    }
    
    // Jetzt die Adresse aktualisieren
    const [updatedAddress] = await db.update(addresses).set(data).where(eq(addresses.id, id)).returning();
    return updatedAddress;
  }
  async deleteAddress(id: number): Promise<{success: boolean; message?: string}> {
    console.log(`[storage] Löschversuch für Adresse ID: ${id} - NEUE IMPLEMENTIERUNG`);
    
    try {
      // 1. Adresse in einer Transaktion holen, um Locking zu ermöglichen
      const address = await db.transaction(async (tx: any) => {
        // Adresse mit FOR UPDATE-Lock holen
        const result = await tx.execute(sql`
          SELECT * FROM addresses WHERE id = ${id} FOR UPDATE
        `);
        
        if (!result.rows || result.rows.length === 0) {
          console.log(`[storage] Adresse mit ID: ${id} existiert nicht`);
          return null;
        }
        
        return result.rows[0] as Address;
      });
      
      if (!address) {
        return {
          success: false,
          message: "Die angegebene Adresse wurde nicht gefunden."
        };
      }
      
      const userId = address.userId;
      const isDefault = address.isDefault;
      
      console.log(`[storage] Gefundene Adresse: ID=${id}, User=${userId}, isDefault=${isDefault}`);
      
      // 2. Überprüfen, ob es Referenzen zu dieser Adresse gibt
      // Prüfe auf Bestellungen, die auf diese Adresse verweisen
      const orderWithAddress = await db.execute(sql`
        SELECT order_number FROM orders WHERE address_id = ${id} LIMIT 1
      `);
      
      // Wir erlauben jetzt das Löschen von Adressen, auch wenn sie mit Bestellungen verknüpft sind
      // Bestellungen haben bereits alle relevanten Adressinformationen gespeichert
      if (orderWithAddress.rows && orderWithAddress.rows.length > 0) {
        const orderNumber = orderWithAddress.rows[0].order_number;
        console.log(`[storage] Adresse ID: ${id} wird in Bestellung ${orderNumber} verwendet, wird trotzdem gelöscht`);
      }
      
      // Prüfe auf Bestellentwürfe, die auf diese Adresse verweisen
      const draftWithAddress = await db.execute(sql`
        SELECT id FROM order_drafts WHERE address_id = ${id} LIMIT 1
      `);
      
      // Auch Bestellentwürfe dürfen nicht das Löschen von Adressen verhindern
      if (draftWithAddress.rows && draftWithAddress.rows.length > 0) {
        console.log(`[storage] Adresse ID: ${id} wird in Bestellentwurf verwendet, wird aber trotzdem gelöscht`);
        
        // Setze die address_id im Entwurf auf NULL
        await db.execute(sql`
          UPDATE order_drafts SET address_id = NULL
          WHERE address_id = ${id}
        `);
      }
      
      // 3. Überprüfen, ob dies die einzige Adresse des Benutzers ist
      const addressCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM addresses WHERE user_id = ${userId}
      `);
      
      const countStr = addressCount.rows?.[0]?.count?.toString() || "0";
      const count = parseInt(countStr);
      console.log(`[storage] Benutzer hat ${count} Adressen`);
      
      // 4. Wir erlauben das Löschen aller Adressen, auch wenn es die letzte oder Standardadresse ist
      console.log(`[storage] Adresse wird gelöscht, auch wenn sie die einzige oder Standardadresse ist`);
      // Keine Beschränkung mehr für das Löschen von Adressen
      
      // 5. Alles in einer Transaktion abwickeln
      return await db.transaction(async (tx: any) => {
        try {
          // a) Wenn es die Standardadresse ist, eine andere zur Standardadresse machen
          if (isDefault && count > 1) {
            console.log(`[storage] Finde eine andere Adresse als neuen Standard`);
            
            // Andere Adresse finden
            const otherAddress = await tx.execute(sql`
              SELECT id FROM addresses 
              WHERE user_id = ${userId} AND id != ${id}
              ORDER BY id DESC
              LIMIT 1
            `);
            
            if (otherAddress.rows && otherAddress.rows.length > 0) {
              const newDefaultId = otherAddress.rows[0].id;
              console.log(`[storage] Setze Adresse ID: ${newDefaultId} als neuen Standard`);
              
              // Alle auf false setzen
              await tx.execute(sql`
                UPDATE addresses SET is_default = false
                WHERE user_id = ${userId}
              `);
              
              // Neue Default-Adresse setzen
              await tx.execute(sql`
                UPDATE addresses SET is_default = true
                WHERE id = ${newDefaultId}
              `);
              
              console.log(`[storage] Neuer Standard gesetzt`);
            }
          }
          
          // b) Adresse löschen
          console.log(`[storage] Lösche Adresse ID: ${id}`);
          
          const deleteResult = await tx.execute(sql`
            DELETE FROM addresses WHERE id = ${id} RETURNING id
          `);
          
          if (!deleteResult.rows || deleteResult.rows.length === 0) {
            console.log(`[storage] Löschung fehlgeschlagen!`);
            return {
              success: false,
              message: "Die Adresse konnte nicht gelöscht werden."
            };
          }
          
          console.log(`[storage] Adresse ID: ${id} erfolgreich gelöscht`);
          return {
            success: true
          };
        } catch (txError) {
          console.error(`[storage] Transaktionsfehler:`, txError);
          return {
            success: false,
            message: "Fehler beim Löschen der Adresse."
          };
        }
      });
      
    } catch (error) {
      console.error(`[storage] Schwerwiegender Fehler beim Löschen der Adresse ID: ${id}:`, error);
      
      // Detaillierte Fehlermeldung, wenn möglich
      let errorMessage = "Die Adresse konnte nicht gelöscht werden.";
      
      if (error instanceof Error) {
        console.error(`[storage] Fehlerursache: ${error.message}`);
        
        // Wenn es sich um einen Fremdschlüssel-Constraint handelt
        if (error.message.includes('violates foreign key constraint')) {
          errorMessage = "Diese Adresse wird noch in anderen Teilen der Anwendung verwendet und kann nicht gelöscht werden.";
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }
  async setDefaultAddress(userId: number, addressId: number): Promise<boolean> {
    await db.update(addresses).set({isDefault: false}).where(eq(addresses.userId, userId));
    const result = await db.update(addresses).set({isDefault: true}).where(eq(addresses.id, addressId)).returning();
    return result.length > 0;
  }

  // Order methods
  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }
  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return db.select()
      .from(orders)
      .where(and(
        eq(orders.userId, userId),
        eq(orders.isDeleted, false) // Nur nicht gelöschte Bestellungen anzeigen
      ))
      .orderBy(desc(orders.createdAt));
  }
  async getAllOrders(): Promise<Order[]> {
    return db.select()
      .from(orders)
      .where(eq(orders.isDeleted, false)) // Nur nicht gelöschte Bestellungen anzeigen
      .orderBy(desc(orders.createdAt));
  }
  async getAllOrdersIncludingDeleted(): Promise<Order[]> {
    return db.select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
  }
  async createOrder(order: InsertOrder): Promise<Order> {
    const year = new Date().getFullYear();
    
    // Parametrisierte SQL-Abfrage mit korrekter yearPattern-Erstellung
    const yearPattern = `AC-${year}-%`;
    const result = await db.select({
      maxNum: sql`COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)), 0)`
    })
    .from(orders)
    .where(sql`order_number LIKE ${yearPattern}`);
    
    const maxNum = Number(result[0]?.maxNum) || 0;
    const nextNumber = maxNum + 1;
    const orderNumber = `AC-${year}-${String(nextNumber).padStart(4, '0')}`;
    
    const newOrder = {
      ...order, 
      orderNumber, 
      status: "new", 
      createdAt: new Date(), 
      isLocked: false, 
      suggestedDeliveryDate: null, 
      suggestedTimeSlot: null, 
      finalDeliveryDate: null, 
      finalTimeSlot: null
    };
    
    const [createdOrder] = await db.insert(orders).values(newOrder).returning();
    return createdOrder;
  }
  async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    const [updatedOrder] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }
  
  async cancelOrder(id: number): Promise<Order> {
    // Bestellung stornieren - ändert nur den Status auf "cancelled"
    const [canceledOrder] = await db.update(orders)
      .set({ 
        status: "cancelled",
        cancelledAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
      
    // Benachrichtigung für den Benutzer erstellen
    await this.createNotification({
      userId: canceledOrder.userId,
      type: "order_status_changed",
      message: `Ihre Bestellung ${canceledOrder.orderNumber} wurde storniert.`,
      relatedOrderId: canceledOrder.id,
      // Normalerweise sollte der aktuelle Benutzer hier angegeben werden,
      // aber wir haben keinen Zugriff auf die Benutzer-ID des Administrators
      triggeredByUserId: canceledOrder.userId,
    });
    
    return canceledOrder;
  }
  
  async deleteOrder(id: number): Promise<boolean> {
    // Bestellung löschen (Soft-Delete)
    const [deletedOrder] = await db.update(orders)
      .set({ 
        isDeleted: true
      })
      .where(eq(orders.id, id))
      .returning();
      
    if (deletedOrder) {
      // Benachrichtigung für den Benutzer erstellen
      await this.createNotification({
        userId: deletedOrder.userId,
        type: "order_deleted",
        message: `Ihre Bestellung ${deletedOrder.orderNumber} wurde gelöscht.`,
        relatedOrderId: deletedOrder.id,
        // Normalerweise sollte der aktuelle Benutzer hier angegeben werden,
        // aber wir haben keinen Zugriff auf die Benutzer-ID des Administrators
        triggeredByUserId: deletedOrder.userId,
      });
      
      return true;
    }
    
    return false;
  }
  
  async restoreOrder(id: number): Promise<Order | undefined> {
    // Gelöschte Bestellung wiederherstellen
    const [restoredOrder] = await db.update(orders)
      .set({ 
        isDeleted: false
      })
      .where(eq(orders.id, id))
      .returning();
      
    if (restoredOrder) {
      // Benachrichtigung für den Benutzer erstellen
      await this.createNotification({
        userId: restoredOrder.userId,
        type: "order_restored",
        message: `Ihre Bestellung ${restoredOrder.orderNumber} wurde wiederhergestellt.`,
        relatedOrderId: restoredOrder.id,
        // Normalerweise sollte der aktuelle Benutzer hier angegeben werden,
        // aber wir haben keinen Zugriff auf die Benutzer-ID des Administrators
        triggeredByUserId: restoredOrder.userId,
      });
      
      return restoredOrder;
    }
    
    return undefined;
  }

  // Order item methods
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    try {
      // Holen der OrderItems
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      
      // Für jedes OrderItem die zugehörigen Bilder abrufen
      const enrichedItems = await Promise.all(items.map(async (item: OrderItem) => {
        // Bilder für dieses OrderItem abrufen
        const images = await this.getProductImagesByOrderItemId(item.id);
        
        console.log(`Found ${images.length} images for orderItem ${item.id}`);
        
        // Wenn Bilder gefunden wurden, fügen wir sie immer hinzu (unabhängig vom aktuellen Format)
        if (images.length > 0) {
          // Bei mehreren Bildern MULTI-Format verwenden
          if (images.length > 1) {
            // Sortiere die Bilder nach sortOrder
            const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
            
            // Bilder in das MULTI-Format konvertieren
            const imageDataArray = sortedImages.map(img => ({
              url: img.imageUrl,
              isMain: img.isMain,
              order: img.sortOrder
            }));
            
            // Base64-Kodierung erstellen
            const jsonString = JSON.stringify(imageDataArray);
            const base64String = btoa(encodeURIComponent(jsonString));
            const multiFormat = `MULTI:${base64String}`;
            
            // OrderItem mit MULTI-Format aktualisieren
            item.imageUrl = multiFormat;
            
            // Das Hauptbild auch in filePath speichern
            const mainImage = sortedImages.find(img => img.isMain) || sortedImages[0];
            item.filePath = mainImage.imageUrl;
          } 
          // Einzelnes Bild direkt verwenden
          else {
            // Sicherstellen, dass sowohl imageUrl als auch filePath gesetzt sind
            item.imageUrl = images[0].imageUrl;
            item.filePath = images[0].imageUrl;
          }
          
          console.log(`Updated orderItem ${item.id} with image data`);
        } else {
          console.log(`No images found for orderItem ${item.id}`);
        }
        
        return item;
      }));
      
      return enrichedItems;
    } catch (error) {
      console.error("Error querying order items with images:", error);
      return [];
    }
  }
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const [orderItem] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return orderItem;
  }
  async createOrderItem(item: InsertOrderItem & { orderId: number }): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(item).returning();
    return newOrderItem;
  }
  async updateOrderItem(id: number, data: Partial<OrderItem>): Promise<OrderItem> {
    const [updatedOrderItem] = await db.update(orderItems).set(data).where(eq(orderItems.id, id)).returning();
    return updatedOrderItem;
  }
  async deleteOrderItem(id: number): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.id, id)).returning();
    return result.length > 0;
  }

  // Notification methods
  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }
  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count) || 0;
  }
  async createNotification(notification: InsertNotification): Promise<Notification> {
    // Stellen Sie sicher, dass Pflichtfelder gesetzt sind
    let triggeredByUserName = '';
    
    // Wenn es einen Auslöser gibt, dessen Namen abrufen
    if (notification.triggeredByUserId) {
      const triggerUser = await this.getUser(notification.triggeredByUserId);
      if (triggerUser) {
        triggeredByUserName = `${triggerUser.firstName} ${triggerUser.lastName}`;
      }
    }
    
    const newNotification = {
      ...notification, 
      createdAt: new Date(), 
      isRead: false,
      // Setze triggeredByUserId auf den aktuellen Benutzer, falls nicht explizit gesetzt
      triggeredByUserId: notification.triggeredByUserId || notification.userId,
      // Füge den Namen des Auslösers hinzu
      triggeredByUserName,
    };
    
    // Verhindern Sie doppelte Benachrichtigungen
    if (notification.relatedOrderId) {
      // Prüfen Sie, ob für diesen Benutzer und diese Bestellung bereits eine ähnliche Benachrichtigung existiert
      const existing = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, notification.userId),
            eq(notifications.type, notification.type),
            eq(notifications.relatedOrderId, notification.relatedOrderId),
            gte(notifications.createdAt, new Date(Date.now() - 5 * 60 * 1000)) // In den letzten 5 Minuten
          )
        );
      
      if (existing.length > 0) {
        console.log("Doppelte Benachrichtigung verhindert:", notification);
        return existing[0]; // Bestehende Benachrichtigung zurückgeben
      }
    }
    
    const [createdNotification] = await db.insert(notifications).values(newNotification).returning();
    return createdNotification;
  }
  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications).set({isRead: true}).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db.update(notifications).set({isRead: true}).where(eq(notifications.userId, userId)).returning();
    return result.length > 0;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }
  
  async deleteAllNotifications(userId: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.userId, userId)).returning();
    return result.length > 0;
  }

  // Cart methods
  async getActiveCart(userId: number): Promise<Cart | undefined> {
    const [cart] = await db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.userId, userId),
          eq(carts.isActive, true)
        )
      );
    return cart;
  }

  async createCart(cart: InsertCart): Promise<Cart> {
    const [newCart] = await db
      .insert(carts)
      .values(cart)
      .returning();
    return newCart;
  }

  async deactivateCart(cartId: number): Promise<boolean> {
    const [cart] = await db
      .update(carts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(carts.id, cartId))
      .returning();
    return !!cart;
  }

  async updateCart(cartId: number, data: Partial<Cart>): Promise<Cart> {
    const [updatedCart] = await db
      .update(carts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(carts.id, cartId))
      .returning();
    return updatedCart;
  }

  // Cart item methods
  async getCartItems(cartId: number): Promise<CartItem[]> {
    try {
      // Holen der CartItems
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));
      
      // Für jedes CartItem die zugehörigen Bilder abrufen
      const enrichedItems = await Promise.all(items.map(async (item: CartItem) => {
        // Bilder für dieses CartItem abrufen
        const images = await this.getProductImagesByCartItemId(item.id);
        
        console.log(`Found ${images.length} images for cartItem ${item.id}`);
        
        // Wenn Bilder gefunden wurden, fügen wir sie immer hinzu (unabhängig vom aktuellen Format)
        if (images.length > 0) {
          // Bei mehreren Bildern MULTI-Format verwenden
          if (images.length > 1) {
            // Sortiere die Bilder nach sortOrder
            const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
            
            // Bilder in das MULTI-Format konvertieren
            const imageDataArray = sortedImages.map(img => ({
              url: img.imageUrl,
              isMain: img.isMain,
              order: img.sortOrder
            }));
            
            // Base64-Kodierung erstellen
            const jsonString = JSON.stringify(imageDataArray);
            const base64String = btoa(encodeURIComponent(jsonString));
            const multiFormat = `MULTI:${base64String}`;
            
            // CartItem mit MULTI-Format aktualisieren
            item.imageUrl = multiFormat;
            
            // Setze auch den filePath auf das Hauptbild für Legacy-Unterstützung
            const mainImage = sortedImages.find(img => img.isMain) || sortedImages[0];
            (item as any).filePath = mainImage.imageUrl;
          } 
          // Einzelnes Bild direkt verwenden
          else {
            // Sicherstellen, dass sowohl imageUrl als auch filePath gesetzt sind
            item.imageUrl = images[0].imageUrl;
            (item as any).filePath = images[0].imageUrl;
          }
          
          console.log(`Updated cartItem ${item.id} with image data`);
        } else {
          console.log(`No images found for cartItem ${item.id}`);
        }
        
        return item;
      }));
      
      return enrichedItems;
    } catch (error) {
      console.error("Error querying cart items with images:", error);
      return [];
    }
  }

  async addCartItem(item: InsertCartItem): Promise<CartItem> {
    const [cartItem] = await db
      .insert(cartItems)
      .values(item)
      .returning();
    return cartItem;
  }

  async removeCartItem(itemId: number): Promise<boolean> {
    const [item] = await db
      .delete(cartItems)
      .where(eq(cartItems.id, itemId))
      .returning();
    return !!item;
  }

  async clearCart(cartId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.cartId, cartId)).returning();
    return result.length > 0;
  }
  
  // Order draft methods
  async getOrderDraft(userId: number): Promise<OrderDraft | undefined> {
    const [draft] = await db.select()
      .from(orderDrafts)
      .where(eq(orderDrafts.userId, userId));
    return draft;
  }
  
  async saveOrderDraft(draft: InsertOrderDraft): Promise<OrderDraft> {
    // Zuerst prüfen, ob bereits ein Entwurf existiert
    const existingDraft = await this.getOrderDraft(draft.userId);
    
    if (existingDraft) {
      // Wenn ja, aktualisieren
      return this.updateOrderDraft(draft.userId, draft);
    } else {
      // Wenn nicht, neu erstellen
      const [newDraft] = await db.insert(orderDrafts)
        .values({
          ...draft,
          updatedAt: new Date()
        })
        .returning();
      return newDraft;
    }
  }
  
  async updateOrderDraft(userId: number, data: Partial<OrderDraft>): Promise<OrderDraft> {
    const [updatedDraft] = await db.update(orderDrafts)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(orderDrafts.userId, userId))
      .returning();
    
    if (!updatedDraft) {
      // Falls noch kein Entwurf existiert, neu anlegen
      const [newDraft] = await db.insert(orderDrafts)
        .values({
          userId,
          ...data,
          updatedAt: new Date()
        } as InsertOrderDraft)
        .returning();
      return newDraft;
    }
    
    return updatedDraft;
  }
  
  async deleteOrderDraft(userId: number): Promise<boolean> {
    const result = await db.delete(orderDrafts)
      .where(eq(orderDrafts.userId, userId))
      .returning();
    return result.length > 0;
  }

  // Product image methods
  async getProductImagesByOrderItemId(orderItemId: number): Promise<ProductImage[]> {
    return db.select()
      .from(productImages)
      .where(eq(productImages.orderItemId, orderItemId))
      .orderBy(productImages.sortOrder);
  }

  async getProductImagesByCartItemId(cartItemId: number): Promise<ProductImage[]> {
    return db.select()
      .from(productImages)
      .where(eq(productImages.cartItemId, cartItemId))
      .orderBy(productImages.sortOrder);
  }

  async getProductImage(id: number): Promise<ProductImage | undefined> {
    const [image] = await db.select()
      .from(productImages)
      .where(eq(productImages.id, id));
    return image;
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    // Wenn es das erste Bild für dieses Item ist, setzen wir es als Hauptbild
    let isMain = false;
    
    if (image.orderItemId) {
      const existingImages = await this.getProductImagesByOrderItemId(image.orderItemId);
      isMain = existingImages.length === 0;
    } else if (image.cartItemId) {
      const existingImages = await this.getProductImagesByCartItemId(image.cartItemId);
      isMain = existingImages.length === 0;
    }
    
    // Bestimme sortOrder (die höchste vorhandene + 1 oder 0, wenn keine vorhanden)
    let sortOrder = 0;
    
    if (image.orderItemId) {
      const existingImages = await this.getProductImagesByOrderItemId(image.orderItemId);
      if (existingImages.length > 0) {
        sortOrder = Math.max(...existingImages.map(img => img.sortOrder)) + 1;
      }
    } else if (image.cartItemId) {
      const existingImages = await this.getProductImagesByCartItemId(image.cartItemId);
      if (existingImages.length > 0) {
        sortOrder = Math.max(...existingImages.map(img => img.sortOrder)) + 1;
      }
    }
    
    const [newImage] = await db.insert(productImages)
      .values({
        ...image,
        isMain,
        sortOrder,
        createdAt: new Date()
      })
      .returning();
    
    return newImage;
  }

  async updateProductImage(id: number, data: Partial<ProductImage>): Promise<ProductImage> {
    const [updatedImage] = await db.update(productImages)
      .set(data)
      .where(eq(productImages.id, id))
      .returning();
    return updatedImage;
  }

  async deleteProductImage(id: number): Promise<boolean> {
    // Zuerst das Bild abrufen, um Informationen zu haben
    const image = await this.getProductImage(id);
    if (!image) return false;

    const result = await db.delete(productImages)
      .where(eq(productImages.id, id))
      .returning();
    
    // Wenn das gelöschte Bild das Hauptbild war, müssen wir ein anderes Bild als Hauptbild festlegen
    if (image.isMain) {
      if (image.orderItemId) {
        const remainingImages = await this.getProductImagesByOrderItemId(image.orderItemId);
        if (remainingImages.length > 0) {
          await this.setMainProductImage(remainingImages[0].id);
        }
      } else if (image.cartItemId) {
        const remainingImages = await this.getProductImagesByCartItemId(image.cartItemId);
        if (remainingImages.length > 0) {
          await this.setMainProductImage(remainingImages[0].id);
        }
      }
    }
    
    return result.length > 0;
  }

  async setMainProductImage(id: number): Promise<boolean> {
    // Zuerst das Bild abrufen, um Informationen zu haben
    const image = await this.getProductImage(id);
    if (!image) return false;

    // Alle Bilder, die zum selben Item gehören, als nicht-Hauptbild markieren
    if (image.orderItemId) {
      await db.update(productImages)
        .set({ isMain: false })
        .where(eq(productImages.orderItemId, image.orderItemId));
    } else if (image.cartItemId) {
      await db.update(productImages)
        .set({ isMain: false })
        .where(eq(productImages.cartItemId, image.cartItemId));
    }

    // Dann das gewünschte Bild als Hauptbild markieren
    const [updatedImage] = await db.update(productImages)
      .set({ isMain: true })
      .where(eq(productImages.id, id))
      .returning();
    
    return !!updatedImage;
  }
}

export const storage = new DatabaseStorage();