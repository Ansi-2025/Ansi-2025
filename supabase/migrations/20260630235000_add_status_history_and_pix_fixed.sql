-- Garantir que as colunas existem na tabela pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS url_previa TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS url_musica TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_fixado BOOLEAN DEFAULT false;

-- Criar tabela de histórico de mudanças de status
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  admin_user TEXT,
  mensagem_whatsapp TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para buscar histórico por pedido
CREATE INDEX IF NOT EXISTS idx_status_history_pedido_id ON public.status_history(pedido_id);

-- Configurar RLS para status_history
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read status history" ON public.status_history;
CREATE POLICY "Public can read status history"
  ON public.status_history FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage status history" ON public.status_history;
CREATE POLICY "Service role can manage status history"
  ON public.status_history FOR ALL
  TO service_role
  WITH CHECK (true);
