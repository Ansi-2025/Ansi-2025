-- Adicionar campos necessários para o fluxo automatizado de criação de música
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS nome_cliente TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_cliente TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telefone_cliente TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS genero_musical TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_segundos INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS roteiro_ia TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suno_job_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_pix TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ DEFAULT NULL;

-- Aplicar apenas se a tabela existir para evitar falha em ambientes sem a tabela
ALTER TABLE IF EXISTS public.pedidos
  ALTER COLUMN duracao_segundos SET NOT NULL,
  ALTER COLUMN duracao_segundos SET DEFAULT 45;

-- Recomenda-se verificar antes de rodar:
-- SELECT to_regclass('public.pedidos');
-- SELECT DISTINCT status FROM public.pedidos LIMIT 10;
