-- Add missing pedido_status values and new fields for lyric approval, Suno metadata, and preview timestamps
DO $$ BEGIN
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'gerando_letra';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'letra_pronta';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'aguardando_aprovacao_letra';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'letra_aprovada';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'gerando_musica';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'musica_pronta';
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'pago';
END $$;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS letra_gerada TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS letra_aprovada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suno_task_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preview_gerada_em TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS musica_gerada_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;