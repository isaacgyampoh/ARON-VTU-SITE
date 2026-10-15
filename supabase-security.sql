-- ============================================================
-- SECURITY MIGRATION — run this once in the Supabase SQL editor
-- ============================================================
--
-- WHY THIS EXISTS
--
-- Every table was created with a policy of the form
--
--     CREATE POLICY "Service full access orders" ON orders FOR ALL USING (true);
--
-- The name says "service", but a policy with no TO clause applies to EVERY
-- role — including `anon`, the role behind the public NEXT_PUBLIC_SUPABASE_
-- ANON_KEY that shipped in the browser bundle. Anyone who opened the site could
-- read every order and customer phone number, read vendor_apis.api_key and
-- app_settings.vendor_api_key, and update or delete any row.
--
-- The service role key bypasses row level security altogether, so the app does
-- not need these policies at all. Dropping them shuts the public key out while
-- leaving the server's own access untouched.
--
-- Run it, then confirm with the SELECT at the bottom that no policies remain.
-- ============================================================

BEGIN;

-- ── 1. Remove the policies that let the public key in ──────────────────

DROP POLICY IF EXISTS "Service full access networks"  ON networks;
DROP POLICY IF EXISTS "Service full access plans"     ON data_plans;
DROP POLICY IF EXISTS "Service full access vendors"   ON vendor_apis;
DROP POLICY IF EXISTS "Service full access orders"    ON orders;
DROP POLICY IF EXISTS "Service full access customers" ON customers;
DROP POLICY IF EXISTS "Service full access logs"      ON admin_logs;
DROP POLICY IF EXISTS "app_settings_all"              ON app_settings;

-- The shop is rendered on the server now and selects its own columns, so the
-- browser no longer needs to read these tables directly. Dropping the public
-- read on data_plans is what stops visitors seeing cost_price, and with it the
-- margin on every bundle.
DROP POLICY IF EXISTS "Public read networks" ON networks;
DROP POLICY IF EXISTS "Public read plans"    ON data_plans;

-- ── 2. Row level security on, with no policy = deny for anon ───────────

ALTER TABLE networks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_apis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Belt and braces: take the table grants away too, so a future policy added by
-- accident cannot re-open these to the public key on its own.
REVOKE ALL ON networks, data_plans, vendor_apis, orders, customers, admin_logs, app_settings
  FROM anon, authenticated;

-- ── 3. Atomic customer totals ──────────────────────────────────────────
--
-- The webhook used to read the customer row, add one, and write it back. Two
-- payments landing together could each read the same total and one increment
-- would be lost. This does it in a single statement.

CREATE OR REPLACE FUNCTION record_customer_purchase(
  p_phone   TEXT,
  p_network TEXT,
  p_amount  NUMERIC
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO customers (phone, network, total_purchases, total_spent, last_purchase_at, first_seen_at)
  VALUES (p_phone, p_network, 1, p_amount, NOW(), NOW())
  ON CONFLICT (phone) DO UPDATE SET
    total_purchases  = customers.total_purchases + 1,
    total_spent      = customers.total_spent + EXCLUDED.total_spent,
    last_purchase_at = NOW(),
    network          = EXCLUDED.network;
$$;

REVOKE ALL ON FUNCTION record_customer_purchase(TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;

-- ── 4. Indexes the money path actually uses ────────────────────────────

-- Every Paystack webhook looks an order up by this column, and it must be
-- unique for that lookup to be safe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paystack_ref ON orders(paystack_ref)
  WHERE paystack_ref IS NOT NULL;

-- "Fix stuck orders" and the admin filters scan on these.
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status  ON orders(vendor_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone_created  ON orders(phone, created_at DESC);

COMMIT;

-- ── 5. Confirm ─────────────────────────────────────────────────────────
-- Expect ZERO rows. Any row here is a table the public key can still reach.
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
