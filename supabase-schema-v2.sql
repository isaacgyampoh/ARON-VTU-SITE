-- Add streaming support to existing schema
-- Run this AFTER the initial schema

-- Add category to data_plans
ALTER TABLE data_plans ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'data';

-- Add streaming networks
INSERT INTO networks (name, code, is_active) VALUES 
  ('Netflix', 'netflix', true),
  ('Apple Music', 'applemusic', true),
  ('Apple TV', 'appletv', true),
  ('Apple Arcade', 'applegames', true),
  ('iCloud Storage', 'icloud', true),
  ('Amazon Prime', 'amazon', true)
ON CONFLICT (code) DO NOTHING;

-- Update existing networks to have a type
ALTER TABLE networks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'data';

UPDATE networks SET type = 'streaming' WHERE code IN ('netflix', 'applemusic', 'appletv', 'applegames', 'icloud', 'amazon');
UPDATE networks SET type = 'data' WHERE code IN ('mtn', 'telecel', 'at');
