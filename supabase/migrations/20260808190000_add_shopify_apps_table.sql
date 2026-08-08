CREATE TABLE IF NOT EXISTS public.shopify_apps (
  store_domain TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
