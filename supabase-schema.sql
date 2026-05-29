-- ARON VTU Database Schema
-- Run this in Supabase SQL Editor

-- Networks
CREATE TABLE networks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO networks (name, code) VALUES 
  ('MTN', 'mtn'),
  ('Telecel', 'telecel'),
  ('AirtelTigo', 'at');

-- Data Plans
CREATE TABLE data_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_amount TEXT NOT NULL,
  validity TEXT NOT NULL DEFAULT '30 days',
  selling_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  vendor_plan_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor APIs
CREATE TABLE vendor_apis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  purchase_endpoint TEXT NOT NULL DEFAULT '/purchase',
  headers JSONB DEFAULT '{}',
  request_format JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'untested',
  last_tested_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  network TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  data_amount TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  paystack_ref TEXT,
  payment_status TEXT DEFAULT 'pending',
  vendor_status TEXT DEFAULT 'pending',
  vendor_response JSONB,
  vendor_api_used TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

-- Customers (for SMS marketing)
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  network TEXT,
  total_purchases INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin logs
CREATE TABLE admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  admin_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Public read for networks and plans
CREATE POLICY "Public read networks" ON networks FOR SELECT USING (true);
CREATE POLICY "Public read plans" ON data_plans FOR SELECT USING (is_active = true);

-- Service role full access (used by API routes)
CREATE POLICY "Service full access networks" ON networks FOR ALL USING (true);
CREATE POLICY "Service full access plans" ON data_plans FOR ALL USING (true);
CREATE POLICY "Service full access vendors" ON vendor_apis FOR ALL USING (true);
CREATE POLICY "Service full access orders" ON orders FOR ALL USING (true);
CREATE POLICY "Service full access customers" ON customers FOR ALL USING (true);
CREATE POLICY "Service full access logs" ON admin_logs FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_orders_phone ON orders(phone);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_plans_network ON data_plans(network_id);
