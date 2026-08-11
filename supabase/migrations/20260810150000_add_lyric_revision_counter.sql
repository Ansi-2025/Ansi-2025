-- Adicionar o contador de revisões da letra que o fluxo de aprovação usa
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS letra_refazer_contador INTEGER NOT NULL DEFAULT 0;

-- Também garante que pedidos antigos não tenham valores nulos
UPDATE public.pedidos
SET letra_refazer_contador = 0
WHERE letra_refazer_contador IS NULL;
