import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  birthDate: timestamp("birth_date").notNull(),
  role: text("role").default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  showOrderInstructions: boolean("show_order_instructions").default(true).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Address table
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name"),
  fullName: text("full_name").notNull(),
  street: text("street").notNull(),
  houseNumber: text("house_number").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  additionalInfo: text("additional_info"),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
});

// Order table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  desiredDeliveryDate: timestamp("desired_delivery_date").notNull(),
  desiredTimeSlot: text("desired_time_slot").notNull(),
  suggestedDeliveryDate: timestamp("suggested_delivery_date"),
  suggestedTimeSlot: text("suggested_time_slot"),
  finalDeliveryDate: timestamp("final_delivery_date"),
  finalTimeSlot: text("final_time_slot"),
  addressId: integer("address_id").notNull().references(() => addresses.id),
  // Kopierte Adressdetails für Bestellungen
  addressFullName: text("address_full_name"),
  addressStreet: text("address_street"),
  addressHouseNumber: text("address_house_number"),
  addressPostalCode: text("address_postal_code"),
  addressCity: text("address_city"),
  addressAdditionalInfo: text("address_additional_info"),
  additionalInstructions: text("additional_instructions"),
  isLocked: boolean("is_locked").default(false).notNull(),
  store: text("store").notNull().default(""),
  isDeleted: boolean("is_deleted").default(false).notNull(), // Flag for soft-delete
  cancelledAt: timestamp("cancelled_at"), // Zeitpunkt der Stornierung
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  suggestedDeliveryDate: true,
  suggestedTimeSlot: true,
  finalDeliveryDate: true,
  finalTimeSlot: true,
  isLocked: true,
  isDeleted: true,
  cancelledAt: true,
});

// Product image table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  filePath: text("file_path").default("").notNull(),  // Using default empty string to satisfy notNull constraint
  orderItemId: integer("order_item_id"),
  cartItemId: integer("cart_item_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isMain: boolean("is_main").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const insertProductImageSchema = createInsertSchema(productImages).omit({
  id: true,
  createdAt: true,
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productName: text("product_name").notNull(),
  quantity: text("quantity").notNull(),
  store: text("store").notNull(),
  notes: text("notes"),
  // Legacy fields for backward compatibility
  imageUrl: text("image_url"),
  filePath: text("file_path"),
  // New field to store multiple images as JSON
  imageUrls: json("image_urls").$type<string[]>(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  orderId: true,
  imageUrls: true,
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  relatedOrderId: integer("related_order_id").references(() => orders.id),
  triggeredByUserId: integer("triggered_by_user_id").references(() => users.id),
  triggeredByUserName: text("triggered_by_user_name"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Cart table for saving temporary orders
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  store: text("store").default(""),
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id),
  productName: text("product_name").notNull(),
  quantity: text("quantity").notNull(),
  store: text("store").notNull(),
  notes: text("notes"),
  // Legacy field for backward compatibility
  imageUrl: text("image_url"),
  // Das filePath Feld wird nicht mehr verwendet und fehlt in der Datenbank
  // imageUrls wird auch noch nicht in der Datenbank verwendet
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

// Zod schemas
export const timeSlotSchema = z.enum(["morning", "afternoon", "evening"]);
export const orderStatusSchema = z.enum([
  "new", 
  "processing", 
  "completed", 
  "cancelled",
  "deleted", // Vom Admin gelöscht (für Kunden nicht mehr sichtbar)
  "pending_admin_review", // Kunde hat Gegenvorschlag eingesendet
  "pending_customer_review", // Admin hat Gegenvorschlag eingesendet
  "date_forced", // Admin hat Termin festgelegt
  "date_accepted" // Kunde hat Termin akzeptiert
]);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertProductImage = z.infer<typeof insertProductImageSchema>;
export type ProductImage = typeof productImages.$inferSelect;

// Erweitertes Schema für die Verwendung in der Benutzeroberfläche, das mehrere Bilder unterstützt
export const productWithImagesSchema = z.object({
  productName: z.string().min(1, { message: "Produktname ist erforderlich" }),
  quantity: z.string().min(1, { message: "Menge ist erforderlich" }),
  store: z.string(),
  notes: z.string().optional(),
  // Legacy-Felder für Abwärtskompatibilität
  imageUrl: z.string().optional(),
  filePath: z.string().optional(),
  // Neues Feld für mehrere Bilder
  images: z.array(z.string()).optional(),
});

export type ProductWithImages = z.infer<typeof productWithImagesSchema>;

// Order draft table (speichern von unvollständigen Bestellungen)
export const orderDrafts = pgTable("order_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  addressId: integer("address_id").references(() => addresses.id),
  desiredDeliveryDate: timestamp("desired_delivery_date"),
  desiredTimeSlot: text("desired_time_slot"),
  additionalInstructions: text("additional_instructions"),
  store: text("store"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderDraftSchema = createInsertSchema(orderDrafts).omit({
  id: true,
  updatedAt: true,
});

export type InsertOrderDraft = z.infer<typeof insertOrderDraftSchema>;
export type OrderDraft = typeof orderDrafts.$inferSelect;