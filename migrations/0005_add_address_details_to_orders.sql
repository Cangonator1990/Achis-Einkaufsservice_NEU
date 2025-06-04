-- Add address details columns to orders table to store address information directly
ALTER TABLE orders 
  ADD COLUMN address_full_name TEXT,
  ADD COLUMN address_street TEXT,
  ADD COLUMN address_house_number TEXT,
  ADD COLUMN address_postal_code TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN address_additional_info TEXT;

-- Update existing orders with address data
UPDATE orders o
SET 
  address_full_name = a.full_name,
  address_street = a.street,
  address_house_number = a.house_number,
  address_postal_code = a.postal_code,
  address_city = a.city,
  address_additional_info = a.additional_info
FROM addresses a
WHERE o.address_id = a.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_address_id ON orders(address_id);