ALTER TABLE "notifications" ADD COLUMN "triggered_by_user_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp;