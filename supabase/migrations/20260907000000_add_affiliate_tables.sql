CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS affiliate_source TEXT NULL,
  ADD COLUMN IF NOT EXISTS affiliate_click_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS affiliate_commission_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_commission_status TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.30,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_commissions NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  source TEXT,
  url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.pedidos(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  source TEXT,
  click_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.pedidos(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code
  ON public.affiliates (code);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_created
  ON public.affiliate_clicks (affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_affiliate_created
  ON public.affiliate_attributions (affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_created
  ON public.affiliate_commissions (affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_affiliate_code
  ON public.pedidos (affiliate_code);
