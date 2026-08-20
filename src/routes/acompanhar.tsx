import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Search, Music, Sparkles, ArrowRight, Copy, Check, Clock, Download, ShieldCheck, Headphones, MessageCircle } from "lucide-react";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { approveLyric, createStripeCheckout, createStripePaymentIntent, getOrderStatus, getOrderStatusHistory, requestLyricRevision, STATUS_FLOW, STATUS_LABELS, updateCheckoutCustomerInfo, type PedidoStatus } from "@/lib/order.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { z } from "zod";

const searchSchema = z.object({ id: z.string().optional(), token: z.string().optional() });
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const PIX_PAYMENT_CODE = "11287911960";
const OWNER_WHATSAPP_NUMBER = "5541997232395";
const PREVIEW_LIMIT_SECONDS = 40;
const MUSIC_VISUAL_GIF_URL = "https://vfesffetlwtqqmrgxiis.supabase.co/storage/v1/object/sign/Video/47c69a37dc3c0ae5b2480181fa754c05.gif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNmJkMDAxYi0xM2VjLTRmOGItYjIxNy01ODNjYTc0MzU5MGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlby80N2M2OWEzN2RjM2MwYWU1YjI0ODAxODFmYTc1NGMwNS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg3MDE4NzUwLCJleHAiOjE4MTg1NTQ3NTB9.R_obqpB-CgExJIbhfjt6wiC-ijHP4BI_GDDNHwbBbOU";

const buildOrderDownloadWhatsAppLink = (order: Pick<Order, "id" | "nome_cliente" | "segunda_versao">) => {
  const message = `Olá! Meu nome é ${order.nome_cliente}. Estou com o pedido ${order.id} e não consegui baixar a música. Pode me enviar a música por aqui.${order.segunda_versao ? " da versão disponível" : " da música"}?`;
  return `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const buildPaymentProofWhatsAppLink = (order: Pick<Order, "id" | "nome_cliente">) => {
  const message = `Olá! Enviei o comprovante do pagamento da música personalizada. Pedido: ${order.id}. Nome: ${order.nome_cliente}.`;
  return `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const buildPaymentSupportWhatsAppLink = (order: Pick<Order, "id" | "nome_cliente">) => {
  const message = `Olá! Meu nome é ${order.nome_cliente}. Meu pedido é ${order.id}. Gostei da minha música e quero fazer o pagamento via PIX. Pode me orientar sobre a melhor forma de confirmar o pagamento?`;
  return `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const buildOrderIdentificationMessage = (order: Pick<Order, "id" | "nome_cliente" | "segunda_versao">, totalValue: number) => {
  const versionText = order.segunda_versao ? "2 versões" : "1 versão";
  return [
    `Olá ${order.nome_cliente}! Seu pedido foi registrado com sucesso.`,
    `Código do pedido: ${order.id}`,
    `Seleção: ${versionText} · Total: R$ ${totalValue.toFixed(2).replace(".", ",")}`,
    `Faça o pagamento por PIX para o CPF ${PIX_PAYMENT_CODE}.`,
    "Depois envie o comprovante pelo WhatsApp para confirmarmos o pagamento e identificarmos seu pedido rapidamente.",
    "Assim a gente consegue liberar sua música com mais rapidez e sem confusão.",
  ].join("\n");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const isValidOrderId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

export const Route = createFileRoute("/acompanhar")({
  validateSearch: (s) => searchSchema.parse(s),
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
  url_previa_segunda_versao: string | null;
  url_musica: string | null;
  url_musica_segunda_versao: string | null;
  segunda_versao: boolean;
  pix_qr_code: string | null;
  pix_fixado: boolean;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  cpf_cliente: string | null;
};

function OrderAudioPlayer({
  src,
  title,
  downloadLabel,
  hideDownload = false,
  actionLabel,
  previewLimitSeconds,
}: {
  src: string;
  title: string;
  downloadLabel?: string;
  hideDownload?: boolean;
  actionLabel?: string;
  previewLimitSeconds?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualPopupOpen, setVisualPopupOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncPlaybackState = () => {
      setIsPlaying(!audio.paused && !audio.ended);
    };

    const onLoadedMetadata = () => {
      const audioDuration = audio.duration || 0;
      const clampedDuration = previewLimitSeconds ? Math.min(audioDuration, previewLimitSeconds) : audioDuration;
      setDuration(clampedDuration);
      setCurrentTime(audio.currentTime || 0);
      syncPlaybackState();
    };

    const onTimeUpdate = () => {
      if (previewLimitSeconds && audio.currentTime >= previewLimitSeconds) {
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
        setVisualPopupOpen(false);
        return;
      }

      const audioDuration = audio.duration || 0;
      const clampedDuration = previewLimitSeconds ? Math.min(audioDuration, previewLimitSeconds) : audioDuration;
      setCurrentTime(audio.currentTime || 0);
      setDuration(clampedDuration);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setVisualPopupOpen(false);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    syncPlaybackState();

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [previewLimitSeconds, src]);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (previewLimitSeconds && audio.currentTime >= previewLimitSeconds) {
        audio.currentTime = 0;
      }

      try {
        await audio.play();
        setIsPlaying(true);
        setVisualPopupOpen(true);
      } catch {
        setIsPlaying(false);
        setVisualPopupOpen(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
    setVisualPopupOpen(false);
  };

  const progressValue = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const thumbLeft = progressValue > 0 ? `calc(${progressValue}% - 9px)` : "0px";

  return (
    <>
      <div className="mx-auto mt-3 w-[94%] max-w-[700px] sm:w-[88%]">
        <div className="relative overflow-hidden rounded-[18px] border border-[#ff84b6]/40 bg-[linear-gradient(90deg,#ff7d9e,#ef78d2_46%,#b15cea)] shadow-[0_16px_30px_rgba(255,118,173,0.22)] sm:rounded-[24px]">
          {hideDownload ? (
            <div className="relative flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white sm:gap-3 sm:py-4 sm:text-lg">
              <Headphones className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>{actionLabel ?? `OUVIR ${title}`}</span>
            </div>
          ) : (
            <>
              <a
                href={src}
                download
                aria-label={downloadLabel ?? `Baixar ${title}`}
                title={downloadLabel ?? `Baixar ${title}`}
                className="relative flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 hover:brightness-110 sm:gap-3 sm:py-4 sm:text-xl"
              >
                <Download className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span>{downloadLabel ?? `Baixar ${title}`}</span>
              </a>

              <span className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[10px] border border-white/20 bg-[#1d1c2d]/60 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:right-3 sm:h-10 sm:w-10 sm:rounded-[14px]">
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto mt-2.5 w-[94%] max-w-[700px] sm:mt-3 sm:w-[88%]">
        <div className="flex items-center gap-2 rounded-[999px] border border-white/10 bg-[#16202d]/80 px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_22px_rgba(0,0,0,0.25)] sm:gap-3 sm:px-3.5 sm:py-3">
          <button
            type="button"
            aria-label={isPlaying ? "Pausar música" : "Tocar música"}
            onClick={() => void handleToggle()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-[#ffbfd3] bg-[#111821] text-[#f8f5f2] shadow-[0_0_0_6px_rgba(255,94,140,0.15)] transition-transform hover:scale-[1.02] sm:h-12 sm:w-12"
          >
            {isPlaying ? (
              <span className="flex items-center justify-center gap-1.25">
                <span className="h-2.5 w-1 rounded-full bg-white sm:h-4" />
                <span className="h-2.5 w-1 rounded-full bg-white sm:h-4" />
              </span>
            ) : (
              <span className="ml-1 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-[#f8f5f2] sm:border-y-[7px] sm:border-l-[10px]" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 text-[#111821] sm:gap-2.5">
            <span className="min-w-[30px] text-[9px] font-medium text-[#f8f5f2] sm:min-w-[38px] sm:text-xs">{formatTime(currentTime)}</span>
            <div className="relative flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-[#d7d4d3]/30 sm:h-3">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff8db8,#ff5d73,#d55ae6)] transition-all duration-150"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#ffe7f2] bg-[#ff7ca8] shadow-[0_0_0_4px_rgba(255,123,167,0.18)] sm:h-4 sm:w-4"
                style={{ left: thumbLeft }}
              />
            </div>
            <span className="min-w-[30px] text-right text-[9px] font-medium text-[#f8f5f2] sm:min-w-[38px] sm:text-xs">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="auto" />

      <Dialog open={visualPopupOpen} onOpenChange={(open) => {
        setVisualPopupOpen(open);
        if (!open) {
          const audio = audioRef.current;
          if (audio && !audio.paused) {
            audio.pause();
            setIsPlaying(false);
          }
        }
      }}>
        <DialogContent
          hideCloseButton
          className="max-w-[1280px] border-[2px] border-[#ff6b88] bg-[#05070d] p-0 text-white shadow-[0_0_0_2px_rgba(255,107,136,0.18),0_30px_80px_rgba(0,0,0,0.75)] sm:rounded-[32px]"
        >
          <div className="relative overflow-hidden rounded-[30px] bg-[#05070d] px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="text-left">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#e9dae4]">Música</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">Versão 1</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const audio = audioRef.current;
                  if (audio && !audio.paused) {
                    audio.pause();
                  }
                  setIsPlaying(false);
                  setVisualPopupOpen(false);
                }}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition hover:bg-white/10"
              >
                <span className="text-lg leading-none">×</span>
                <span>Fechar</span>
              </button>
            </div>

            <div className="mt-5 rounded-[26px] border-[2px] border-[#ff7ae5]/80 bg-[#090b16] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_40px_rgba(255,106,221,0.18)]">
              <div
                className="relative overflow-hidden rounded-[20px] border border-[#ff7ae5]/60"
                style={{
                  background: "radial-gradient(circle at center, rgba(255,120,222,0.30) 0%, rgba(45,17,52,0.90) 28%, rgba(11,10,18,1) 72%)",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%,transparent_65%,rgba(255,255,255,0.05))]" />
                <img
                  src={MUSIC_VISUAL_GIF_URL}
                  alt="Visual animado da música"
                  className="relative z-10 h-[420px] w-full rounded-[20px] object-contain object-center sm:h-[520px]"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => void handleToggle()}
                className="rounded-full border border-[#ff7ae5]/80 bg-[#f0edf4] px-9 py-3 text-xl font-semibold text-[#10131a] shadow-[0_0_18px_rgba(255,122,229,0.25)] transition hover:brightness-105"
              >
                {isPlaying ? "Pausar" : "Ouvir"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TrackingPage() {
  const { id: initialId, token: initialToken } = useSearch({ from: "/acompanhar" });
  const fetchStatus = useServerFn(getOrderStatus);
  const fetchHistory = useServerFn(getOrderStatusHistory);
  const createCheckout = useServerFn(createStripeCheckout);
  const updateCustomerInfo = useServerFn(updateCheckoutCustomerInfo);
  const approveLyricFn = useServerFn(approveLyric);
  const requestRevisionFn = useServerFn(requestLyricRevision);
  const [id, setId] = useState(initialId ?? "");
  const [orderToken, setOrderToken] = useState(initialToken ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'whatsapp'>('card');
  const [checkoutCustomer, setCheckoutCustomer] = useState({ email: "", phone: "", cpf: "11287911960" });
  const [secondVersionSelected, setSecondVersionSelected] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PedidoStatus | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoRefreshMessageIndex, setAutoRefreshMessageIndex] = useState(0);
  const [err, setErr] = useState("");
  const autoRefreshMessages = [
    "Atualizando seu pedido automaticamente...",
    "Verificando status do pagamento a cada 5 segundos...",
    "Fique tranquilo, estamos mantendo tudo sincronizado...",
    "Aguarde, seu pedido está sendo atualizado em segundo plano...",
  ];
  const search = useCallback(async (orderId: string, options?: { preserveExisting?: boolean }) => {
    const trimmedId = orderId.trim();
    const preserveExisting = options?.preserveExisting ?? false;

    if (!trimmedId) {
      setErr("Informe o código do pedido.");
      return;
    }

    if (!isValidOrderId(trimmedId)) {
      setErr("Código do pedido inválido. Verifique o código e tente novamente.");
      setOrder(null);
      setHistory([]);
      return;
    }

    if (!preserveExisting) {
      setLoading(true);
      setErr("");
      setOrder(null);
      setHistory([]);
    } else {
      setErr("");
    }

    try {
      const row = (await fetchStatus({ data: { id: trimmedId, token: orderToken || initialToken || undefined } })) as unknown as Order & { access_token?: string };
      setOrder(row);
      setOrderToken(row.access_token ?? (orderToken || initialToken || ""));
      const hist = await fetchHistory({ data: { id: trimmedId, token: row.access_token ?? (orderToken || initialToken || undefined) } });
      setHistory(hist);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao buscar o pedido.");
    } finally {
      if (!preserveExisting) {
        setLoading(false);
      }
    }
  }, [fetchStatus, fetchHistory]);

  const refreshOrder = useCallback(async () => {
    if (!order?.id) return;
    try {
      await search(order.id, { preserveExisting: true });
    } catch {
      // ignore refresh errors, user can retry manually
    }
  }, [order?.id, search]);

  useEffect(() => {
    if (!order?.id) {
      setAutoRefreshMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      refreshOrder();
      setAutoRefreshMessageIndex((prev) => (prev + 1) % autoRefreshMessages.length);
    }, 40000);

    return () => clearInterval(interval);
  }, [order?.id, refreshOrder]);

  const openStripeCheckout = async (withSecondVersion = secondVersionSelected) => {
    if (!order) return;
    setCheckoutError("");
    setPaymentError("");
    setPaymentIntentClientSecret(null);

    setCheckoutLoading(true);
    try {
      const result = await createCheckout({
        data: {
          id: order.id,
          token: orderToken || initialToken || undefined,
          secondVersion: withSecondVersion,
        },
      });

      if (!result.checkoutUrl) {
        throw new Error("Não foi possível abrir o checkout do Stripe.");
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Erro ao criar pagamento Stripe.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (order?.status) {
      setSelectedStatus(order.status);
    }
  }, [order?.status]);

  useEffect(() => {
    if (!order) return;
    setSecondVersionSelected(Boolean(order.segunda_versao));
    setCheckoutCustomer({
      email: order.email_cliente ?? "",
      phone: order.telefone_cliente ?? "",
      cpf: order.cpf_cliente ?? "11287911960",
    });
  }, [order?.id, order?.email_cliente, order?.telefone_cliente, order?.cpf_cliente, order?.segunda_versao]);

  const saveCheckoutCustomerInfo = useCallback(async () => {
    if (!order) return;

    const email = checkoutCustomer.email.trim();
    const phone = checkoutCustomer.phone.trim();
    const cpf = checkoutCustomer.cpf.replace(/\D/g, "");

    if (!phone || !cpf) {
      setCheckoutError("Preencha WhatsApp e CPF antes de concluir o pagamento.");
      return false;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const normalizedCpf = cpf.replace(/\D/g, "");

    if (normalizedPhone.length < 10 || normalizedCpf.length < 11) {
      setCheckoutError("WhatsApp e CPF precisam estar completos para continuar.");
      return false;
    }

    try {
      await updateCustomerInfo({
        data: {
          id: order.id,
          token: orderToken || initialToken || undefined,
          email_cliente: email || null,
          telefone_cliente: normalizedPhone,
          cpf_cliente: normalizedCpf,
        },
      });

      setOrder((current) => current ? {
        ...current,
        email_cliente: email || null,
        telefone_cliente: normalizedPhone,
        cpf_cliente: normalizedCpf,
      } : current);

      return true;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Não foi possível salvar os dados do cliente.");
      return false;
    }
  }, [checkoutCustomer, order, updateCustomerInfo]);

  const handleApproveLyric = async () => {
    if (!order) return;
    setApprovalError("");
    setApprovalLoading(true);
    try {
      await approveLyricFn({ data: { id: order.id, token: orderToken || initialToken || undefined } });
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
      await requestRevisionFn({ data: { id: order.id, token: orderToken || initialToken || undefined, feedback: feedback ?? "" } });
      await search(order.id);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : "Erro ao solicitar revisão da letra.");
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      search(initialId);
    }
  }, [initialId, search]);

  return (
    <div
      className="min-h-screen bg-[#090b10] text-zinc-100"
      style={{
        ["--sky-blue" as any]: "#ff5d73",
        ["--gold" as any]: "#d4af69",
        ["--soft-gray" as any]: "#0f141b",
        ["--card" as any]: "#111821",
        ["--primary" as any]: "#f8f5f2",
        ["--muted-foreground" as any]: "#a7b1c2",
      }}
    >
      <header className="border-b border-white/10 bg-[#0f1218]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 md:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff5d73]/10 text-[#ff7a8d] ring-1 ring-[#ff5d73]/20">
            <Music className="h-4 w-4" />
          </span>
          <div>
            <h1 className="font-display text-base font-semibold text-[#f8f5f2]">Acompanhar Pedido</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Canção de Fé</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-5 py-12 md:px-8">
        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111821]/90 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_28px_80px_rgba(0,0,0,0.55)] md:p-8">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">Código do pedido</span>
            <div className="mt-2 flex gap-2">
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && id && search(id)}
                placeholder="Cole aqui o código que você recebeu"
                className="flex-1 rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 font-mono text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[#ff5d73]"
              />
              <button
                onClick={() => id && search(id)}
                disabled={!id || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d6d] via-[#d946ef] to-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(217,70,239,0.35)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {err && <p className="mt-4 rounded-xl border border-[#ff5d73]/30 bg-[#ff5d73]/10 px-4 py-3 text-sm text-[#ffb3bf]">{err}</p>}
        </div>

        {order && (
          <Timeline
            order={order}
            history={history}
            checkoutError={checkoutError}
            checkoutLoading={checkoutLoading}
            paymentError={paymentError}
            paymentIntentClientSecret={paymentIntentClientSecret}
            paymentProcessing={paymentProcessing}
            setPaymentProcessing={setPaymentProcessing}
            setPaymentError={setPaymentError}
            setPaymentIntentClientSecret={setPaymentIntentClientSecret}
            refreshOrder={refreshOrder}
            approvalLoading={approvalLoading}
            approvalError={approvalError}
            secondVersionSelected={secondVersionSelected}
            setSecondVersionSelected={setSecondVersionSelected}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            handleApproveLyric={handleApproveLyric}
            handleRequestRevision={handleRequestRevision}
            openStripeCheckout={openStripeCheckout}
            checkoutDialogOpen={checkoutDialogOpen}
            setCheckoutDialogOpen={setCheckoutDialogOpen}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
            historyOpen={historyOpen}
            setHistoryOpen={setHistoryOpen}
            checkoutCustomer={checkoutCustomer}
            setCheckoutCustomer={setCheckoutCustomer}
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
  checkoutError,
  checkoutLoading,
  approvalLoading,
  approvalError,
  secondVersionSelected,
  setSecondVersionSelected,
  paymentMethod,
  setPaymentMethod,
  handleApproveLyric,
  handleRequestRevision,
  openStripeCheckout,
  checkoutDialogOpen,
  setCheckoutDialogOpen,
  paymentError,
  paymentIntentClientSecret,
  paymentProcessing,
  setPaymentProcessing,
  setPaymentError,
  setPaymentIntentClientSecret,
  refreshOrder,
  selectedStatus,
  onSelectStatus,
  historyOpen,
  setHistoryOpen,
  checkoutCustomer,
  setCheckoutCustomer,
}: {
  order: Order;
  history: Array<any>;
  checkoutError: string;
  checkoutLoading: boolean;
  approvalLoading: boolean;
  approvalError: string;
  secondVersionSelected: boolean;
  setSecondVersionSelected: Dispatch<SetStateAction<boolean>>;
  handleApproveLyric: () => Promise<void>;
  handleRequestRevision: (feedback?: string) => Promise<void>;
  openStripeCheckout: (withSecondVersion?: boolean) => Promise<void>;
  checkoutDialogOpen: boolean;
  setCheckoutDialogOpen: Dispatch<SetStateAction<boolean>>;
  paymentError: string;
  paymentIntentClientSecret: string | null;
  paymentProcessing: boolean;
  setPaymentProcessing: Dispatch<SetStateAction<boolean>>;
  setPaymentError: Dispatch<SetStateAction<string>>;
  setPaymentIntentClientSecret: Dispatch<SetStateAction<string | null>>;
  refreshOrder: () => Promise<void>;
  paymentMethod: "pix" | "card" | "whatsapp";
  setPaymentMethod: Dispatch<SetStateAction<"pix" | "card" | "whatsapp">>;
  selectedStatus: PedidoStatus | null;
  onSelectStatus: Dispatch<SetStateAction<PedidoStatus | null>>;
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  checkoutCustomer: { email: string; phone: string; cpf: string };
  setCheckoutCustomer: Dispatch<SetStateAction<{ email: string; phone: string; cpf: string }>>;
}) {
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const totalPedido = Number((19.9 + (secondVersionSelected ? 9.9 : 0)).toFixed(2));
  const isStripeProcessing = order.status === "pagamento" && !["paid", "succeeded", "complete"].includes((order.stripe_payment_status ?? "").toLowerCase());
  const effectiveStatus = order.status === "pagamento" && ["paid", "succeeded", "complete"].includes((order.stripe_payment_status ?? "").toLowerCase())
    ? "pago"
    : order.status;
  const currentIdx = STATUS_FLOW.indexOf(effectiveStatus);
  const timelineLabel = (step: PedidoStatus) => {
    if (step === "pagamento" && isStripeProcessing) {
      return "Pagamento em análise";
    }

    if (step === "pago" && order.status === "pago") {
      return "Pagamento recebido - liberando seu produto";
    }

    return STATUS_LABELS[step];
  };
  const briefSections = buildMusicBriefSections(order.roteiro_ia);
  const lyricPreview = order.letra_gerada ? order.letra_gerada.trim() : "";
  const excerpt = lyricPreview.length > 1200 ? `${lyricPreview.slice(0, 1200).trim()}...` : lyricPreview;
  const [showFullBrief, setShowFullBrief] = useState(false);
  const [showFullLyric, setShowFullLyric] = useState(true);
  const [revealed, setRevealed] = useState(0);
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0);
  // texto + tempo (ms) que a frase permanece visível antes de avançar para a próxima
  const musicGenerationMessages = [
    { text: "Aguarde no máximo 3 minutos que a música estará pronta.", duration: 60000 },
  ];

  useEffect(() => {
    setRevealed(0);
    const target = currentIdx + 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= target; i++) {
      timers.push(setTimeout(() => setRevealed(i), i * 600));
    }
    return () => timers.forEach(clearTimeout);
  }, [order.id, currentIdx]);

  useEffect(() => {
    if (order.status !== "gerando_musica") {
      setGenerationMessageIndex(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 1; i < musicGenerationMessages.length; i++) {
      elapsed += musicGenerationMessages[i - 1].duration;
      timers.push(setTimeout(() => setGenerationMessageIndex(i), elapsed));
    }

    return () => timers.forEach(clearTimeout);
  }, [musicGenerationMessages, order.status]);

  const shouldShowDuration = Boolean(order.duracao_segundos && order.duracao_segundos !== 45 && order.duracao_segundos > 0);
  const paymentReceived = order.status === "pago" || order.status === "entregue" || order.status === "musica_pronta" ||
    (order.status === "pagamento" && ["paid", "succeeded", "complete"].includes((order.stripe_payment_status ?? "").toLowerCase()));
  const musicBeingGenerated = order.status === "gerando_musica";
  const primaryPreviewUrl = order.url_previa ?? order.url_musica;
  const secondaryPreviewUrl = order.url_previa_segunda_versao ?? order.url_musica_segunda_versao;
  const previewReady = Boolean(primaryPreviewUrl);
  const showSecondPreview = Boolean(secondaryPreviewUrl && (secondVersionSelected || order.segunda_versao || paymentReceived));

  return (
    <div className="mx-auto mt-4 w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111821]/90 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_28px_80px_rgba(0,0,0,0.55)] sm:p-6 md:mt-8 md:p-8">
      <div className="mb-4 sm:mb-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 sm:text-xs">Pedido de</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#f8f5f2] sm:text-2xl">{order.nome_cliente}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {order.genero_musical ?? "Gênero não informado"}
          {shouldShowDuration ? ` · ${order.duracao_segundos}s` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${order.segunda_versao ? "border border-[#d4af69] bg-[#d4af69]/10 text-[#f3d59d]" : "border border-white/10 bg-[#0d1117] text-zinc-400"}`}>
            {order.segunda_versao ? "2 versões incluídas" : "1 versão"}
          </span>
        </div>

        {isStripeProcessing && (
          <div className="mt-4 rounded-2xl border border-[#d4af69]/30 bg-[#d4af69]/10 p-4 text-sm text-[#f3d59d]">
            <p className="font-semibold">Pagamento em análise</p>
            <p className="mt-1 text-zinc-300">Aguarde por gentileza. Estamos confirmando o pagamento com a Stripe e em seguida liberamos sua música.</p>
          </div>
        )}
        {paymentReceived && (
          <div className="mt-4 rounded-2xl border border-[#34d399]/30 bg-[#34d399]/10 p-4 text-sm text-[#bbf7d0]">
            <p className="font-semibold">Pagamento recebido com sucesso</p>
            <p className="mt-1 text-zinc-200">Pagamento confirmado. Sua música completa será liberada automaticamente em instantes.</p>
            {!order.url_musica && !order.url_musica_segunda_versao && (
              <p className="mt-2 font-medium text-[#ffd7dd]">Estamos finalizando a liberação do arquivo completo para download.</p>
            )}
          </div>
        )}
        {musicBeingGenerated && (
          <div className="mt-4 rounded-[28px] border border-[#d4af69]/20 bg-[#171b22] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 place-items-center rounded-full border border-[#d4af69]/40 bg-[#d4af69]/10 text-[#f3d59d]">
                <Clock className="h-7 w-7 animate-spin" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3d59d]">Produzindo sua música</p>
                <h3 className="font-display text-[1.5rem] leading-none font-semibold text-[#f8f5f2] sm:text-[1.7rem]">Aguarde um momento</h3>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#d4af69]/25 bg-[#1f2630] p-4 text-sm text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p
                key={`generation-message-${generationMessageIndex}`}
                className="animate-in fade-in-0 slide-in-from-bottom-1 text-base font-medium leading-relaxed text-[#f8f5f2] duration-700"
              >
                {musicGenerationMessages[generationMessageIndex]?.text ?? "Estamos preparando sua música com todo o cuidado."}
              </p>
              <p className="mt-3 text-zinc-300">
                Estamos finalizando sua música com carinho. Isso costuma levar alguns minutos até a plataforma Suno responder e liberar sua música final.
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff5d73] via-[#d946ef] to-[#8b5cf6] transition-all duration-700 ease-out"
                  style={{ width: `${((generationMessageIndex + 1) / musicGenerationMessages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {previewReady && !paymentReceived && primaryPreviewUrl && (
          <div className="mt-4 rounded-[28px] border border-[#ff7ae5]/25 bg-[#171b22] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold text-[#ffd7e7]">Essa música foi feita especialmente para você.</p>
            <h3 className="mt-2 font-display text-[1.8rem] leading-none font-semibold text-[#f8f5f2]">Sua prévia está pronta!</h3>
            <p className="mt-2 text-sm text-zinc-300">Ouça agora uma prévia de até {PREVIEW_LIMIT_SECONDS} segundos da sua música.</p>

            <OrderAudioPlayer
              src={`${primaryPreviewUrl}#t=0,${PREVIEW_LIMIT_SECONDS}`}
              title="Prévia da versão 1"
              hideDownload
              actionLabel="OUVIR PRÉVIA"
              previewLimitSeconds={PREVIEW_LIMIT_SECONDS}
            />

            {showSecondPreview && secondaryPreviewUrl && (
              <OrderAudioPlayer
                src={`${secondaryPreviewUrl}#t=0,${PREVIEW_LIMIT_SECONDS}`}
                title="Prévia da versão 2"
                hideDownload
                actionLabel="OUVIR PRÉVIA 2"
                previewLimitSeconds={PREVIEW_LIMIT_SECONDS}
              />
            )}

            {!showSecondPreview && secondaryPreviewUrl && (
              <p className="mt-3 text-xs text-zinc-400">
                Quer ouvir também a prévia da versão 2? Ative a opção <strong className="text-[#f3d59d]">Quero mais uma versão da mesma história</strong>.
              </p>
            )}
          </div>
        )}
        {paymentReceived && (order.url_musica || order.url_musica_segunda_versao) && (
          <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-5">
            <div className="mx-auto w-[94%] max-w-[700px] sm:w-[88%]">
              <div className="relative overflow-hidden rounded-[18px] border border-[#ff7ae5]/25 bg-[linear-gradient(90deg,rgba(255,118,178,0.18),rgba(111,87,255,0.10),rgba(18,22,33,0.85))] px-2 py-1.5 shadow-[0_18px_35px_rgba(18,14,31,0.48)] sm:rounded-[24px] sm:px-3 sm:py-2.5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%)]" />
                <div className="relative flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 overflow-hidden sm:gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#ff7ea6,#c55ae7)] text-white shadow-[0_0_0_3px_rgba(255,255,255,0.06),0_12px_30px_rgba(255,112,173,0.4)] sm:h-14 sm:w-14">
                      <Music className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-[0.96rem] font-semibold leading-none tracking-[-0.05em] text-[#f8f5f2] sm:text-[1.6rem]">Música disponível</h3>
                      <p className="mt-1 text-[9px] text-zinc-200 sm:text-xs">Atualizado em {new Date(order.status_atualizado_em).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  <div className="flex items-end gap-1 pr-1 sm:gap-1.25">
                    {[28, 42, 34, 54, 38, 47, 31, 39, 50, 27, 44, 33, 52, 36, 46, 29].map((height, index) => (
                      <span
                        key={`header-eq-${index}`}
                        className="block rounded-full bg-[linear-gradient(180deg,#ffddf3,#ff8ec7,#c45aff)] shadow-[0_0_12px_rgba(255,141,202,0.38)]"
                        style={{ height: `${height * 0.65}px`, width: "4px", opacity: 0.72 + (index % 5) * 0.06 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-0 w-[94%] max-w-[700px] sm:w-[88%]">
              <a
                href={buildOrderDownloadWhatsAppLink(order)}
                target="_blank"
                rel="noreferrer"
                className="group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-[18px] border border-[#1bdc6a]/70 bg-[linear-gradient(135deg,#2de77d_0%,#1acb6a_30%,#18b75d_100%)] px-2.5 py-2 text-[#062914] shadow-[0_18px_34px_rgba(25,196,101,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(25,196,101,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] sm:gap-3 sm:rounded-[26px] sm:px-4 sm:py-3.5"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_28%)]" />

                <div className="relative flex items-center gap-2 overflow-hidden sm:gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#052d16]/10 ring-1 ring-[#052d16]/10 backdrop-blur-sm sm:h-12 sm:w-12">
                    <MessageCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  </span>

                  <div className="min-w-0 text-left">
                    <div className="text-[7px] font-black uppercase tracking-[0.16em] text-[#0a371f]/75 sm:text-[10px]">Atendimento</div>
                    <div className="truncate text-[11px] font-extrabold sm:text-base">Solicitar download por WhatsApp</div>
                  </div>
                </div>

                <span className="relative shrink-0 rounded-full bg-[#062914]/10 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#062914] shadow-[inset_0_0_0_1px_rgba(6,41,20,0.08)] sm:px-2.5 sm:text-[9px]">
                  Clique
                </span>
              </a>
            </div>

            <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-4">
              {order.url_musica && (
                <OrderAudioPlayer
                  src={order.url_musica}
                  title={order.url_musica_segunda_versao ? "Versão 1" : "Sua música"}
                  downloadLabel="Baixar versão 1"
                />
              )}

              {order.url_musica_segunda_versao && (
                <OrderAudioPlayer
                  src={order.url_musica_segunda_versao}
                  title="Versão 2"
                  downloadLabel="Baixar versão 2"
                />
              )}
            </div>

            <div className="mx-auto w-[92%] max-w-[760px] rounded-[28px] border border-[#ff7ae5]/30 bg-[#111821]/80 p-4 shadow-[0_18px_35px_rgba(13,12,20,0.42)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#ff7ae5]/50 bg-[#201426] text-[#ff8ac7] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-[2rem] font-semibold leading-none tracking-[-0.05em] text-[#f8f5f2]">Arquivos seguros e de alta qualidade</h3>
                    <p className="mt-2 text-sm text-zinc-300">Baixe e ouça quando quiser. Suas músicas estão protegidas e disponíveis para você.</p>
                  </div>
                </div>

                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#ff7ae5]/50 bg-[#201426] text-[#ff8ac7] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                  <Headphones className="h-8 w-8" />
                </div>
              </div>
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
          const isSelected = selectedStatus === step;

          return (
            <li
              key={step}
              className={`relative transition-all duration-500 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`
              }
            >
              <button
                type="button"
                onClick={() => onSelectStatus(step)}
                className={`group flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  isSelected ? "bg-[#ff5d73]/10 ring-2 ring-[#ff5d73]/20" : "hover:bg-[#171d26]"
                } ${isReached ? "" : "opacity-70"}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ${
                    isCurrent
                      ? "border-[#d4af69] bg-[#d4af69] text-[#100d09] shadow-[0_10px_25px_rgba(212,175,105,0.35)]"
                      : isDone
                        ? "border-[#ff5d73] bg-[#ff5d73] text-white"
                        : "border-white/10 bg-[#0d1117] text-zinc-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Sparkles className="h-3.5 w-3.5" /> : <ArrowRight className="h-3 w-3" />}
                </span>
                <div className="flex-1">
                  <div className={`font-display text-base font-semibold ${isCurrent ? "text-[#f8f5f2]" : isDone ? "text-[#f8f5f2]" : "text-zinc-400"}`}>
                    {timelineLabel(step)}
                  </div>
                  {isCurrent && (
                    <div className="mt-1 text-xs text-zinc-400">
                      Atualizado em {new Date(order.status_atualizado_em).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </button>

              {isCurrent && step === "aguardando_aprovacao_letra" && (
                <div className="mt-3 rounded-2xl border border-[#d4af69]/25 bg-[#d4af69]/5 p-4">
                  <p className="mb-3 text-xs font-semibold text-[#f3d59d] uppercase tracking-[0.18em]">Sua letra está pronta</p>
                  <p className="text-sm text-zinc-300">Confira o roteiro e a letra da música, e escolha se você aprova ou pede uma revisão.</p>

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
                        <button
                          type="button"
                          onClick={() => setShowFullLyric((value) => !value)}
                          className="text-xs font-semibold text-[var(--sky-blue)]"
                        >
                          {showFullLyric ? "Ocultar letra" : "Mostrar letra"}
                        </button>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-[11px] text-muted-foreground">
                        <span><strong className="text-primary">Pedido por:</strong> {order.nome_cliente}</span>
                        <span><strong className="text-primary">Para:</strong> {order.para_quem || "Não informado"}</span>
                        <span><strong className="text-primary">Ocasião:</strong> {order.ocasiao || "Não informada"}</span>
                      </div>

                      {showFullLyric ? (
                        <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                          {lyricPreview}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                          {lyricPreview.slice(0, 220)}{lyricPreview.length > 220 ? "..." : ""}
                        </div>
                      )}
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
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#ff5d73] via-[#d946ef] to-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(217,70,239,0.35)] disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar letra"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRevision(revisionFeedback)}
                      disabled={approvalLoading}
                      className="inline-flex items-center justify-center rounded-full border border-[#d4af69] bg-[#0d1117] px-5 py-3 text-sm font-semibold text-[#f3d59d] disabled:opacity-50"
                    >
                      {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pedir revisão"}
                    </button>
                  </div>
                  {approvalError && <p className="mt-3 text-sm text-destructive">{approvalError}</p>}
                </div>
              )}
              {isCurrent && step === "gerando_musica" && (
                <div className="mt-3 rounded-[28px] border border-[#d4af69]/20 bg-[#171b22] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center gap-4">
                    <div className="relative grid h-14 w-14 place-items-center rounded-full border border-[#d4af69]/40 bg-[#d4af69]/10 text-[#f3d59d]">
                      <Clock className="h-7 w-7 animate-spin" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3d59d]">Produzindo sua música</p>
                      <h3 className="font-display text-[1.7rem] leading-none font-semibold text-[#f8f5f2]">Aguarde um momento</h3>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[#d4af69]/25 bg-[#1f2630] p-4 text-sm text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p
                      key={generationMessageIndex}
                      className="animate-in fade-in-0 slide-in-from-bottom-1 text-base font-medium leading-relaxed text-[#f8f5f2] duration-700"
                    >
                      {musicGenerationMessages[generationMessageIndex].text}
                    </p>
                    <p className="mt-3 text-zinc-300">
                      Estamos finalizando sua música com carinho. Isso costuma levar alguns minutos até a plataforma Suno responder e liberar sua música final.
                    </p>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff5d73] via-[#d946ef] to-[#8b5cf6] transition-all duration-700 ease-out"
                        style={{ width: `${((generationMessageIndex + 1) / musicGenerationMessages.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {isCurrent && (step === "previa" || step === "pagamento") && (
                <div className="mt-3 rounded-[28px] border border-[#d4af69]/20 bg-[#171b22] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#ff5d73] to-[#8b5cf6] text-sm font-black text-white">1</span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff99a8]">Checkout</p>
                      <h3 className="font-display text-[2rem] leading-none font-semibold text-[#f8f5f2]">Gostou? Libere sua música completa</h3>
                      <p className="mt-2 text-sm text-zinc-300">Pagamento seguro e liberação automática após confirmação.</p>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("pix")}
                      className={`rounded-[18px] border px-4 py-3 text-sm font-black transition ${paymentMethod === "pix" ? "border-[#ff5d73] bg-[#ff5d73] text-white shadow-[0_10px_20px_rgba(255,93,115,0.28)]" : "border-[#d4af69]/30 bg-[#1b1b23] text-[#f3d59d] hover:bg-[#d4af69]/10"}`}
                    >
                      PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-[18px] border px-4 py-3 text-sm font-black transition ${paymentMethod === "card" ? "border-[#d4af69] bg-[#d4af69] text-[#1a1400] shadow-[0_10px_20px_rgba(212,175,105,0.28)]" : "border-[#d4af69]/30 bg-[#1b1b23] text-[#f3d59d] hover:bg-[#d4af69]/10"}`}
                    >
                      CARTÃO
                    </button>
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="space-y-4">
                      <div className="rounded-[20px] border border-[#d4af69]/25 bg-[#1f2630] p-4 text-sm text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3d59d]">PIX / CPF</p>
                        <p className="mt-3 text-3xl font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]">
                          {secondVersionSelected ? "2 versões · R$ 29,80" : "1 versão · R$ 19,90"}
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">PIX CPF: <span className="font-semibold text-[#f8f5f2]">{PIX_PAYMENT_CODE}</span></p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <CopyPixButton pixCode={PIX_PAYMENT_CODE} />
                          <a
                            href={buildPaymentSupportWhatsAppLink(order)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-[#d4af69]/40 bg-[#d4af69]/10 px-4 py-2 text-xs font-semibold text-[#f3d59d] transition hover:bg-[#d4af69]/15"
                          >
                            <MessageCircle className="h-4 w-4" /> Quero pagar no Pix, Falar com atendente
                          </a>
                          <a
                            href={buildPaymentProofWhatsAppLink(order)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-[#25d366] bg-[#25d366]/10 px-4 py-2 text-xs font-semibold text-[#d9ffe9] transition hover:bg-[#25d366]/15"
                          >
                            <MessageCircle className="h-4 w-4" /> Enviar comprovante
                          </a>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-[#d4af69]/25 bg-[#d4af69]/10 p-3 text-sm text-zinc-200">
                        <p className="font-semibold text-[#f3d59d]">Seu pedido está salvo</p>
                        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0d1117] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Código do pedido</p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="font-mono text-sm font-bold text-white">{order.id}</span>
                            <CopyOrderMessageButton order={order} totalValue={totalPedido} />
                          </div>
                        </div>
                        <p className="mt-3 leading-relaxed text-zinc-300">
                          {secondVersionSelected
                            ? "Você escolheu 2 versões. Faça o pagamento de R$ 29,80, depois envie o comprovante pelo WhatsApp e mencione o código do pedido para que a gente identifique seu pedido rapidamente."
                            : "Você escolheu 1 versão. Faça o pagamento de R$ 19,90, depois envie o comprovante pelo WhatsApp e mencione o código do pedido para que a gente identifique seu pedido rapidamente."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[20px] border border-[#d4af69]/25 bg-[#1f2630] p-4 text-sm text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full border border-[#ff5d73] bg-[#ff5d73]/15 text-sm font-black text-[#ffd5dc]">✓</span>
                          <div>
                            <p className="text-[1.05rem] font-bold text-[#f8f5f2]">Pagamento seguro</p>
                            <p className="mt-1 text-[0.98rem] leading-relaxed text-zinc-300">
                              Você será redirecionado para o ambiente seguro do Stripe, onde o valor final será calculado corretamente e a confirmação acontece oficialmente.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void openStripeCheckout(secondVersionSelected)}
                        disabled={checkoutLoading}
                        className="w-full rounded-[18px] bg-gradient-to-r from-[#ff5d73] via-[#d946ef] to-[#8b5cf6] px-5 py-4 text-[1.05rem] font-black text-white shadow-[0_12px_30px_rgba(217,70,239,0.28)] disabled:opacity-50"
                      >
                        {checkoutLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processando...</span> : `Ir para o Stripe · R$ ${totalPedido.toFixed(2).replace(".", ",")}`}
                      </button>
                    </div>
                  )}

                  <div className="mt-4 rounded-[18px] border border-[#d4af69]/25 bg-[#1b1b23] p-3 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <button
                      type="button"
                      onClick={() => setSecondVersionSelected((prev) => !prev)}
                      className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-4 text-left text-[1rem] font-black transition ${secondVersionSelected ? "border-[#ff5d73] bg-[#ff5d73] text-white shadow-[0_10px_20px_rgba(255,93,115,0.28)]" : "border-[#d4af69] bg-[#d4af69]/10 text-[#f3d59d] hover:bg-[#d4af69]/15"}`}
                    >
                      <span>Quero mais uma versão da mesma história</span>
                      <span>+R$ 9,90</span>
                    </button>
                  </div>

                  {checkoutError && <p className="mt-3 text-sm text-[#ffb3bf]">{checkoutError}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Código: <span className="font-mono">{order.id}</span>
      </p>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-xl border border-white/10 bg-[#0f141b] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-[#f8f5f2]">Finalize seu pagamento com segurança</DialogTitle>
            <DialogDescription className="text-zinc-300">
              Seu pedido está quase pronto. Complete os dados abaixo e finalize o pagamento com total segurança, sem sair da página.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="rounded-[28px] border border-border bg-white p-4 shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total</span>
                <span className="text-4xl font-black tracking-[-0.04em] text-[#1f9d5a]">R$ {totalPedido.toFixed(2).replace(".", ",")}</span>
              </div>

              <div className="mt-4 rounded-[28px] border-[3px] border-[#d2a410] bg-[#f9d34d] p-5 shadow-[0_14px_28px_rgba(245,186,39,0.22)]">
                <button
                  type="button"
                  onClick={() => setSecondVersionSelected((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-[20px] border px-5 py-5 text-left text-[1.08rem] font-black transition ${secondVersionSelected ? "border-[#8a0d18] bg-[#d7232d] text-white shadow-[0_10px_20px_rgba(215,35,45,0.28)]" : "border-[#b98c00] bg-[#f7d655] text-[#1a1400] hover:bg-[#f6d15a]"}`}
                >
                  <span>Quero mais uma versão da mesma história</span>
                  <span>+R$ 9,90</span>
                </button>
                <p className="mt-4 text-[0.97rem] font-medium leading-relaxed text-[#1a1400]">
                  A nova versão mantém a sua história base, mas com um estilo diferente, letra reimaginada e nova interpretação musical.
                </p>

                <div className="mt-4 rounded-[18px] border border-[#d5a221] bg-[#fef4c8] p-3 text-[#1a1400] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[#6b4d00]">Depoimento</p>
                  <p className="mt-2 text-[0.98rem] font-semibold leading-relaxed italic">
                    “Vale muito a pena. A segunda versão ficou com uma energia totalmente diferente e ficou incrível.”
                  </p>
                  <p className="mt-2 text-[0.8rem] font-bold text-[#6b4d00]">— Cliente Canção de Fé</p>
                </div>
              </div>

            </div>

            <div className="rounded-[32px] border border-border bg-[var(--sky-blue)]/10 p-6 shadow-sm">
              <p className="mt-5 text-sm font-semibold text-[var(--sky-blue)]">Pagamento seguro via Stripe</p>
              <p className="mt-2 text-sm text-slate-700">Sua compra será processada com segurança e você ficará em uma experiência premium, sem sair do acompanhamento.</p>
              {paymentError && <p className="mt-3 text-sm text-destructive">{paymentError}</p>}
              <div className="mt-4">
                {paymentIntentClientSecret && stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret: paymentIntentClientSecret }}>
                    <StripeCardPaymentForm
                      order={order}
                      clientSecret={paymentIntentClientSecret}
                      amount={19.9 + (secondVersionSelected ? 9.9 : 0)}
                      processing={paymentProcessing}
                      onProcessingChange={setPaymentProcessing}
                      onError={setPaymentError}
                      onSuccess={async () => {
                        await refreshOrder();
                        setTimeout(() => {
                          setCheckoutDialogOpen(false);
                          setPaymentIntentClientSecret(null);
                        }, 2200);
                      }}
                      customerEmail={checkoutCustomer.email}
                      customerPhone={checkoutCustomer.phone}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-slate-700">
                    {stripePublishableKey ? "Preparando o checkout na página..." : "Stripe não configurado. Adicione a variável VITE_STRIPE_PUBLISHABLE_KEY."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {history.length > 0 && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#10161d] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#ff99a8]" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#f8f5f2]">Histórico de Atualizações</h3>
                <p className="text-xs text-zinc-400">{history.length} atualização{history.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-full border border-[#ff5d73]/40 bg-[#0d1117] px-4 py-2 text-sm font-semibold text-[#ffb7c3]"
            >
              {historyOpen ? "Ocultar histórico" : "Mostrar histórico"}
            </button>
          </div>

          {historyOpen && (
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
          )}
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

function CopyOrderMessageButton({ order, totalValue }: { order: Pick<Order, "id" | "nome_cliente" | "segunda_versao">; totalValue: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const message = buildOrderIdentificationMessage(order, totalValue);
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-white/10"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copiar mensagem
        </>
      )}
    </button>
  );
}

function StripeCardPaymentForm({
  order,
  clientSecret,
  amount,
  processing,
  onProcessingChange,
  onError,
  onSuccess,
  customerEmail,
  customerPhone,
}: {
  order: Order;
  clientSecret: string;
  amount: number;
  processing: boolean;
  onProcessingChange: (processing: boolean) => void;
  onError: (message: string) => void;
  onSuccess: () => Promise<void>;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      onError("Stripe não está pronto ainda. Verifique se a chave pública está configurada corretamente.");
      return;
    }

    const cardNumber = elements.getElement(CardNumberElement);
    const cardExpiry = elements.getElement(CardExpiryElement);
    const cardCvc = elements.getElement(CardCvcElement);

    if (!cardNumber || !cardExpiry || !cardCvc) {
      onError("Não foi possível localizar os campos do cartão.");
      return;
    }

    onError("");
    onProcessingChange(true);

    try {
      const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumber,
        billing_details: {
          name: order.nome_cliente,
          email: customerEmail || order.email_cliente || undefined,
          phone: customerPhone || order.telefone_cliente || undefined,
        },
      });

      if (paymentMethodError || !paymentMethod) {
        onError(paymentMethodError?.message ?? "Erro ao criar o método de pagamento.");
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (result.error) {
        onError(result.error.message ?? "Erro ao processar o pagamento.");
        return;
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        onError("O pagamento não foi concluído. Tente novamente.");
        return;
      }

      await onSuccess();
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4">
        <label className="block text-sm font-semibold text-slate-900">Dados do cartão</label>

        <div className="mt-3 flex gap-2 rounded-2xl border border-border bg-background p-2">
          <button
            type="button"
            onClick={() => setPaymentType("credit")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${paymentType === "credit" ? "bg-[var(--gold)] text-primary" : "bg-transparent text-slate-600"}`}
          >
            Crédito
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("debit")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${paymentType === "debit" ? "bg-[var(--gold)] text-primary" : "bg-transparent text-slate-600"}`}
          >
            Débito
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          {paymentType === "credit" ? "Pagamento com cartão de crédito." : "Pagamento com cartão de débito."}
        </p>

        <div className="mt-4 space-y-4 rounded-2xl border border-border bg-background p-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Número do cartão</label>
            <div className="rounded-xl border border-border bg-white px-3 py-3">
              <CardNumberElement options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#0f172a",
                    fontFamily: "Inter, sans-serif",
                    "::placeholder": { color: "#94a3b8" },
                  },
                  invalid: { color: "#f43f5e" },
                },
              }} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Vencimento</label>
              <div className="rounded-xl border border-border bg-white px-3 py-3">
                <CardExpiryElement options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                      "::placeholder": { color: "#94a3b8" },
                    },
                    invalid: { color: "#f43f5e" },
                  },
                }} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">CVC</label>
              <div className="rounded-xl border border-border bg-white px-3 py-3">
                <CardCvcElement options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                      "::placeholder": { color: "#94a3b8" },
                    },
                    invalid: { color: "#f43f5e" },
                  },
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={processing}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(252,211,77,0.3)] disabled:opacity-50"
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pagar R$ ${amount.toFixed(2).replace(".", ",")}`}
      </button>
    </form>
  );
}
