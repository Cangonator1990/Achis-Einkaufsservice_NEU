-- Füge triggered_by_user_name Spalte zur notifications Tabelle hinzu
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS triggered_by_user_name TEXT;