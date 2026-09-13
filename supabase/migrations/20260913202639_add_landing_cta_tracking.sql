-- Tabela para rastreamento de visitas ao landing (deduplicação e auditoria)
CREATE TABLE IF NOT EXISTS public.landing_cta_tracking (
  id BIGSERIAL PRIMARY KEY,
  browser_fingerprint VARCHAR(128) NOT NULL,
  client_ip VARCHAR(255) NOT NULL,
  button_label VARCHAR(255),
  source VARCHAR(255) NOT NULL,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_landing_cta_fingerprint_source_created 
  ON public.landing_cta_tracking(browser_fingerprint, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_cta_client_ip_created 
  ON public.landing_cta_tracking(client_ip, created_at DESC);

-- Política de RLS (apenas para leitura do admin se necessário)
ALTER TABLE public.landing_cta_tracking ENABLE ROW LEVEL SECURITY;

-- Ninguém pode acessar via cliente (apenas via server function)
CREATE POLICY "no_select_landing_cta_tracking" 
  ON public.landing_cta_tracking 
  FOR SELECT 
  USING (false);

CREATE POLICY "no_delete_landing_cta_tracking" 
  ON public.landing_cta_tracking 
  FOR DELETE 
  USING (false);

-- Apenas servidor pode inserir (via função server ou API com permissão SERVICE_ROLE)
-- Comentar a política de INSERT para permitir via server function:
-- CREATE POLICY "server_insert_landing_cta_tracking" 
--   ON public.landing_cta_tracking 
--   FOR INSERT 
--   WITH CHECK (true);
