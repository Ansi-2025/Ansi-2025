import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { atualizarDadosClientePedido, criarPedido, gerarLetraPedido, marcarLetraAprovada, refazerLetraPedido, type PedidoEntrada } from "@/lib/pedido.service";
import { criarCheckoutStripe, criarPaymentIntentStripe } from "@/lib/stripe.service";
import { isValidPersonName } from "@/lib/utils";

const ORDER_ACCESS_SECRET = process.env.ORDER_ACCESS_SECRET ?? process.env.APP_SECRET ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.STRIPE_SECRET_KEY ?? "dev-order-access-secret";

if (
  !process.env.ORDER_ACCESS_SECRET &&
  !process.env.APP_SECRET &&
  !process.env.SUPABASE_SERVICE_ROLE &&
  !process.env.STRIPE_SECRET_KEY
) {
  console.warn("[order-security] ORDER_ACCESS_SECRET não configurada em produção. Defina ORDER_ACCESS_SECRET para reforçar o controle de acesso ao pedido.");
}

function generateOrderAccessToken(orderId: string) {
  return createHmac("sha256", ORDER_ACCESS_SECRET).update(orderId).digest("hex");
}

function validateOrderAccess(orderId: string, token?: string | null) {
  if (!token) {
    throw new Error("Token de acesso do pedido inválido. Reabra o link do acompanhamento do pedido.");
  }

  const expected = generateOrderAccessToken(orderId);
  if (token.length !== expected.length) {
    throw new Error("Token de acesso do pedido inválido.");
  }

  const provided = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (!timingSafeEqual(provided, expectedBuffer)) {
    throw new Error("Token de acesso do pedido inválido.");
  }
}

const orderIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "Código do pedido inválido.")
  .transform((value) => value.trim());

const OrderSchema = z
  .object({
    nome_cliente: z
      .string()
      .trim()
      .max(120)
      .refine((value) => isValidPersonName(value), {
        message: "Informe um nome real para continuar.",
      }),
    email_cliente: z.preprocess(
      (value) => {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed === "" ? undefined : trimmed;
        }
        return value;
      },
      z.string().email().optional().nullable(),
    ),
    telefone_cliente: z.preprocess(
      (value) => {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed === "" ? undefined : trimmed;
        }
        return value;
      },
      z.string().trim().min(10, "Informe um WhatsApp válido.").max(30),
    ),
    cpf_cliente: z.preprocess(
      (value) => {
        if (typeof value === "string") {
          const digits = value.replace(/\D/g, "");
          return digits === "" ? undefined : digits;
        }
        return value;
      },
      z.string().trim().min(11).max(14).optional().nullable(),
    ),
    para_quem: z.string().trim().min(2).max(120),
    ocasiao: z.string().trim().min(2).max(120),
    descricao: z.string().trim().min(15).max(2000),
    genero_musical: z.string().trim().min(2).max(80),
    outro_genero: z.string().trim().max(120).optional(),
    tipo_cantor: z.enum(["feminino", "masculino"]).optional().default("feminino"),
    bot_field: z.string().trim().max(255).optional().default(""),
    form_started_at: z.preprocess(
      (value) => {
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return value;
      },
      z.number().int().optional().nullable(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.bot_field?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pedido inválido.",
        path: ["bot_field"],
      });
    }

    if (typeof data.form_started_at === "number" && Date.now() - data.form_started_at < 7000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pedido inválido.",
        path: ["form_started_at"],
      });
    }

    if (data.genero_musical === "Outro" && !data.outro_genero?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escolha um gênero quando selecionar 'Outro'.",
        path: ["outro_genero"],
      });
    }
  })
  .transform((data) => {
    const { bot_field: _botField, form_started_at: _formStartedAt, ...rest } = data;
    return {
      ...rest,
      genero_musical:
        data.genero_musical === "Outro" && data.outro_genero?.trim()
          ? data.outro_genero.trim()
          : data.genero_musical,
      tipo_cantor: data.tipo_cantor ?? "feminino",
      duracao_segundos: 45,
    };
  });

export const STATUS_FLOW = [
  "recebido",
  "gerando_letra",
  "letra_pronta",
  "aguardando_aprovacao_letra",
  "letra_aprovada",
  "pagamento",
  "pago",
  "gerando_musica",
  "musica_pronta",
  "entregue",
] as const;
export type PedidoStatus = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<PedidoStatus, string> = {
  recebido: "Recebido",
  gerando_letra: "Gerando letra",
  letra_pronta: "Letra pronta",
  aguardando_aprovacao_letra: "Aguardando aprovação da letra",
  letra_aprovada: "Letra aprovada",
  pagamento: "Aguardando pagamento",
  pago: "Pagamento aprovado",
  gerando_musica: "Música em produção",
  musica_pronta: "Música disponível",
  entregue: "Entregue",
};

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    try {
      console.log("[sendOrder.validator] Validando dados:", { hasData: Boolean(data) });
      const validated = OrderSchema.parse(data);
      console.log("[sendOrder.validator] Dados validados com sucesso");
      return validated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[sendOrder.validator] Erro de validação:", msg, error);
      throw error;
    }
  })
  .handler(async ({ data }) => {
    try {
      console.log("[sendOrder.handler] Iniciando criação de pedido...", { 
        nome: data.nome_cliente, 
        telefone: data.telefone_cliente?.substring(0, 3) + "***" 
      });
      
      const pedidoData: PedidoEntrada = data;
      const pedido = await criarPedido(pedidoData);
      console.log("[sendOrder.handler] Pedido criado com ID:", pedido.id);
      
      console.log("[sendOrder.handler] Gerando letra...");
      const pedidoComLetra = await gerarLetraPedido(pedido.id, pedidoData);
      console.log("[sendOrder.handler] Letra gerada com sucesso");
      
      return {
        ok: true,
        id: pedido.id,
        token: generateOrderAccessToken(pedido.id),
        letra_gerada: pedidoComLetra.letra_gerada,
        status: pedidoComLetra.status,
      };
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      console.error("[sendOrder.handler] ERRO FATAL:", mensagem, error);
      throw new Error(`Erro ao criar sua música: ${mensagem}`);
    }
  });

export const approveLyric = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: orderIdSchema, token: z.string().optional() }).parse(data))
  .handler(async ({ data }) => {
    validateOrderAccess(data.id, data.token);
    return marcarLetraAprovada(data.id);
  });

export const requestLyricRevision = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: orderIdSchema,
        token: z.string().optional(),
        feedback: z
          .string()
          .trim()
          .max(1000)
          .optional()
          .transform((value) => value ?? ""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    validateOrderAccess(data.id, data.token);
    return refazerLetraPedido(data.id, data.feedback);
  });

export const updateCheckoutCustomerInfo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: orderIdSchema,
        token: z.string().optional(),
        email_cliente: z.string().trim().email().optional().nullable(),
        telefone_cliente: z.string().trim().max(30).optional().nullable(),
        cpf_cliente: z.string().trim().max(14).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    validateOrderAccess(data.id, data.token);
    return atualizarDadosClientePedido(data.id, {
      email_cliente: data.email_cliente,
      telefone_cliente: data.telefone_cliente,
      cpf_cliente: data.cpf_cliente,
    });
  });

export const createStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: orderIdSchema,
        token: z.string().optional(),
        secondVersion: z.boolean().optional(),
        forceTestPrice: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    validateOrderAccess(data.id, data.token);
    return criarCheckoutStripe(data.id, data.secondVersion ?? false, data.forceTestPrice ?? false);
  });

export const createStripePaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: orderIdSchema,
        token: z.string().optional(),
        secondVersion: z.boolean().optional(),
        forceTestPrice: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    validateOrderAccess(data.id, data.token);
    return criarPaymentIntentStripe(data.id, data.secondVersion ?? false, data.forceTestPrice ?? false);
  });

export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: orderIdSchema, token: z.string().optional() }).parse(data))
  .handler(async ({ data }) => {
    if (data.token) {
      validateOrderAccess(data.id, data.token);
    }

    const { data: row, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        "id, nome_cliente, email_cliente, telefone_cliente, cpf_cliente, genero_musical, duracao_segundos, descricao, para_quem, ocasiao, letra_refazer_contador, letra_aprovada, letra_gerada, roteiro_ia, status, url_musica, url_musica_segunda_versao, segunda_versao, pix_qr_code, pix_fixado, valor_pix, pago_em, stripe_checkout_url, stripe_session_id, stripe_payment_intent_id, stripe_payment_status, created_at, status_atualizado_em",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pedido não encontrado.");
    return {
      ...row,
      access_token: generateOrderAccessToken(data.id),
    } as {
      id: string;
      nome_cliente: string;
      email_cliente: string;
      telefone_cliente: string;
      cpf_cliente: string | null;
      genero_musical: string;
      duracao_segundos: number;
      descricao: string;
      status: PedidoStatus;
      letra_gerada: string | null;
      roteiro_ia: string | null;
      url_musica: string | null;
      url_musica_segunda_versao: string | null;
      segunda_versao: boolean;
      pix_qr_code: string | null;
      pix_fixado: boolean;
      valor_pix: string | null;
      pago_em: string | null;
      stripe_checkout_url: string | null;
      stripe_session_id: string | null;
      stripe_payment_intent_id: string | null;
      stripe_payment_status: string | null;
      created_at: string;
      status_atualizado_em: string;
      access_token: string;
    };
  });

export const getOrderStatusHistory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: orderIdSchema, token: z.string().optional() }).parse(data))
  .handler(async ({ data }) => {
    if (data.token) {
      validateOrderAccess(data.id, data.token);
    }

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
