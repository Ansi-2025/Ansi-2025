import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Send, RefreshCw, Lock, LogOut, Check, Loader2 } from "lucide-react";
import {
  adminLogin,
  adminListOrders,
  adminUpdateStatus,
  adminResendTelegram,
  STATUS_FLOW,
  STATUS_LABELS,
  type PedidoStatus,
} from "@/lib/order.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel — Pedidos | Canção de Fé" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Pedido = {
  id: string;
  created_at: string;
  nome_completo: string;
  para_quem: string;
  tipo_musica: string;
  descricao: string;
  whatsapp: string;
  status: PedidoStatus;
};

const STORAGE_KEY = "admin_pwd";

function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setPassword(saved);
  }, []);
  return password ? (
    <Dashboard password={password} onLogout={() => { sessionStorage.removeItem(STORAGE_KEY); setPassword(null); }} />
  ) : (
    <Login onLogin={(p) => { sessionStorage.setItem(STORAGE_KEY, p); setPassword(p); }} />
  );
}

function Login({ onLogin }: { onLogin: (p: string) => void }) {
  const login = useServerFn(adminLogin);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try { await login({ data: { password: pwd } }); onLogin(pwd); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--soft-gray)] px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--sky-blue)]/10 text-[var(--sky-blue)]">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-semibold text-primary">Painel de Pedidos</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Acesso restrito</p>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Senha"
          className="mt-6 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--sky-blue)]"
        />
        {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
        <button
          disabled={loading || !pwd}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Entrar
        </button>
      </form>
    </div>
  );
}

function Dashboard({ password, onLogout }: { password: string; onLogout: () => void }) {
  const list = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateStatus);
  const resend = useServerFn(adminResendTelegram);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr("");
    try { const rows = await list({ data: { password } }); setOrders(rows); }
    catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      setErr(msg);
      if (msg.toLowerCase().includes("senha")) onLogout();
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onCopy = (p: Pedido) => {
    const txt =
      `Pedido #${p.id}\n` +
      `Criado: ${new Date(p.created_at).toLocaleString("pt-BR")}\n` +
      `Status: ${STATUS_LABELS[p.status]}\n\n` +
      `Nome: ${p.nome_completo}\n` +
      `Para quem: ${p.para_quem}\n` +
      `Tipo: ${p.tipo_musica}\n` +
      `WhatsApp: ${p.whatsapp}\n\n` +
      `Descrição:\n${p.descricao}`;
    navigator.clipboard.writeText(txt);
    setCopied(p.id);
    setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1500);
  };

  const onStatus = async (p: Pedido, s: PedidoStatus) => {
    setBusy(p.id);
    try {
      const updated = await updateStatus({ data: { password, id: p.id, status: s } });
      setOrders((all) => all.map((o) => (o.id === p.id ? (updated as Pedido) : o)));
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(null); }
  };

  const onResend = async (p: Pedido) => {
    setBusy(p.id);
    try { await resend({ data: { password, id: p.id } }); alert("Notificação reenviada ao Telegram."); }
    catch (e) { alert(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[var(--soft-gray)]">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div>
            <h1 className="font-display text-xl font-semibold text-primary">Painel de Pedidos</h1>
            <p className="text-xs text-muted-foreground">{orders.length} pedido(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:border-[var(--sky-blue)]/40">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:border-destructive/40">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        {err && <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>}
        {loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-12 text-center text-muted-foreground">Nenhum pedido ainda.</div>
        ) : (
          <ul className="space-y-4">
            {orders.map((p) => (
              <li key={p.id} className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-primary">{p.nome_completo}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-BR")} · <span className="font-mono text-[10px]">{p.id.slice(0, 8)}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--sky-blue)]/10 px-3 py-1 text-xs font-semibold text-[var(--sky-blue)]">
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Para quem" value={p.para_quem} />
                  <Info label="Tipo" value={p.tipo_musica} />
                  <Info label="WhatsApp" value={p.whatsapp} />
                  <Info label="Código" value={p.id} mono />
                </div>
                <div className="mt-3 rounded-xl bg-[var(--soft-gray)] p-4 text-sm leading-relaxed text-primary">
                  {p.descricao}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <select
                    value={p.status}
                    disabled={busy === p.id}
                    onChange={(e) => onStatus(p, e.target.value as PedidoStatus)}
                    className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button onClick={() => onCopy(p)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:border-[var(--sky-blue)]/40">
                    {copied === p.id ? <Check className="h-3.5 w-3.5 text-[var(--sky-blue)]" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === p.id ? "Copiado" : "Copiar detalhes"}
                  </button>
                  <button onClick={() => onResend(p)} disabled={busy === p.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:border-[var(--gold)]/40 disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" /> Reenviar Telegram
                  </button>
                  <a
                    href={`/acompanhar?id=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:border-[var(--sky-blue)]/40"
                  >
                    Ver acompanhamento
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-primary ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</div>
    </div>
  );
}
