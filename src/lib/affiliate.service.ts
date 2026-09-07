import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { adminCheckAccess } from "@/lib/admin.functions";
import { sendTelegramMessage } from "@/lib/telegram.service";

export const AFFILIATE_COMMISSION_RATE = Number(process.env.AFFILIATE_COMMISSION_RATE ?? "0.30");
export const AFFILIATE_COMMISSION_HOLD_DAYS = Number(process.env.AFFILIATE_COMMISSION_HOLD_DAYS ?? "7");

export function normalizeAffiliateCode(value?: string | null, maxLength = 40) {
  if (value === null || value === undefined) {
    return "";
  }

  const trimmed = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  const compact = trimmed
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return compact.slice(0, maxLength).replace(/-+$/, "");
}

export function buildAffiliateUrl(baseUrl: string, affiliateCode?: string | null) {
  const normalized = normalizeAffiliateCode(affiliateCode);
  if (!normalized) {
    return baseUrl;
  }

  const url = new URL(baseUrl, "https://example.com");
  url.searchParams.set("ref", normalized);
  return url.toString().replace(/^https:\/\/example\.com/, baseUrl.startsWith("http") ? baseUrl.split("?")[0] : baseUrl);
}

export function buildAffiliateSaleTelegramMessage({
  affiliateCode,
  orderId,
  customerName,
  amount,
  commission,
}: {
  affiliateCode: string;
  orderId: string;
  customerName: string;
  amount: number;
  commission: number;
}) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const safeAffiliateCode = String(affiliateCode ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeOrderId = String(orderId ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeCustomerName = String(customerName ?? "Cliente").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return [
    "Venda via afiliado 💸",
    `Afiliado: ${safeAffiliateCode}`,
    `Cliente: ${safeCustomerName}`,
    `Pedido: ${safeOrderId}`,
    `Valor: ${formatMoney(amount)}`,
    `Comissão: ${formatMoney(commission)}`,
  ].join("\n");
}

async function fetchAffiliateByCode(affiliateCode: string) {
  const normalized = normalizeAffiliateCode(affiliateCode);
  if (!normalized) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar afiliado: ${error.message}`);
  }

  return data;
}

async function ensureAffiliateExists(affiliateCode: string) {
  const normalized = normalizeAffiliateCode(affiliateCode);
  if (!normalized) {
    return null;
  }

  const existing = await fetchAffiliateByCode(normalized);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .insert({
      code: normalized,
      status: "active",
      commission_rate: AFFILIATE_COMMISSION_RATE,
      total_clicks: 0,
      total_sales: 0,
      total_commissions: 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Falha ao criar afiliado: ${error?.message ?? "dados inválidos"}`);
  }

  return data;
}

export async function getAffiliateDashboard(accessToken: string) {
  await adminCheckAccess({ data: { accessToken } });

  const { data: affiliates, error: affiliatesError } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  if (affiliatesError) {
    throw new Error(`Falha ao buscar afiliados: ${affiliatesError.message}`);
  }

  const { data: recentClicks, error: clicksError } = await supabaseAdmin
    .from("affiliate_clicks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (clicksError) {
    throw new Error(`Falha ao buscar cliques: ${clicksError.message}`);
  }

  const { data: recentSales, error: salesError } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (salesError) {
    throw new Error(`Falha ao buscar comissões: ${salesError.message}`);
  }

  const totalClicks = (affiliates ?? []).reduce((sum, affiliate) => sum + Number(affiliate.total_clicks ?? 0), 0);
  const totalSales = (affiliates ?? []).reduce((sum, affiliate) => sum + Number(affiliate.total_sales ?? 0), 0);
  const totalCommissions = (affiliates ?? []).reduce(
    (sum, affiliate) => sum + Number(affiliate.total_commissions ?? 0),
    0,
  );

  return {
    summary: {
      totalAffiliates: (affiliates ?? []).length,
      activeAffiliates: (affiliates ?? []).filter((affiliate) => affiliate.status === "active").length,
      totalClicks,
      totalSales,
      totalCommissions,
    },
    affiliates: affiliates ?? [],
    recentClicks: recentClicks ?? [],
    recentSales: recentSales ?? [],
  };
}

export const getAffiliateDashboardServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().trim().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => getAffiliateDashboard(data.accessToken));

function normalizeAffiliateStatus(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["active", "inactive"].includes(normalized) ? normalized : "active";
}

export async function upsertAffiliate(input: {
  accessToken: string;
  code?: string | null;
  status?: string | null;
  commissionRate?: number | null;
}) {
  await adminCheckAccess({ data: { accessToken: input.accessToken } });

  const affiliateCode = normalizeAffiliateCode(input.code);
  if (!affiliateCode) {
    throw new Error("Código do afiliado inválido.");
  }

  const commissionRate = Number(input.commissionRate ?? AFFILIATE_COMMISSION_RATE);
  if (!Number.isFinite(commissionRate) || commissionRate <= 0 || commissionRate > 1) {
    throw new Error("A taxa de comissão precisa estar entre 0 e 1.");
  }

  const now = new Date().toISOString();
  const status = normalizeAffiliateStatus(input.status);

  const { data: affiliate, error } = await supabaseAdmin
    .from("affiliates")
    .upsert(
      {
        code: affiliateCode,
        status,
        commission_rate: commissionRate,
        updated_at: now,
      },
      { onConflict: "code" },
    )
    .select("*")
    .single();

  if (error || !affiliate) {
    throw new Error(`Falha ao salvar afiliado: ${error?.message ?? "dados inválidos"}`);
  }

  return {
    ok: true,
    reason: "saved" as const,
    affiliate,
  };
}

export const upsertAffiliateServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().trim().min(10),
        code: z.string().trim().min(2).max(40),
        status: z.enum(["active", "inactive"]).optional().nullable(),
        commissionRate: z.union([z.number().min(0).max(1), z.string().transform((value) => Number(value))]).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => upsertAffiliate({
    accessToken: data.accessToken,
    code: data.code,
    status: data.status,
    commissionRate: typeof data.commissionRate === "number" ? data.commissionRate : Number(data.commissionRate ?? AFFILIATE_COMMISSION_RATE),
  }));

export async function setAffiliateStatus(input: {
  accessToken: string;
  affiliateId: string;
  status?: string | null;
}) {
  await adminCheckAccess({ data: { accessToken: input.accessToken } });

  const nextStatus = normalizeAffiliateStatus(input.status);
  const now = new Date().toISOString();

  const { data: affiliate, error } = await supabaseAdmin
    .from("affiliates")
    .update({
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", input.affiliateId)
    .select("*")
    .single();

  if (error || !affiliate) {
    throw new Error(`Falha ao atualizar status do afiliado: ${error?.message ?? "dados inválidos"}`);
  }

  return {
    ok: true,
    reason: "status_updated" as const,
    affiliate,
  };
}

export const setAffiliateStatusServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().trim().min(10),
        affiliateId: z.string().uuid(),
        status: z.enum(["active", "inactive"]).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => setAffiliateStatus(data));

export async function trackAffiliateVisit(input: {
  affiliateCode?: string | null;
  source?: string | null;
  url?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
}) {
  const affiliateCode = normalizeAffiliateCode(input.affiliateCode);
  if (!affiliateCode) {
    return { ok: false, reason: "invalid_affiliate_code" as const };
  }

  const affiliate = await ensureAffiliateExists(affiliateCode);
  if (!affiliate) {
    return { ok: false, reason: "affiliate_not_created" as const };
  }

  const now = new Date().toISOString();
  const { error: clickError } = await supabaseAdmin.from("affiliate_clicks").insert({
    affiliate_id: affiliate.id,
    affiliate_code: affiliate.code,
    source: input.source ?? "landing_ref",
    url: input.url ?? null,
    referrer: input.referrer ?? null,
    user_agent: input.userAgent ?? null,
    ip_hash: input.ipHash ?? null,
    created_at: now,
  });

  if (clickError) {
    console.error("[affiliate] Falha ao registrar clique:", clickError.message);
  }

  const { data: updatedAffiliate, error: affiliateError } = await supabaseAdmin
    .from("affiliates")
    .update({
      total_clicks: (affiliate.total_clicks ?? 0) + 1,
      updated_at: now,
    })
    .eq("id", affiliate.id)
    .select("*")
    .single();

  if (affiliateError) {
    console.error("[affiliate] Falha ao atualizar contador do afiliado:", affiliateError.message);
  }

  return {
    ok: true,
    reason: "tracked" as const,
    affiliateCode: affiliate.code,
    affiliate: updatedAffiliate ?? affiliate,
  };
}

export const trackAffiliateVisitServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        affiliateCode: z.string().trim().max(40).optional().nullable(),
        source: z.string().trim().max(80).optional().nullable(),
        url: z.string().trim().max(500).optional().nullable(),
        referrer: z.string().trim().max(500).optional().nullable(),
        userAgent: z.string().trim().max(500).optional().nullable(),
        ipHash: z.string().trim().max(128).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => trackAffiliateVisit(data));

export async function registerAffiliateAttribution(input: {
  orderId: string;
  affiliateCode?: string | null;
  source?: string | null;
  clickId?: string | null;
}) {
  const affiliateCode = normalizeAffiliateCode(input.affiliateCode);
  if (!affiliateCode) {
    return { ok: false, reason: "invalid_affiliate_code" as const };
  }

  const affiliate = await ensureAffiliateExists(affiliateCode);
  if (!affiliate) {
    return { ok: false, reason: "affiliate_not_created" as const };
  }

  const now = new Date().toISOString();
  const payload = {
    order_id: input.orderId,
    affiliate_id: affiliate.id,
    affiliate_code: affiliate.code,
    source: input.source ?? "landing_ref",
    click_id: input.clickId ?? null,
    created_at: now,
  };

  const { error } = await supabaseAdmin
    .from("affiliate_attributions")
    .upsert(payload, { onConflict: "order_id" });

  if (error) {
    throw new Error(`Falha ao registrar atribuição: ${error.message}`);
  }

  await supabaseAdmin
    .from("pedidos")
    .update({
      affiliate_code: affiliate.code,
      affiliate_source: payload.source,
      affiliate_click_id: payload.click_id,
      status_atualizado_em: now,
    })
    .eq("id", input.orderId);

  return {
    ok: true,
    reason: "attributed" as const,
    affiliateCode: affiliate.code,
  };
}

export async function finalizeAffiliateCommission(input: {
  orderId: string;
  customerName?: string | null;
  amount?: number | null;
  affiliateCode?: string | null;
}) {
  const affiliateCode = normalizeAffiliateCode(input.affiliateCode);
  if (!affiliateCode) {
    return { ok: false, reason: "missing_affiliate_code" as const };
  }

  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" as const };
  }

  const affiliate = await ensureAffiliateExists(affiliateCode);
  if (!affiliate) {
    return { ok: false, reason: "affiliate_not_created" as const };
  }

  const commissionAmount = Number((amount * Number(affiliate.commission_rate ?? AFFILIATE_COMMISSION_RATE)).toFixed(2));
  const now = new Date().toISOString();
  const holdUntil = new Date(Date.now() + AFFILIATE_COMMISSION_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("*")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Falha ao verificar comissão: ${existingError.message}`);
  }

  if (existing) {
    return {
      ok: true,
      reason: "already_recorded" as const,
      commission: existing.commission_amount,
    };
  }

  const { data: commission, error: insertError } = await supabaseAdmin
    .from("affiliate_commissions")
    .insert({
      order_id: input.orderId,
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.code,
      gross_amount: amount,
      commission_amount: commissionAmount,
      status: "pending",
      hold_until: holdUntil,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError || !commission) {
    throw new Error(`Falha ao gravar comissão: ${insertError?.message ?? "dados inválidos"}`);
  }

  await supabaseAdmin
    .from("pedidos")
    .update({
      affiliate_commission_amount: commissionAmount,
      affiliate_commission_status: "pending",
      status_atualizado_em: now,
    })
    .eq("id", input.orderId);

  await supabaseAdmin
    .from("affiliates")
    .update({
      total_sales: (affiliate.total_sales ?? 0) + 1,
      total_commissions: Number((Number(affiliate.total_commissions ?? 0) + commissionAmount).toFixed(2)),
      updated_at: now,
    })
    .eq("id", affiliate.id);

  const message = buildAffiliateSaleTelegramMessage({
    affiliateCode: affiliate.code,
    orderId: input.orderId,
    customerName: input.customerName ?? "Cliente",
    amount,
    commission: commissionAmount,
  });

  await sendTelegramMessage(message);

  return {
    ok: true,
    reason: "commission_created" as const,
    commission,
  };
}
