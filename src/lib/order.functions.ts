import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { criarPedidoAutomatizado, type PedidoEntrada } from "@/lib/pedido.service";

const OrderSchema = z.object({
  nome_cliente: z.string().trim().min(2).max(120),
  email_cliente: z.string().email(),
  telefone_cliente: z.string().trim().min(8).max(30),
  descricao: z.string().trim().min(30).max(2000),
  genero_musical: z.string().trim().min(2).max(80),
  duracao_segundos: z.number().int().min(10).max(600),
});

export const STATUS_FLOW = [
  "recebido",
  "criando_sua_musica",
  "musica_criada",
  "em_producao",
  "em_revisao",
  "pronto",
  "previa",
  "pagamento",
  "entregue",
] as const;
export type PedidoStatus = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<PedidoStatus, string> = {
  recebido: "Recebido",
  criando_sua_musica: "Criando sua música",
  musica_criada: "Música criada",
  em_producao: "Em produção",
  em_revisao: "Em revisão",
  pronto: "Música pronta",
  previa: "Prévia (45 segundos)",
  pagamento: "Aguardando pagamento",
  entregue: "Entregue",
};

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const pedidoData: PedidoEntrada = data;
    const result = await criarPedidoAutomatizado(pedidoData);
    return { ok: true, id: result.id };
  });

export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        "id, nome_cliente, email_cliente, telefone_cliente, genero_musical, duracao_segundos, descricao, status, url_previa, url_musica, pix_qr_code, pix_fixado, valor_pix, pago_em, created_at, status_atualizado_em",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pedido não encontrado.");
    return row as {
      id: string;
      nome_cliente: string;
      email_cliente: string;
      telefone_cliente: string;
      genero_musical: string;
      duracao_segundos: number;
      descricao: string;
      status: PedidoStatus;
      url_previa: string | null;
      url_musica: string | null;
      pix_qr_code: string | null;
      pix_fixado: boolean;
      valor_pix: string | null;
      pago_em: string | null;
      created_at: string;
      status_atualizado_em: string;
    };
  });

export const getOrderStatusHistory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("status_history")
      .select("*")
      .eq("pedido_id", data.id)
      .order("criado_em", { ascending: false });

    if (error) throw new Error(error.message);
    return rows as Array<{
      id: string;
      pedido_id: string;
      status_anterior: string | null;
      status_novo: string;
      admin_user: string | null;
      mensagem_whatsapp: string | null;
      criado_em: string;
    }>;
  });
