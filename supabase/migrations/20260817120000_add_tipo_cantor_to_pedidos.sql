ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_cantor TEXT DEFAULT 'feminino';

COMMENT ON COLUMN public.pedidos.tipo_cantor IS 'Voz preferida para a música gerada: feminino ou masculino.';
