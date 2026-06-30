import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Search, Music, Sparkles, ArrowRight } from "lucide-react";
import { getOrderStatus, STATUS_FLOW, STATUS_LABELS, type PedidoStatus } from "@/lib/order.functions";
import { z } from "zod";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/acompanhar")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Acompanhar Pedido | Canção de Fé" },
      { name: "description", content: "Acompanhe o status da sua música personalizada em tempo real." },
    ],
  }),
  component: TrackingPage,
});

type Order = {
  id: string;
  nome_completo: string;
  para_quem: string;
  tipo_musica: string;
  status: PedidoStatus;
  status_atualizado_em: string;
  created_at: string;
};

function TrackingPage() {
  const { id: initialId } = useSearch({ from: "/acompanhar" });
  const fetchStatus = useServerFn(getOrderStatus);
  const [id, setId] = useState(initialId ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const search = async (orderId: string) => {
    setLoading(true); setErr(""); setOrder(null);
    try {
      const row = await fetchStatus({ data: { id: orderId.trim() } });
      setOrder(row as Order);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (initialId) search(initialId); /* eslint-disable-next-line */ }, [initialId]);

  return (
    <div className="min-h-screen bg-[var(--soft-gray)]">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 md:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sky-blue)]/10 text-[var(--sky-blue)]">
            <Music className="h-4 w-4" />
          </span>
          <div>
            <h1 className="font-display text-base font-semibold text-primary">Acompanhar Pedido</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Canção de Fé</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Código do pedido</span>
            <div className="mt-2 flex gap-2">
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && id && search(id)}
                placeholder="Cole aqui o código que você recebeu"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-[var(--sky-blue)]"
              />
              <button
                onClick={() => id && search(id)}
                disabled={!id || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {err && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</p>}
        </div>

        {order && <Timeline order={order} key={order.id + order.status} />}
      </main>
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  // reveal steps progressivamente (uma de cada vez)
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    setRevealed(0);
    const target = currentIdx + 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= target; i++) {
      timers.push(setTimeout(() => setRevealed(i), i * 600));
    }
    return () => timers.forEach(clearTimeout);
  }, [order.id, currentIdx]);

  return (
    <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pedido de</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-primary">{order.nome_completo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.tipo_musica} · para {order.para_quem}
        </p>
      </div>

      <ol className="relative space-y-4 border-l-2 border-border pl-6">
        {STATUS_FLOW.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isVisible = i < revealed;
          const isReached = i <= currentIdx;
          return (
            <li
              key={step}
              className={`relative transition-all duration-500 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <span
                className={`absolute -left-[34px] grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ${
                  isCurrent
                    ? "border-[var(--gold)] bg-[var(--gold)] text-primary shadow-[var(--shadow-gold)]"
                    : isDone
                      ? "border-[var(--sky-blue)] bg-[var(--sky-blue)] text-white"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Sparkles className="h-3.5 w-3.5" /> : <ArrowRight className="h-3 w-3" />}
              </span>
              <div className={`rounded-2xl px-4 py-3 ${isCurrent ? "bg-[var(--gold)]/10 border border-[var(--gold)]/30" : isReached ? "" : "opacity-60"}`}>
                <div className={`font-display text-base font-semibold ${isCurrent ? "text-primary" : isDone ? "text-primary" : "text-muted-foreground"}`}>
                  {STATUS_LABELS[step]}
                </div>
                {isCurrent && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Atualizado em {new Date(order.status_atualizado_em).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Código: <span className="font-mono">{order.id}</span>
      </p>
    </div>
  );
}
