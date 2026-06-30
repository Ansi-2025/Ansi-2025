
DO $$ BEGIN
  CREATE TYPE public.pedido_status AS ENUM ('recebido','em_producao','em_revisao','pronto','entregue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS status public.pedido_status NOT NULL DEFAULT 'recebido',
  ADD COLUMN IF NOT EXISTS status_atualizado_em timestamptz NOT NULL DEFAULT now();

-- Allow public read of status by id (cliente consulta pelo código do pedido)
GRANT SELECT ON public.pedidos TO anon;

DROP POLICY IF EXISTS "Public can read pedidos for tracking" ON public.pedidos;
CREATE POLICY "Public can read pedidos for tracking"
ON public.pedidos FOR SELECT
TO anon, authenticated
USING (true);
