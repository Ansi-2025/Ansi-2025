import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { adminCheckAccess, adminConfirmPayment, adminListOrders, adminReleaseMusic } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const buildCustomerOrderUrl = (orderId: string) => {
  if (typeof window === "undefined") return `/acompanhar?id=${encodeURIComponent(orderId)}`;
  return new URL(`/acompanhar?id=${encodeURIComponent(orderId)}`, window.location.origin).toString();
};

const buildClientWhatsAppUrl = (order: { id: string; nome_cliente: string; telefone_cliente?: string | null }) => {
  const rawPhone = (order.telefone_cliente ?? "").replace(/\D/g, "");
  if (!rawPhone) return null;

  const normalizedPhone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;
  const orderUrl = buildCustomerOrderUrl(order.id);
  const message = `Olá ${order.nome_cliente}! Seu pedido ${order.id} está pronto. Acesse o atendimento para receber a música: ${orderUrl}`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

function AdminPage() {
  const checkAdminAccess = useServerFn(adminCheckAccess);
  const listOrders = useServerFn(adminListOrders);
  const confirmPayment = useServerFn(adminConfirmPayment);
  const releaseMusic = useServerFn(adminReleaseMusic);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [adminValidated, setAdminValidated] = useState<boolean>(false);
  const [adminValidationInProgress, setAdminValidationInProgress] = useState(false);
  const [adminError, setAdminError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<Array<any>>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const openCustomerOrder = (orderId: string) => {
    window.open(buildCustomerOrderUrl(orderId), "_blank", "noopener,noreferrer");
  };

  const openClientWhatsApp = (order: { id: string; nome_cliente: string; telefone_cliente?: string | null }) => {
    const url = buildClientWhatsAppUrl(order);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const loadOrders = async (currentSession: Session | null) => {
    if (!currentSession?.access_token) return;
    setOrdersLoading(true);
    try {
      const result = await listOrders({
        data: {
          accessToken: currentSession.access_token,
        },
      });
      setOrders(Array.isArray(result) ? result : []);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoadingSession(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const validate = async () => {
      if (!session?.access_token) {
        setAdminValidated(false);
        setAdminError("");
        return;
      }

      setAdminValidationInProgress(true);
      setAdminError("");

      try {
        await checkAdminAccess({
          data: {
            accessToken: session.access_token,
          },
        });
        setAdminValidated(true);
        await loadOrders(session);
      } catch (error) {
        setAdminValidated(false);
        setAdminError("Acesso não autorizado.");
        await supabase.auth.signOut();
        setSession(null);
      } finally {
        setAdminValidationInProgress(false);
      }
    };

    validate();
  }, [session]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    setAdminValidated(false);
    setOrders([]);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Falha ao entrar no painel.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOrders([]);
    setAdminValidated(false);
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (!session?.access_token) return;
    setActionLoading(orderId);
    try {
      await confirmPayment({
        data: {
          id: orderId,
          accessToken: session.access_token,
        },
      });
      await loadOrders(session);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseMusic = async (orderId: string) => {
    if (!session?.access_token) return;
    setActionLoading(orderId);
    try {
      await releaseMusic({
        data: {
          id: orderId,
          accessToken: session.access_token,
        },
      });
      await loadOrders(session);
    } finally {
      setActionLoading(null);
    }
  };

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] text-sm text-muted-foreground">
        Carregando painel administrativo...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] px-4">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Painel administrativo</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary">Canção de Fé</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
                placeholder="admin@seuapp.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
                placeholder="••••••••"
                required
              />
            </label>

            {loginError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] disabled:opacity-50"
            >
              {loginLoading ? "Entrando..." : "Entrar no painel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (adminValidationInProgress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] text-sm text-muted-foreground">
        Validando acesso administrativo...
      </div>
    );
  }

  if (!adminValidated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--soft-gray)] px-4">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acesso restrito</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary">Acesso não autorizado</h1>
          </div>
          <p className="text-sm text-muted-foreground">Você precisa fazer login novamente para acessar este painel.</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)]"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--soft-gray)] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-primary">Pedidos e pagamentos</h1>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
          >
            Sair
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pedidos</p>
            <p className="mt-3 text-3xl font-semibold text-primary">{orders.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Aguardando validação</p>
            <p className="mt-3 text-3xl font-semibold text-primary">{orders.filter((order) => order.status === "letra_aprovada" || order.status === "pagamento").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pagos</p>
            <p className="mt-3 text-3xl font-semibold text-primary">{orders.filter((order) => order.status === "pago").length}</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-border bg-background/50 px-5 py-4">
            <h2 className="font-display text-xl font-semibold text-primary">Lista de pedidos</h2>
          </div>

          {ordersLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando pedidos...</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-background/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Contato</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Pagamento</th>
                    <th className="px-5 py-4">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-border align-top">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-primary">{order.nome_cliente}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{order.para_quem}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div>{order.email_cliente || "—"}</div>
                        <div>{order.telefone_cliente || "—"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                            {order.status}
                          </span>
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${order.segunda_versao ? "border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border border-border bg-background text-muted-foreground"}`}>
                            {order.segunda_versao ? "2 versões incluídas" : "1 versão"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div>{order.stripe_payment_status || "Pix / manual"}</div>
                        <div className="mt-1 text-xs">{order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") : "—"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openCustomerOrder(order.id)}
                            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                          >
                            Abrir pedido
                          </button>

                          <button
                            type="button"
                            onClick={() => openClientWhatsApp(order)}
                            disabled={!order.telefone_cliente}
                            className="inline-flex items-center justify-center rounded-full border border-[#25d366] bg-[#25d366]/10 px-3 py-2 text-xs font-semibold text-[#baf7cf] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            WhatsApp cliente
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading === order.id}
                            onClick={() => handleConfirmPayment(order.id)}
                            className="inline-flex items-center justify-center rounded-full bg-[var(--sky-blue)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {actionLoading === order.id ? "Processando..." : "Confirmar pagamento"}
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading === order.id}
                            onClick={() => handleReleaseMusic(order.id)}
                            className="inline-flex items-center justify-center rounded-full border border-[var(--gold)] bg-background px-3 py-2 text-xs font-semibold text-[var(--gold)] disabled:opacity-50"
                          >
                            {actionLoading === order.id ? "Liberando..." : "Liberar música"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
