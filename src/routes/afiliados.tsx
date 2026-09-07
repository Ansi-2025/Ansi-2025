import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { adminCheckAccess } from "@/lib/admin.functions";
import {
  buildAffiliateUrl,
  getAffiliateDashboardServer,
  normalizeAffiliateCode,
  setAffiliateStatusServer,
  upsertAffiliateServer,
} from "@/lib/affiliate.service";

export const Route = createFileRoute("/afiliados")({
  component: AffiliatePage,
});

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function AffiliatePage() {
  const dashboard = useServerFn(getAffiliateDashboardServer);
  const checkAdminAccess = useServerFn(adminCheckAccess);

  const [session, setSession] = useState<Session | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [data, setData] = useState<{
    summary: {
      totalAffiliates: number;
      activeAffiliates: number;
      totalClicks: number;
      totalSales: number;
      totalCommissions: number;
    };
    affiliates: Array<any>;
    recentClicks: Array<any>;
    recentSales: Array<any>;
  } | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [savingAffiliate, setSavingAffiliate] = useState(false);
  const [affiliateCodeInput, setAffiliateCodeInput] = useState("PAULO-123");
  const [affiliateCommissionInput, setAffiliateCommissionInput] = useState("0.30");
  const [affiliateStatusInput, setAffiliateStatusInput] = useState<"active" | "inactive">("active");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [affiliateFeedback, setAffiliateFeedback] = useState<string>("");

  const affiliateCodePreview = normalizeAffiliateCode(affiliateCodeInput);
  const generatedAffiliateLink =
    typeof window !== "undefined" ? buildAffiliateUrl(window.location.origin, affiliateCodePreview) : "";

  const refreshDashboard = async (accessToken: string) => {
    setLoadingDashboard(true);
    try {
      const result = await dashboard({ data: { accessToken } });
      setData(result as any);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleCopyAffiliateLink = async () => {
    if (!generatedAffiliateLink || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(generatedAffiliateLink);
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 1400);
  };

  const handleSaveAffiliate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session?.access_token) {
      setAffiliateFeedback("Sessão expirada. Faça login novamente.");
      return;
    }

    const normalizedCode = normalizeAffiliateCode(affiliateCodeInput);
    if (!normalizedCode) {
      setAffiliateFeedback("Informe um código válido para o afiliado.");
      return;
    }

    try {
      setSavingAffiliate(true);
      setAffiliateFeedback("");

      const commissionValue = Number(affiliateCommissionInput ?? "0.30");
      const result = await upsertAffiliateServer({
        data: {
          accessToken: session.access_token,
          code: normalizedCode,
          status: affiliateStatusInput,
          commissionRate: commissionValue,
        },
      });

      setAffiliateFeedback(`${result.affiliate.code} salvo com sucesso.`);
      setAffiliateCodeInput(result.affiliate.code);
      await refreshDashboard(session.access_token);
    } catch (error) {
      setAffiliateFeedback(error instanceof Error ? error.message : "Não foi possível salvar o afiliado.");
    } finally {
      setSavingAffiliate(false);
    }
  };

  const handleToggleAffiliateStatus = async (affiliateId: string, currentStatus: string | null) => {
    if (!session?.access_token) return;

    try {
      const nextStatus = currentStatus === "active" ? "inactive" : "active";
      await setAffiliateStatusServer({
        data: {
          accessToken: session.access_token,
          affiliateId,
          status: nextStatus,
        },
      });
      await refreshDashboard(session.access_token);
    } catch (error) {
      setAffiliateFeedback(error instanceof Error ? error.message : "Não foi possível alterar o status do afiliado.");
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setCheckingAccess(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingAccess(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const validateAccess = async () => {
      if (!session?.access_token) {
        setAccessGranted(false);
        return;
      }

      try {
        await checkAdminAccess({ data: { accessToken: session.access_token } });
        setAccessGranted(true);
        await refreshDashboard(session.access_token);
      } catch {
        setAccessGranted(false);
        await supabase.auth.signOut();
        setSession(null);
      } finally {
        setLoadingDashboard(false);
      }
    };

    if (!checkingAccess && session) {
      void validateAccess();
    }
  }, [checkingAccess, session, dashboard, checkAdminAccess]);

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] text-sm text-muted-foreground">
        Validando acesso do painel de afiliados...
      </div>
    );
  }

  if (!session || !accessGranted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] px-4">
        <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acesso restrito</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-primary">Área de afiliados</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Faça login no painel administrativo para visualizar indicadores, cliques e comissões.
          </p>
          <a
            href="/admin"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)]"
          >
            Ir para o painel admin
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] text-sm text-muted-foreground">
        {loadingDashboard ? "Carregando dados do afiliado..." : "Nenhum dado disponível."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--soft-gray)] px-4 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Marketing</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary">Afiliados</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
            >
              Voltar ao admin
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Link de afiliado</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-primary">Gerar convite do parceiro</h2>
          </div>

          <form onSubmit={handleSaveAffiliate} className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto] lg:items-end">
            <label className="block text-sm text-muted-foreground">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Código</span>
              <input
                value={affiliateCodeInput}
                onChange={(event) => setAffiliateCodeInput(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
                placeholder="NOME-DO-AFILIADO"
              />
            </label>

            <label className="block text-sm text-muted-foreground">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Comissão</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={affiliateCommissionInput}
                onChange={(event) => setAffiliateCommissionInput(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
              />
            </label>

            <label className="block text-sm text-muted-foreground">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
              <select
                value={affiliateStatusInput}
                onChange={(event) => setAffiliateStatusInput(event.target.value as "active" | "inactive")}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={savingAffiliate}
              className="inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAffiliate ? "Salvando..." : "Salvar afiliado"}
            </button>
          </form>

          <div className="mt-4 rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview</div>
            <div className="mt-2 break-all text-primary">{generatedAffiliateLink || "Informe um código para gerar o link"}</div>
            <div className="mt-2 text-xs text-muted-foreground">Código normalizado: {affiliateCodePreview || "—"}</div>
            {affiliateFeedback && <div className="mt-3 text-xs text-primary">{affiliateFeedback}</div>}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleCopyAffiliateLink}
              disabled={!generatedAffiliateLink}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copyStatus === "copied" ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Afiliados" value={String(data.summary.totalAffiliates)} />
          <StatCard label="Ativos" value={String(data.summary.activeAffiliates)} />
          <StatCard label="Cliques" value={String(data.summary.totalClicks)} />
          <StatCard label="Comissões" value={formatCurrency(data.summary.totalCommissions)} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 font-display text-xl font-semibold text-primary">Top afiliados</h2>
            <div className="space-y-3">
              {data.affiliates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há afiliados cadastrados.</p>
              ) : (
                data.affiliates.map((affiliate) => (
                  <div key={affiliate.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3">
                    <div>
                      <p className="font-semibold text-primary">{affiliate.code}</p>
                      <p className="text-xs text-muted-foreground">{affiliate.status}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {Number(affiliate.commission_rate ?? 0) * 100}%
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{affiliate.total_clicks ?? 0} cliques</div>
                      <div>{affiliate.total_sales ?? 0} vendas</div>
                      <div>{formatCurrency(affiliate.total_commissions)}</div>
                      <button
                        type="button"
                        onClick={() => handleToggleAffiliateStatus(affiliate.id, affiliate.status)}
                        className="mt-2 inline-flex items-center justify-center rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary"
                      >
                        {affiliate.status === "active" ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 font-display text-xl font-semibold text-primary">Últimos cliques</h2>
            <div className="space-y-3">
              {data.recentClicks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum clique registrado.</p>
              ) : (
                data.recentClicks.map((click) => (
                  <div key={click.id} className="rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground">
                    <div className="font-semibold text-primary">{click.affiliate_code}</div>
                    <div>{click.source ?? "landing_ref"}</div>
                    <div>{click.created_at ? new Date(click.created_at).toLocaleString("pt-BR") : "—"}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-xl font-semibold text-primary">Últimas comissões</h2>
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma comissão registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Afiliado</th>
                    <th className="px-3 py-3">Pedido</th>
                    <th className="px-3 py-3">Bruto</th>
                    <th className="px-3 py-3">Comissão</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-border">
                      <td className="px-3 py-3 font-semibold text-primary">{sale.affiliate_code}</td>
                      <td className="px-3 py-3">{sale.order_id}</td>
                      <td className="px-3 py-3">{formatCurrency(sale.gross_amount)}</td>
                      <td className="px-3 py-3">{formatCurrency(sale.commission_amount)}</td>
                      <td className="px-3 py-3 uppercase tracking-[0.12em] text-xs text-muted-foreground">{sale.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}
