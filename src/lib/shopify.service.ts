import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createShopifyCheckout } from "@/integrations/shopify/client";

export async function criarCheckoutShopify(pedidoId: string) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, nome_cliente, email_cliente, telefone_cliente, genero_musical, descricao, status")
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar pedido: ${error.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  if (!["letra_aprovada", "previa", "pagamento"].includes(pedido.status)) {
    throw new Error("O pedido precisa ter a letra aprovada antes de criar o checkout.");
  }

  const checkout = await createShopifyCheckout({
    variantId: process.env.SHOPIFY_VARIANT_ID,
    quantity: 1,
    customAttributes: [
      { key: "pedido_id", value: pedidoId },
      { key: "nome_cliente", value: pedido.nome_cliente ?? "Cliente Shopify" },
      { key: "genero_musical", value: pedido.genero_musical ?? "Gospel" },
    ],
  });

  const agora = new Date().toISOString();

  const { data: updatedPedido, error: updateError } = await supabaseAdmin
    .from("pedidos")
    .update({
      shopify_checkout_id: checkout.checkoutId,
      shopify_payment_status: null,
      status: "pagamento",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (updateError || !updatedPedido) {
    throw new Error(`Falha ao salvar checkout do pedido: ${updateError?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: pedido.status,
    status_novo: "pagamento",
    mensagem_whatsapp: "Checkout Shopify criado e aguardando pagamento",
    criado_em: agora,
  });

  return {
    checkoutUrl: checkout.checkoutUrl,
    checkoutId: checkout.checkoutId,
    status: updatedPedido.status,
  };
}
