import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Search, Music, Sparkles, ArrowRight, Download, Copy, Check, Clock } from "lucide-react";
import { approveLyric, createStripeCheckout, generateMusicPreview, getOrderStatus, getOrderStatusHistory, requestLyricRevision, STATUS_FLOW, STATUS_LABELS, type PedidoStatus } from "@/lib/order.functions";
import { z } from "zod";
import QRCode from "qrcode";

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
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  genero_musical: string | null;
  duracao_segundos: number | null;
  descricao: string;
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

  const openStripeCheckout = async () => {
    if (!order) return;
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const result = await createCheckout({ data: { id: order.id } });
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
  openStripeCheckout: () => Promise<void>;
  handleGeneratePreview: () => Promise<void>;
}) {
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const briefSections = buildMusicBriefSections(order.roteiro_ia);
  const lyricPreview = order.letra_gerada
    ? order.letra_gerada.replace(/\s+/g, " ").trim()
    : "";
  const excerpt = lyricPreview.length > 780 ? `${lyricPreview.slice(0, 780).trim()}...` : lyricPreview;
  const [showFullBrief, setShowFullBrief] = useState(false);
  const [showFullLyric, setShowFullLyric] = useState(false);
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

              {/* Conteúdo específico por status */}
              {isCurrent && step === "previa" && order.url_previa && (
                <div className="mt-3 rounded-2xl border border-[var(--sky-blue)]/30 bg-[var(--sky-blue)]/5 p-4">
                  <p className="mb-3 text-xs font-semibold text-primary uppercase tracking-[0.18em]">Ouça a prévia (45 segundos)</p>
                  <audio controls className="w-full">
                    <source src={order.url_previa} type="audio/mpeg" />
                    Seu navegador não suporta reprodução de áudio.
                  </audio>
                </div>
              )}

              {isCurrent && step === "aguardando_aprovacao_letra" && (
                <div className="mt-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
                  <p className="mb-3 text-xs font-semibold text-primary uppercase tracking-[0.18em]">Sua letra está pronta</p>
                  <p className="text-sm text-muted-foreground">Confira o roteiro e a letra da música, e escolha se você aprova ou pede uma revisão.</p>

                  {briefSections.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Roteiro da música</p>
                        {briefSections.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowFullBrief((value) => !value)}
                            className="text-xs font-semibold text-[var(--sky-blue)]"
                          >
                            {showFullBrief ? "Ver menos" : "Ver mais"}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        {(showFullBrief ? briefSections : briefSections.slice(0, 3)).map((item) => (
                          <div key={item.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{item.label}</p>
                            <p className="leading-6">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {excerpt && (
                    <div className="mt-4 rounded-2xl border border-border bg-[var(--card)] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Letra</p>
                        {lyricPreview.length > 780 && (
                          <button
                            type="button"
                            onClick={() => setShowFullLyric((value) => !value)}
                            className="text-xs font-semibold text-[var(--sky-blue)]"
                          >
                            {showFullLyric ? "Ver menos" : "Ver mais"}
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                        {(showFullLyric ? lyricPreview : excerpt).replace(/\n{2,}/g, "\n")}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">O que você quer melhorar?</label>
                    <textarea
                      value={revisionFeedback}
                      onChange={(event) => setRevisionFeedback(event.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="Ex.: quero mais emoção no refrão, acrescentar uma parte sobre gratidão e mudar o último verso para ficar mais forte."
                      className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--sky-blue)]"
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleApproveLyric}
                      disabled={approvalLoading}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--sky-blue)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar letra"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRevision(revisionFeedback)}
                      disabled={approvalLoading}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--gold)] bg-background px-5 py-3 text-sm font-semibold text-[var(--gold)] disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pedir revisão"}
                    </button>
                  </div>
                  {approvalError && <p className="mt-3 text-sm text-destructive">{approvalError}</p>}
                </div>
              )}
              {isCurrent && step === "letra_aprovada" && (
                <div className="mt-3 rounded-2xl border border-[var(--sky-blue)]/30 bg-[var(--sky-blue)]/5 p-4">
                  <p className="mb-3 text-xs font-semibold text-primary uppercase tracking-[0.18em]">Sua letra foi aprovada</p>
                  <p className="text-sm text-muted-foreground">Agora vamos gerar a prévia musical antes de criar o checkout.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleGeneratePreview}
                      disabled={previewLoading}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] disabled:opacity-50"
                    >
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar prévia de música"}
                    </button>
                  </div>
                  {previewError && <p className="mt-3 text-sm text-destructive">{previewError}</p>}
                </div>
              )}
              {isCurrent && step === "previa" && (
                <div className="mt-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pagamento seguro</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sua prévia está pronta. Agora você pode confirmar o pagamento e receber a música final em seguida, diretamente no site ou pelo e-mail/WhatsApp informado no checkout.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Pagamento via Stripe com segurança padrão do mercado.</li>
                    <li>• Entrega digital imediata após a confirmação.</li>
                    <li>• Suporte e acompanhamento do pedido em um único lugar.</li>
                  </ul>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={openStripeCheckout}
                      disabled={checkoutLoading || !!(checkoutUrl || order.stripe_checkout_url)}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--sky-blue)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : checkoutUrl || order.stripe_checkout_url ? "Checkout criado" : "Ir para o pagamento"}
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
                  {isCurrent && step === "pagamento" && !order.stripe_checkout_url && (
                <div className="mt-3 rounded-2xl border border-[var(--sky-blue)]/30 bg-[var(--sky-blue)]/5 p-4">
                  <p className="mb-3 text-xs font-semibold text-primary uppercase tracking-[0.18em]">Sua música está pronta!</p>
                  <audio controls className="w-full mb-4">
                    <source src={order.url_musica} type="audio/mpeg" />
                    Seu navegador não suporta reprodução de áudio.
                  </audio>
                  <a
                    href={order.url_musica}
                    download
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--sky-blue)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--sky-blue)]/90"
                  >
                    <Download className="h-4 w-4" /> Baixar música
                  </a>
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
      className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 px-4 py-2 text-xs font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> Copiar código PIX
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
