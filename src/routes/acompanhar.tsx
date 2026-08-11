import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Search, Music, Sparkles, ArrowRight, Download, Copy, Check, Clock } from "lucide-react";
import { approveLyric, createStripeCheckout, generateMusicPreview, getOrderStatus, getOrderStatusHistory, requestLyricRevision, STATUS_FLOW, STATUS_LABELS, type PedidoStatus } from "@/lib/order.functions";
import { z } from "zod";
import QRCode from "qrcode";

const search = z.object({ id: z.string().optional() });
const PIX_PAYMENT_CODE = "00020101021126580014br.gov.bcb.pix0136d9100d0a-6aa3-4d26-b825-2060ddb655145204000053039865802BR5917ANDERSON DA SILVA6008CURITIBA62070503***63042679";
const PIX_PAYMENT_WA = "https://wa.me/5541997232395?text=Ol%C3%A1%2C%20enviei%20o%20comprovante%20do%20pagamento%20da%20minha%20m%C3%BAsica%20personalizada.";

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
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  genero_musical: string | null;
  duracao_segundos: number | null;
  descricao: string;
  para_quem: string | null;
  ocasiao: string | null;
  status: PedidoStatus;
  status_atualizado_em: string;
  created_at: string;
  letra_gerada: string | null;
  roteiro_ia: string | null;
  url_previa: string | null;
  url_musica: string | null;
  pix_qr_code: string | null;
  pix_fixado: boolean;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
};

function TrackingPage() {
  const { id: initialId } = useSearch({ from: "/acompanhar" });
  const fetchStatus = useServerFn(getOrderStatus);
  const fetchHistory = useServerFn(getOrderStatusHistory);
  const createCheckout = useServerFn(createStripeCheckout);
  const generatePreviewFn = useServerFn(generateMusicPreview);
  const approveLyricFn = useServerFn(approveLyric);
  const requestRevisionFn = useServerFn(requestLyricRevision);
  const [id, setId] = useState(initialId ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [secondVersionSelected, setSecondVersionSelected] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [err, setErr] = useState("");

  const search = async (orderId: string) => {
    setLoading(true); setErr(""); setOrder(null); setHistory([]);
    try {
      const row = await fetchStatus({ data: { id: orderId.trim() } });
      setOrder(row as Order);
      setCheckoutUrl((row as Order).stripe_checkout_url ?? null);
      const hist = await fetchHistory({ data: { id: orderId.trim() } });
      setHistory(hist);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  const openStripeCheckout = async (withSecondVersion = secondVersionSelected) => {
    if (!order) return;
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const result = await createCheckout({ data: { id: order.id, secondVersion: withSecondVersion } });
      setCheckoutUrl(result.checkoutUrl);
      await search(order.id);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Erro ao criar checkout Stripe.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!order) return;
    setPreviewError("");
    setPreviewLoading(true);
    try {
      await generatePreviewFn({ data: { id: order.id } });
      await search(order.id);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Erro ao gerar prévia de música.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApproveLyric = async () => {
    if (!order) return;
    setApprovalError("");
    setApprovalLoading(true);
    try {
      await approveLyricFn({ data: { id: order.id } });
      await search(order.id);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : "Erro ao aprovar a letra.");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRequestRevision = async (feedback?: string) => {
    if (!order) return;
    setApprovalError("");
    setApprovalLoading(true);
    try {
      await requestRevisionFn({ data: { id: order.id, feedback: feedback ?? "" } });
      await search(order.id);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : "Erro ao solicitar revisão da letra.");
    } finally {
      setApprovalLoading(false);
    }
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

      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-5 py-12 md:px-8">
        <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
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

        {order && (
          <Timeline
            order={order}
            history={history}
            checkoutUrl={checkoutUrl}
            checkoutError={checkoutError}
            checkoutLoading={checkoutLoading}
            previewError={previewError}
            previewLoading={previewLoading}
            approvalLoading={approvalLoading}
            approvalError={approvalError}
            handleApproveLyric={handleApproveLyric}
            handleRequestRevision={handleRequestRevision}
            openStripeCheckout={openStripeCheckout}
            handleGeneratePreview={handleGeneratePreview}
            key={order.id + order.status}
          />
        )}
      </main>
    </div>
  );
}

function buildMusicBriefSections(roteiro: string | null) {
  if (!roteiro) return [] as Array<{ label: string; value: string }>;

  const sections = new Map<string, string>();
  const lines = roteiro.split(/\n+/);
  let activeLabel: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-zÀ-ÿ /()-]+):\s*(.*)$/);
    if (match) {
      const [, label, value] = match;
      activeLabel = label.trim();
      sections.set(activeLabel, value.trim());
      continue;
    }

    if (activeLabel) {
      const current = sections.get(activeLabel) ?? "";
      sections.set(activeLabel, `${current} ${line}`.trim());
    }
  }

  return [
    { label: "Tema", value: sections.get("Tema") ?? "" },
    { label: "Narrativa", value: sections.get("Narrativa") ?? "" },
    { label: "Tom", value: sections.get("Tom") ?? "" },
    { label: "Estilo", value: sections.get("Estilo") ?? "" },
    { label: "Estrutura", value: sections.get("Estrutura") ?? "" },
  ].filter((item) => item.value);
}

function Timeline({
  order,
  history,
  checkoutUrl,
  checkoutError,
  checkoutLoading,
  previewError,
  previewLoading,
  approvalLoading,
  approvalError,
  handleApproveLyric,
  handleRequestRevision,
  openStripeCheckout,
  handleGeneratePreview,
}: {
  order: Order;
  history: Array<any>;
  checkoutUrl: string | null;
  checkoutError: string;
  checkoutLoading: boolean;
  previewError: string;
  previewLoading: boolean;
  approvalLoading: boolean;
  approvalError: string;
  handleApproveLyric: () => Promise<void>;
  handleRequestRevision: (feedback?: string) => Promise<void>;
  openStripeCheckout: (withSecondVersion?: boolean) => Promise<void>;
  handleGeneratePreview: () => Promise<void>;
}) {
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const effectiveStatus = order.status === "previa" ? "pagamento" : order.status;
  const currentIdx = STATUS_FLOW.indexOf(effectiveStatus as PedidoStatus);
  const paymentBlockVisible = order.status === "letra_aprovada" || order.status === "pagamento";
  const briefSections = buildMusicBriefSections(order.roteiro_ia);
  const lyricPreview = order.letra_gerada ? order.letra_gerada.trim() : "";
  const excerpt = lyricPreview.length > 1200 ? `${lyricPreview.slice(0, 1200).trim()}...` : lyricPreview;
  const [showFullBrief, setShowFullBrief] = useState(false);
  const [showFullLyric, setShowFullLyric] = useState(false);
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
    <div className="mx-auto mt-8 w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pedido de</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-primary">{order.nome_cliente}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.genero_musical ?? "Gênero não informado"} · {order.duracao_segundos ? `${order.duracao_segundos}s` : "Duração não informada"}
        </p>
        {(order.status === "pago" || order.status === "entregue") && order.url_musica && (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold text-destructive">Atenção:</p>
            <p className="mt-2">Sua música está disponível para download aqui no site em menos de 1 hora — essa é a melhor opção para receber o arquivo rapidamente.</p>
            <p className="mt-2">Se você deixou um e-mail ao fazer o pedido, também enviamos a música por lá em até 5 horas.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href={order.url_musica}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--sky-blue)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--sky-blue)]/90"
              >
                <Download className="h-4 w-4" /> Baixar música
              </a>
            </div>
          </div>
        )}
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

              {isCurrent && (step === "letra_aprovada" || step === "pagamento") && paymentBlockVisible && (
                <div className="mt-4 rounded-[28px] border border-white/10 bg-[#1d1f22] p-6 text-white shadow-[0_18px_40px_rgba(14,18,22,0.45)]">
                  <div className="flex justify-center">
                    <div className="text-center text-[28px] font-black tracking-[-0.06em] text-[var(--gold)]">
                      Inter
                    </div>
                  </div>
                  <div className="mt-3 text-center text-3xl font-bold tracking-[-0.04em] text-white">Pix</div>
                  <p className="mt-3 text-center text-sm text-white/70">Informe o valor quando for pagar</p>

                  <div className="mt-5 border-t border-dashed border-white/20" />

                  <div className="mt-5 flex justify-center">
                    <div className="rounded-2xl bg-white p-3 shadow-inner">
                      <QRCodeImage value={PIX_PAYMENT_CODE} />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-dashed border-white/20" />

                  <div className="mt-5">
                    <p className="text-2xl font-bold tracking-[-0.04em] text-white">Sobre o QR Code</p>

                    <div className="mt-5 space-y-4 text-sm text-white/80">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/70">Nome</span>
                        <span className="text-right font-semibold text-white">ANDERSON DA SILVA</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 break-all">
                        <span className="text-white/70">Chave Pix</span>
                        <span className="text-right font-semibold text-white">{PIX_PAYMENT_CODE}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <CopyPixButton pixCode={PIX_PAYMENT_CODE} />
                    </div>

                    <p className="mt-5 text-sm text-white/70">
                      Depois do pagamento, envie o comprovante para o WhatsApp <a href={PIX_PAYMENT_WA} target="_blank" rel="noreferrer" className="font-semibold text-[var(--gold)]">41 99723-2395</a>.
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      O responsável pelo projeto é o Anderson, então fique tranquilo: ele vai confirmar o pagamento e seguir com sua música com segurança.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
                    <button
                      type="button"
                      onClick={() => setSecondVersionSelected((prev) => !prev)}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--gold)] bg-background px-4 py-2 text-sm font-semibold text-[var(--gold)]"
                    >
                      {secondVersionSelected ? "Remover segunda versão" : "Quero a segunda versão +R$ 9,90"}
                    </button>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Total do checkout: <strong className="text-primary">R$ {(19.9 + (secondVersionSelected ? 9.9 : 0)).toFixed(2).replace(".", ",")}</strong>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => openStripeCheckout(secondVersionSelected)}
                      disabled={checkoutLoading || !!(checkoutUrl || order.stripe_checkout_url)}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] disabled:opacity-50"
                    >
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : checkoutUrl || order.stripe_checkout_url ? "Checkout criado" : "Validar pagamento"}
                    </button>
                    {(checkoutUrl || order.stripe_checkout_url) && (
                      <a
                        href={checkoutUrl ?? order.stripe_checkout_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-[var(--sky-blue)] bg-background px-5 py-3 text-sm font-semibold text-[var(--sky-blue)]"
                      >
                        Abrir checkout
                      </a>
                    )}
                  </div>
                  {checkoutError && <p className="mt-3 text-sm text-destructive">{checkoutError}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Código: <span className="font-mono">{order.id}</span>
      </p>

      {history.length > 0 && (
        <div className="mt-8 rounded-3xl border border-border bg-[var(--soft-gray)]/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-[var(--sky-blue)]" />
            <h3 className="font-display text-sm font-semibold text-primary">Histórico de Atualizações</h3>
          </div>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/50 bg-card p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary">{STATUS_LABELS[item.status_novo as PedidoStatus]}</p>
                    <p className="text-muted-foreground mt-1">{new Date(item.criado_em).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyPixButton({ pixCode }: { pixCode: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> Copiar chave PIX
        </>
      )}
    </button>
  );
}

function QRCodeImage({ value }: { value: string }) {
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, { width: 200, margin: 1 })
      .then((url: string) => setQrCode(url))
      .catch(() => setQrCode(""));
  }, [value]);

  if (!qrCode) return <div className="h-[200px] w-[200px] animate-pulse bg-[var(--soft-gray)]" />;

  return <img src={qrCode} alt="QR Code PIX" className="h-[200px] w-[200px]" />;
}
