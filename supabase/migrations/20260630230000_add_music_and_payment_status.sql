-- Recriar o tipo ENUM com os novos status
DO $$ BEGIN
  -- Criar nova versão do enum
  CREATE TYPE public.pedido_status_new AS ENUM ('recebido', 'em_producao', 'em_revisao', 'pronto', 'previa', 'pagamento', 'entregue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adicionar novas colunas para URL da prévia e música final
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS url_previa TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS url_musica TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT DEFAULT NULL;

-- Criar bucket para armazenar músicas
INSERT INTO storage.buckets (id, name, public)
  VALUES ('musicas', 'musicas', true)
  ON CONFLICT (id) DO NOTHING;

-- Configurar políticas RLS para o bucket de músicas
DROP POLICY IF EXISTS "Public can view musicas" ON storage.objects;
CREATE POLICY "Public can view musicas"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'musicas');

DROP POLICY IF EXISTS "Service role can upload musicas" ON storage.objects;
CREATE POLICY "Service role can upload musicas"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'musicas');

DROP POLICY IF EXISTS "Service role can delete musicas" ON storage.objects;
CREATE POLICY "Service role can delete musicas"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'musicas');
