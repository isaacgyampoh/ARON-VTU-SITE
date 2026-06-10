-- Run this in Supabase SQL Editor to add missing columns
-- Go to: Supabase Dashboard → SQL Editor → New Query → paste and run

ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_plan_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_api_used text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_response jsonb;

-- Confirm columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;
