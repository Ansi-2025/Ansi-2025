ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cpf_cliente text;

COMMENT ON COLUMN public.pedidos.cpf_cliente IS 'CPF do cliente para identificação e confirmação do pagamento.';
