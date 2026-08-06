-- Migração para corrigir o enum pedido_status e adicionar "previa"

-- Estratégia: Criar novo enum com todos os valores, converter dados, dropar antigo, renomear novo

-- 1. Criar novo tipo enum com todos os status corretos
CREATE TYPE public.pedido_status_corrected AS ENUM (
  'recebido',
  'em_producao',
  'em_revisao',
  'pronto',
  'previa',
  'pagamento',
  'entregue'
);

-- 2. Alterar coluna para usar novo enum
-- Antes de alterar o tipo, remover o DEFAULT existente para evitar erro
ALTER TABLE public.pedidos
  ALTER COLUMN status DROP DEFAULT;

-- (Opcional) Verificar valores existentes compatíveis com o novo enum:
-- SELECT DISTINCT status FROM public.pedidos;
-- Caso haja valores incompatíveis, atualize-os manualmente, por exemplo:
-- UPDATE public.pedidos SET status = 'recebido' WHERE status NOT IN ('recebido','em_producao','em_revisao','pronto','previa','pagamento','entregue');

-- Agora alterar o tipo usando cast via text
ALTER TABLE public.pedidos
  ALTER COLUMN status TYPE public.pedido_status_corrected
  USING status::text::public.pedido_status_corrected;

-- 3. Dropar enum antigo
DROP TYPE IF EXISTS public.pedido_status;

-- 4. Renomear novo enum para o nome original
ALTER TYPE public.pedido_status_corrected RENAME TO pedido_status;

-- 5. Garantir defaults e constraints
ALTER TABLE public.pedidos
  ALTER COLUMN status SET DEFAULT 'recebido'::public.pedido_status,
  ALTER COLUMN status SET NOT NULL;

-- Nota: se você administrar migrations manualmente, confirme os passos acima
-- em um ambiente de staging antes de aplicar em produção.
