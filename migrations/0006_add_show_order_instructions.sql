-- Add the show_order_instructions column to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_order_instructions BOOLEAN NOT NULL DEFAULT TRUE;

-- Update all existing users to have this setting enabled by default
UPDATE users SET show_order_instructions = TRUE WHERE show_order_instructions IS NULL;