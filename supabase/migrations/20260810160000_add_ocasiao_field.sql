-- Adicionar o campo de ocasião que o fluxo do pedido usa
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS ocasiao TEXT DEFAULT NULL;

-- Garante que o campo de destino do pedido também exista em bases antigas
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS para_quem TEXT DEFAULT NULL;
