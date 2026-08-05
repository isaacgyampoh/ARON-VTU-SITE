-- ============================================================
-- VENDOR SETTINGS — switch vendors, or turn automatic buying off
-- ============================================================
-- Lets the vendor API key and address be changed from the admin at any time,
-- and lets automatic fulfilment be switched off so orders are simply recorded
-- for someone to buy by hand.
--
-- Run once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_all" ON app_settings;
CREATE POLICY "app_settings_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Defaults. auto_fulfil = 'on' keeps today's behaviour.
INSERT INTO app_settings (key, value) VALUES
  ('auto_fulfil',      'on'),
  ('vendor_api_key',   ''),
  ('vendor_base_url',  'https://www.xpresportal.app/api/v1'),
  ('vendor_name',      'Xpres Portal')
ON CONFLICT (key) DO NOTHING;

SELECT key, CASE WHEN key = 'vendor_api_key' AND value <> '' THEN '(set)' ELSE value END AS value
FROM app_settings ORDER BY key;
