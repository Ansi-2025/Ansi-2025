ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS url_previa_segunda_versao TEXT DEFAULT NULL;
