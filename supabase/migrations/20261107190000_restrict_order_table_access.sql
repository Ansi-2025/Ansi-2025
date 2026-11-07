-- Os pedidos e o histórico são acessados pelas funções de servidor, que
-- validam o token do pedido ou a sessão administrativa antes de consultar.
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an order" ON public.pedidos;
DROP POLICY IF EXISTS "Public can read pedidos for tracking" ON public.pedidos;
DROP POLICY IF EXISTS "Clientes veem seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Public can read status history" ON public.status_history;
DROP POLICY IF EXISTS "Público lê histórico de status" ON public.status_history;

REVOKE ALL ON TABLE public.pedidos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.status_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pedidos TO service_role;
GRANT ALL ON TABLE public.status_history TO service_role;
