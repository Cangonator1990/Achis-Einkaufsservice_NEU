-- Erstellen der Tabelle "users"
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone_number" TEXT,
  "birth_date" TIMESTAMP NOT NULL,
  "role" TEXT DEFAULT 'user' NOT NULL,
  "is_active" BOOLEAN DEFAULT true NOT NULL
);

-- Erstellen der Tabelle "addresses"
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "name" TEXT,
  "full_name" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "house_number" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "additional_info" TEXT,
  "is_default" BOOLEAN DEFAULT false NOT NULL
);

-- Erstellen der Tabelle "orders"
CREATE TABLE IF NOT EXISTS "orders" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "order_number" TEXT NOT NULL UNIQUE,
  "status" TEXT DEFAULT 'new' NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "desired_delivery_date" TIMESTAMP NOT NULL,
  "desired_time_slot" TEXT NOT NULL,
  "suggested_delivery_date" TIMESTAMP,
  "suggested_time_slot" TEXT,
  "final_delivery_date" TIMESTAMP,
  "final_time_slot" TEXT,
  "address_id" INTEGER NOT NULL REFERENCES "addresses"("id"),
  "address_full_name" TEXT,
  "address_street" TEXT,
  "address_house_number" TEXT,
  "address_postal_code" TEXT,
  "address_city" TEXT,
  "address_additional_info" TEXT,
  "additional_instructions" TEXT,
  "is_locked" BOOLEAN DEFAULT false NOT NULL,
  "store" TEXT DEFAULT '' NOT NULL
);

-- Erstellen der Tabelle "product_images"
CREATE TABLE IF NOT EXISTS "product_images" (
  "id" SERIAL PRIMARY KEY,
  "image_url" TEXT NOT NULL,
  "file_path" TEXT DEFAULT '' NOT NULL,
  "order_item_id" INTEGER,
  "cart_item_id" INTEGER,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "is_main" BOOLEAN DEFAULT false NOT NULL,
  "sort_order" INTEGER DEFAULT 0 NOT NULL
);

-- Erstellen der Tabelle "order_items"
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" SERIAL PRIMARY KEY,
  "order_id" INTEGER NOT NULL REFERENCES "orders"("id"),
  "product_name" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "store" TEXT NOT NULL,
  "notes" TEXT,
  "image_url" TEXT,
  "file_path" TEXT,
  "image_urls" JSON
);

-- Erstellen der Tabelle "notifications"
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "related_order_id" INTEGER REFERENCES "orders"("id"),
  "is_read" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Erstellen der Tabelle "carts"
CREATE TABLE IF NOT EXISTS "carts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "is_active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "store" TEXT DEFAULT ''
);

-- Erstellen der Tabelle "cart_items"
CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" SERIAL PRIMARY KEY,
  "cart_id" INTEGER NOT NULL REFERENCES "carts"("id"),
  "product_name" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "store" TEXT NOT NULL,
  "notes" TEXT,
  "image_url" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Erstellen der Tabelle "order_drafts"
CREATE TABLE IF NOT EXISTS "order_drafts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "address_id" INTEGER REFERENCES "addresses"("id"),
  "desired_delivery_date" TIMESTAMP,
  "desired_time_slot" TEXT,
  "additional_instructions" TEXT,
  "store" TEXT,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);