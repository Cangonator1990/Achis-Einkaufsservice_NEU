CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"file_path" text DEFAULT '' NOT NULL,
	"order_item_id" integer,
	"cart_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "file_path" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "image_urls" json;