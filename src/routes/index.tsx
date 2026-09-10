import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Play,
  Music,
  Heart,
  Gift,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Instagram,
  Facebook,
  ChevronDown,
  Star,
  ShieldCheck,
  Headphones,
  Send,
  Loader2,
} from "lucide-react";
import heroImg from "@/assets/hero-family.jpg";
import { useReveal } from "@/hooks/use-reveal";
import { sendOrder, trackLandingCta } from "@/lib/order.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isValidPersonName } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canção de Fé — Músicas Gospel Personalizadas" },
      {
        name: "description",
        content:
          "Música personalizada criada a partir da sua história. Receba uma canção exclusiva, feita com emoção, fé e entrega digital.",
      },
      { property: "og:title", content: "Canção de Fé — Músicas Gospel Personalizadas" },
      {
        property: "og:description",
        content:
          "Sua história merece ser cantada. Crie uma música exclusiva, personalizada e feita para emocionar quem você ama.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: heroImg },
      { name: "twitter:title", content: "Canção de Fé" },
      {
        name: "twitter:description",
        content: "Música personalizada criada a partir da sua história.",
      },
      { name: "twitter:image", content: heroImg },
      { name: "theme-color", content: "#081d2c" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const WHATSAPP_URL =
  "https://wa.me/5541997232395?text=Quero%20criar%20minha%20Can%C3%A7%C3%A3o%20de%20F%C3%A9";
const EXAMPLE_AUDIO_URL =
  "https://coivogokbzizhwfhywkp.supabase.co/storage/v1/object/public/musicas/Cancao%20de%20fe.mp3";
const STARTING_PRICE = 10;
const GRADIENT_GOLD = { backgroundImage: "var(--gradient-gold)" } as const;
const GRADIENT_HERO = { backgroundImage: "var(--gradient-hero)" } as const;

function Index() {
  useReveal();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Badges />
        <SampleSong />
        <EmotionalStory />
        <Occasions />
        <HowItWorks />
        <Testimonials />
        <ProductHighlights />
        <OfferSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-white/10 bg-[#041827]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(3,10,20,0.45)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <a href="#top" className="flex items-center gap-2">
          <span
            style={GRADIENT_GOLD}
            className="grid h-9 w-9 place-items-center rounded-full text-primary shadow-[var(--shadow-gold)]"
          >
            <Music className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-white">Canção de Fé</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-sky-100/80">
              Vita Core Music
            </span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-sky-100/85 md:flex">
          <a href="#como-funciona" className="transition-colors hover:text-white">
            Como funciona
          </a>
          <a href="#exemplos" className="transition-colors hover:text-white">
            Exemplos
          </a>
          <a href="#ocasioes" className="transition-colors hover:text-white">
            Ocasiões
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            Perguntas
          </a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/acompanhar"
            onClick={() => {
              void trackLandingCta({
                data: {
                  buttonLabel: "Acompanhar Pedido",
                  source: "header_nav",
                  url: typeof window !== "undefined" ? window.location.href : undefined,
                },
              }).catch((error) => {
                console.warn("[landing-cta] Falha no rastreio do clique do header:", error);
              });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            <Music className="h-4 w-4" /> Acompanhar Pedido
          </a>
          <StartMusicWidget
            buttonClassName="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
            buttonStyle={GRADIENT_GOLD}
            label="Criar Minha Canção"
            icon={<Sparkles className="h-4 w-4" />}
            trackingSource="header_cta"
          />
        </div>
      </div>
    </header>
  );
}

function StartMusicWidget({
  buttonClassName,
  buttonStyle,
  label,
  icon,
  initialOpen = false,
  initialFormState,
  trackingSource = "home_cta",
}: {
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  label: string;
  icon?: React.ReactNode;
  initialOpen?: boolean;
  initialFormState?: Partial<OrderFormState>;
  trackingSource?: string;
}) {
  const send = useServerFn(sendOrder);
  const trackClick = useServerFn(trackLandingCta);
  const navigate = useNavigate();
  const [open, setOpen] = useState(initialOpen);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [widgetStep, setWidgetStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number>(() => Date.now());
  const [form, setForm] = useState<OrderFormState>({
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    para_quem: "",
    nome_receptor: "",
    ocasiao: "",
    genero_musical: TIPOS_MUSICA[0],
    outro_genero: "",
    tipo_cantor: "feminino",
    descricao: "",
    bot_field: "",
    ...initialFormState,
  });

  const widgetSteps = [
    {
      key: "para_quem",
      label: "Para quem você quer criar essa canção? ❤️",
      eyebrow: "Etapa 1 de 6",
      placeholder: "Ex.: Minha esposa, meu filho",
    },
    {
      key: "nome_cliente",
      label: "Como podemos te chamar?",
      eyebrow: "Etapa 2 de 6",
      placeholder: "Ex.: Maria Silva Souza",
    },
    {
      key: "telefone_cliente",
      label: "Qual é o seu WhatsApp?",
      eyebrow: "Etapa 3 de 6",
      placeholder: "(99) 99999-9999",
    },
    {
      key: "ocasiao",
      label: "Qual é a ocasião especial?",
      eyebrow: "Etapa 4 de 6",
      placeholder: "Ex.: Aniversário, casamento, batismo",
    },
    {
      key: "genero_musical",
      label: "Qual estilo combina com essa história?",
      eyebrow: "Etapa 5 de 6",
      placeholder: "",
    },
    {
      key: "descricao",
      label: "Conte a história em poucas palavras",
      eyebrow: "Etapa 6 de 6",
      placeholder: "Ex.: Quero uma música emocionante sobre nossa jornada, fé e amor...",
    },
  ] as const;

  const occasionSuggestions = [
    "Aniversário",
    "Dia dos Namorados",
    "Casamento",
    "Aniversário de casamento",
    "Dia das Mães",
    "Dia dos Pais",
    "Batismo",
    "Comunhão",
    "Formatura",
    "Agradecimento por uma bênção",
    "Momento de superação",
    "Presente para uma pessoa especial",
  ];

  const descriptionSuggestions = [
    {
      label: "Para quem é a música?",
      value: "Esta música é para a pessoa que me apoiou na fé e me acompanhou em cada momento.",
    },
    {
      label: "Qual sentimento quer transmitir?",
      value: "Quero transmitir gratidão, amor e fé no nosso relacionamento e caminhada espiritual.",
    },
    {
      label: "Momento especial",
      value:
        "Descreva um momento especial, como quando vencemos juntos uma dificuldade ou recebemos uma bênção.",
    },
    {
      label: "Palavras importantes",
      value: "Inclua nomes, lugares e símbolos importantes, como igreja, família, casa ou oração.",
    },
    {
      label: "Como quer que ela se sinta?",
      value: "Quero que ela se sinta emocionada, fortalecida e abençoada ao ouvir esta canção.",
    },
  ];

  const current = widgetSteps[widgetStep];
  const progress = ((widgetStep + 1) / widgetSteps.length) * 100;

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
    }
  }, [initialOpen]);

  const handleTrackClick = () => {
    void trackClick({
      data: {
        buttonLabel: label,
        source: trackingSource,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      },
    }).catch((error) => {
      console.warn("[landing-cta] Falha no rastreio do clique do CTA:", error);
    });
  };

  const reset = () => {
    setStatus("idle");
    setErrorMsg("");
    setWidgetStep(0);
    setFormStartedAt(Date.now());
    setForm({
      nome_cliente: "",
      telefone_cliente: "",
      email_cliente: "",
      para_quem: "",
      nome_receptor: "",
      ocasiao: "",
      genero_musical: TIPOS_MUSICA[0],
      outro_genero: "",
      tipo_cantor: "feminino",
      descricao: "",
      como_conheceu: "",
      nome_conheceu: "",
      bot_field: "",
      ...initialFormState,
    });
  };

  const validateStep = (): string | null => {
    if (form.bot_field.trim()) {
      return "Pedido inválido.";
    }

    if (current.key === "nome_cliente") {
      return isValidPersonName(form.nome_cliente)
        ? null
        : "Informe um nome real e válido para continuar. Evite letras aleatórias, números ou termos genéricos.";
    }
    if (current.key === "telefone_cliente") {
      const digits = form.telefone_cliente.replace(/\D/g, "");
      if (digits.length < 10) return "Informe um WhatsApp válido para receber a música.";
      if (
        form.email_cliente.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_cliente.trim())
      ) {
        return "Digite um e-mail válido ou deixe em branco.";
      }
      return null;
    }
    if (current.key === "para_quem") {
      const hasRecipientRelation = form.para_quem.trim().length >= 2;
      const hasRecipientName = form.nome_receptor.trim().length >= 2;
      return hasRecipientRelation || hasRecipientName ? null : "Descreva para quem será a música.";
    }
    if (current.key === "ocasiao") {
      return form.ocasiao.trim().length < 2 ? "Informe a ocasião para continuar." : null;
    }
    if (current.key === "genero_musical") {
      if (!form.genero_musical.trim()) {
        return "Selecione um gênero musical para continuar.";
      }
      if (form.genero_musical === "Outro" && !form.outro_genero.trim()) {
        return "Descreva o estilo que você deseja.";
      }
      return null;
    }
    if (form.descricao.trim().length < 15) {
      return "Conte um pouco mais da sua história para que a música fique personalizada.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setWidgetStep((value) => Math.min(value + 1, widgetSteps.length - 1));
  };

  const prev = () => {
    setErrorMsg("");
    setWidgetStep((value) => Math.max(value - 1, 0));
  };

  const submit = async () => {
    if (form.bot_field.trim()) {
      setStatus("error");
      setErrorMsg("Pedido inválido.");
      return;
    }

    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setStatus("loading");

    try {
      console.log("[submit] Enviando pedido...", {
        nome: form.nome_cliente,
        telefone: form.telefone_cliente?.substring(0, 3) + "***",
      });
      const res = await send({ data: { ...form, form_started_at: formStartedAt } });
      console.log("[submit] Pedido enviado com sucesso, ID:", res.id);
      setOpen(false);
      reset();
      navigate({ to: "/acompanhar", search: { id: res.id, token: res.token } });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível criar a música agora. Tente novamente.";
      console.error("[submit] Erro ao enviar pedido:", mensagem, error);
      setStatus("error");
      setErrorMsg(mensagem);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          style={buttonStyle}
          className={buttonClassName}
          onClick={handleTrackClick}
        >
          {icon}
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[960px] overflow-hidden border border-[#e7d9ff] bg-[#fffafc] p-0 text-[#2f2a37] shadow-[0_35px_90px_rgba(18,14,31,0.24)] sm:rounded-[30px]">
        <div className="max-h-[82vh] overflow-y-auto bg-[#fdf9ff] px-6 py-6 sm:px-8 sm:py-7">
          <div className="mb-6">
            <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-[#655b76]">
              <span>{current.eyebrow}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8def8]">
              <div
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #b186f3 0%, #8a6ce2 100%)",
                }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d2c0f3] bg-[#f0e8ff] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b4cb0]">
              <Sparkles className="h-3.5 w-3.5 text-[#8b70df]" />
              Criar minha música
            </div>
            <span className="text-xs font-medium text-[#655b76]">Leva menos de 3 minutos</span>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.06em] text-[#eb4d58] sm:text-[3rem]">
              {current.label}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="sr-only" aria-hidden="true">
              <label>
                Campo de verificação
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.bot_field}
                  onChange={(e) => setForm({ ...form, bot_field: e.target.value })}
                />
              </label>
            </div>

            {current.key === "telefone_cliente" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                    WhatsApp obrigatório
                  </span>
                  <input
                    autoFocus
                    type="tel"
                    value={form.telefone_cliente}
                    onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })}
                    className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                    placeholder={current.placeholder}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                    E-mail (opcional)
                  </span>
                  <input
                    type="email"
                    value={form.email_cliente}
                    onChange={(e) => setForm({ ...form, email_cliente: e.target.value })}
                    className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                    placeholder="seuemail@email.com"
                  />
                </label>
              </div>
            ) : current.key === "para_quem" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                    Quem vai receber a música?
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={form.para_quem}
                    onChange={(e) => setForm({ ...form, para_quem: e.target.value })}
                    className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                    placeholder="Ex.: Minha esposa, meu filho"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                    Qual o nome dele(a)?
                  </span>
                  <input
                    type="text"
                    value={form.nome_receptor}
                    onChange={(e) => setForm({ ...form, nome_receptor: e.target.value })}
                    className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                    placeholder="Ex.: Maria, João, Ana"
                  />
                </label>
              </div>
            ) : current.key === "ocasiao" ? (
              <div className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  value={form.ocasiao}
                  onChange={(e) => setForm({ ...form, ocasiao: e.target.value })}
                  className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                  placeholder="Ex.: Aniversário de casamento, Dia das Mães, batismo, gratidão por uma bênção"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {occasionSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setForm({ ...form, ocasiao: suggestion })}
                      className={`rounded-full border px-4 py-3 text-left text-base font-medium transition-all ${
                        form.ocasiao === suggestion
                          ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                          : "border-[#d6c4f4] bg-[#f9f6fb] text-[#4c425b] hover:border-[#a98ae9]"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : current.key === "genero_musical" ? (
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-2">
                  {TIPOS_MUSICA.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setForm({ ...form, genero_musical: tipo })}
                      className={`rounded-full border px-4 py-4 text-left text-lg font-medium transition-all ${
                        form.genero_musical === tipo
                          ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                          : "border-[#d6c4f4] bg-[#f9f6fb] text-[#4c425b] hover:border-[#a98ae9]"
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>

                {form.genero_musical === "Outro" && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-sky-100">
                      Descreva outro estilo
                    </span>
                    <input
                      type="text"
                      value={form.outro_genero}
                      onChange={(e) => setForm({ ...form, outro_genero: e.target.value })}
                      className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                      placeholder="Ex.: R&B / Soul, Pop gospel, Forró gospel"
                    />
                  </label>
                )}

                <div className="space-y-3 pt-2">
                  <h4 className="font-display text-2xl font-semibold text-[#1f1a24]">
                    Qual voz mais combina com a música?
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {TIPOS_CANTOR.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, tipo_cantor: value })}
                        className={`rounded-full border px-4 py-4 text-left text-lg font-medium transition-all ${
                          form.tipo_cantor === value
                            ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                            : "border-[#d6c4f4] bg-[#f9f6fb] text-[#4c425b] hover:border-[#a98ae9]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : current.key === "descricao" ? (
              <div className="space-y-4">
                <textarea
                  autoFocus
                  rows={7}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="min-h-[220px] w-full rounded-[18px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-4 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                  placeholder={current.placeholder}
                />

                <div className="rounded-[18px] border border-[#d8c8f4] bg-[#f7f1ff] p-4 text-left">
                  <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#5c4a77]">
                    Como você nos conheceu?
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { value: "facebook", label: "Facebook" },
                      { value: "instagram", label: "Instagram" },
                      { value: "whatsapp", label: "WhatsApp" },
                      { value: "alguem", label: "Alguém" },
                    ].map((option) => {
                      const isSelected = form.como_conheceu === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              como_conheceu: option.value,
                              nome_conheceu: option.value === "alguem" ? form.nome_conheceu : "",
                            })
                          }
                          className={`rounded-full border px-4 py-3 text-left text-sm font-medium transition-all ${
                            isSelected
                              ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                              : "border-[#d6c4f4] bg-[#f9f6fb] text-[#4c425b] hover:border-[#a98ae9]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {form.como_conheceu === "alguem" && (
                    <label className="mt-3 block">
                      <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                        Nome da pessoa
                      </span>
                      <input
                        type="text"
                        value={form.nome_conheceu}
                        onChange={(e) => setForm({ ...form, nome_conheceu: e.target.value })}
                        className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                        placeholder="Ex.: Ana, Carlos, João"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-[18px] border border-[#d9c7f7] bg-[#f7f0ff] p-4 text-left text-[13px] leading-relaxed text-[#2f2a37] shadow-[0_6px_20px_rgba(123,92,175,0.06)]">
                  <p className="mb-3 font-semibold text-[#3d2d52]">
                    💡 Dicas para deixar sua música ainda mais especial
                  </p>
                  <div className="space-y-1.5">
                    <p>Conte os momentos:</p>
                    <p>❤️ Como vocês se conheceram</p>
                    <p>✨ Um momento inesquecível juntos</p>
                    <p>🥰 Apelidos ou frases que vocês costumam dizer</p>
                    <p>📍 Lugares importantes para vocês</p>
                    <p>🎂 Uma data ou ocasião especial</p>
                    <p>💌 O que você mais ama ou admira nessa pessoa</p>
                    <p>🙏 Um sonho, promessa ou desejo para o futuro</p>
                  </div>
                  <p className="mt-3 text-[#3d2d52]">
                    Não precisa escrever bonito — conte do seu jeito. Nós transformamos sua história
                    em música. 🎵
                  </p>
                </div>
              </div>
            ) : (
              <input
                autoFocus
                type="text"
                value={form[current.key]}
                onChange={(e) => setForm({ ...form, [current.key]: e.target.value })}
                className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                placeholder={current.placeholder}
              />
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={widgetStep === 0 || status === "loading"}
              className="inline-flex items-center justify-center rounded-full border border-[#d3c5ee] bg-[#f7f2ff] px-6 py-3 text-sm font-semibold text-[#2d2840] transition-colors hover:border-[#b697eb] disabled:opacity-40"
            >
              Voltar
            </button>

            {widgetStep < widgetSteps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                style={GRADIENT_GOLD}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              >
                Continuar <Sparkles className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={status === "loading"}
                style={GRADIENT_GOLD}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {status === "loading" ? "Enviando..." : "Enviar pedido"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Hero ---------------- */
const playExampleAudio = () => {
  const audio = document.getElementById("example-audio") as HTMLAudioElement | null;
  if (!audio) return;

  audio.volume = 0.15;
  audio.currentTime = 0;
  audio.play().catch(() => undefined);
};

function Hero() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isExamplePlaying, setIsExamplePlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.15;
    audio.loop = true;
    audio.muted = false;
  }, []);

  const handleExampleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    playExampleAudio();
    setIsExamplePlaying(true);

    const target = document.getElementById("exemplos");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePauseExample = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => setIsExamplePlaying(true))
        .catch(() => setIsExamplePlaying(false));
      return;
    }

    audio.pause();
    setIsExamplePlaying(false);
  };

  return (
    <>
      <audio
        id="example-audio"
        ref={audioRef}
        src={EXAMPLE_AUDIO_URL}
        preload="auto"
        playsInline
        onPause={() => setIsExamplePlaying(false)}
        onPlay={() => setIsExamplePlaying(true)}
      />
      <section id="top" className="relative isolate overflow-hidden bg-[#041827]">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImg}
            alt="Família em oração ao pôr do sol"
            width={1920}
            height={1280}
            className="h-full w-full object-cover opacity-80 animate-fade-in"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.35),transparent_35%),linear-gradient(180deg,rgba(4,24,39,0.72)_0%,rgba(4,24,39,0.78)_30%,rgba(4,24,39,0.9)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.22),transparent_60%)]" />
          <div className="absolute -left-12 top-12 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -right-12 top-20 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="mx-auto flex min-h-[68svh] max-w-6xl flex-col items-center justify-center px-5 pb-12 pt-28 text-center md:pt-32">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/25 bg-sky-100/8 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-sky-100 backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
            Música Personalizada
          </span>

          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/90 backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
            Uma história. Uma canção. Uma lembrança para sempre.
          </span>

          <h1
            className="text-balance font-display text-4xl font-semibold leading-[1.05] text-white sm:text-6xl md:text-7xl animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Transforme a história de vocês em uma{" "}
            <span className="bg-gradient-to-r from-[var(--gold-soft)] via-white to-[var(--gold)] bg-clip-text text-transparent">
              música personalizada
            </span>
          </h1>

          <p
            className="mt-6 max-w-2xl text-balance text-base text-sky-50/85 sm:text-lg animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            Conte os momentos que marcaram sua vida, escolha o estilo e transforme tudo em uma
            canção feita especialmente para você ou para alguém que você ama.
          </p>

          <p
            className="mt-6 max-w-2xl text-balance text-sm text-sky-50/80 animate-fade-up"
            style={{ animationDelay: "310ms" }}
          >
            Feita para celebrar fé, gratidão, amor e a memória de um momento especial.
          </p>

          <div
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row animate-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <StartMusicWidget
              buttonClassName="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              buttonStyle={GRADIENT_GOLD}
              label="❤️ Criar Minha Canção"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <a
              href="#escute"
              onClick={handleExampleClick}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              <Play className="h-4 w-4" /> 🎧 Ouvir um exemplo
            </a>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-sky-100/80 animate-fade-up"
            style={{ animationDelay: "360ms" }}
          >
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              🔒 Pagamento seguro
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              ⚡ Entrega digital
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              💬 Atendimento no WhatsApp
            </span>
          </div>

          <div
            className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 text-center animate-fade-up"
            style={{ animationDelay: "420ms" }}
          >
            <Stat value="1.350+" label="Músicas criadas" />
            <Stat
              value="4.9"
              label="Avaliação média"
              icon={<Star className="h-3 w-3 fill-current" />}
            />
            <Stat value="Imediata" label="Entrega" />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-100/15 bg-[rgba(13,34,53,0.62)] px-3 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md">
      <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-semibold text-white sm:text-3xl">
        {value} {icon && <span className="text-[var(--gold)]">{icon}</span>}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sky-100/75">{label}</div>
    </div>
  );
}

function SampleSong() {
  return (
    <section id="escute" className="bg-[#f6f1fa] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="reveal rounded-[2rem] border border-[#d7c7ee] bg-white/80 p-6 shadow-[0_18px_40px_rgba(41,33,63,0.08)] md:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9c8f5] bg-[#f1e9ff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5a497f]">
            <Headphones className="h-3.5 w-3.5 text-[#7b5ad8]" />
            Música de exemplo
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c5c7e]">
                Canção do projeto
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#1f1a24] sm:text-4xl">
                História de fé e amor
              </h2>
            </div>
            <button
              type="button"
              onClick={playExampleAudio}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" /> Ouvir áudio
            </button>
          </div>

          <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-[#5c4a75]">
            Antes de criar a sua, escute como uma história pode se transformar em música.
          </p>

          <div className="mt-6 space-y-3 rounded-[1.5rem] border border-[#eadff8] bg-[#f9f5ff] p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-[#4d3d5f]">
              <span className="font-semibold">Título</span>
              <span>Canção de Fé</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-[#4d3d5f]">
              <span className="font-semibold">Estilo</span>
              <span>Pop gospel / emocional</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-[#4d3d5f]">
              <span className="font-semibold">Narrativa</span>
              <span>História real com fé e gratidão</span>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4e465a]">
            Essa é a mesma ideia por trás do processo: transformar uma história real em uma canção
            emocional, pessoal e feita para ser guardada para sempre.
          </p>
        </div>

        <div className="reveal rounded-[2rem] border border-[#e2d6f7] bg-[linear-gradient(135deg,#0c1a2a,#102844)] p-6 text-white shadow-[0_18px_40px_rgba(11,24,38,0.18)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100/80">
            Experiência
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-white">
            Não é apenas uma música.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-sky-50/80">
            É a lembrança de um momento que tocou o coração e agora vira um presente que pode ser
            ouvido em qualquer lugar.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <StartMusicWidget
              buttonClassName="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              buttonStyle={GRADIENT_GOLD}
              label="❤️ Criar Minha Canção"
              icon={<Sparkles className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductHighlights() {
  const highlights = [
    {
      title: "Música completa e exclusiva",
      text: "Você recebe uma canção original, criada a partir da sua história e da sua emoção.",
    },
    {
      title: "Letra personalizada",
      text: "A letra é pensada para refletir a mensagem, os sentimentos e os detalhes que fazem sua história ser única.",
    },
    {
      title: "Entrega digital",
      text: "A música é entregue de forma digital, pronta para ouvir em qualquer momento.",
    },
    {
      title: "Você participa da criação",
      text: "A sua história guia o processo e a revisão ajuda a deixar a mensagem mais alinhada com o que você sente.",
    },
    {
      title: "Feita para presente",
      text: "Uma lembrança emocional que pode ser ouvida novamente em momentos especiais da vida.",
    },
  ];

  return (
    <section className="bg-[#f5edf9] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5a497f]">
            O que você recebe
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-[#1b1c2d] sm:text-5xl">
            Uma música que carrega sua história.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="reveal rounded-[1.6rem] border border-[#d7c6f0] bg-white/80 p-5 shadow-[0_10px_25px_rgba(46,36,66,0.06)]"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[#efe5ff] text-[#5a3ab3]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold text-[#1d1b2d]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#514c62]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmotionalStory() {
  const points = [
    "Histórias que merecem ser lembradas",
    "Momentos que marcaram a vida",
    "Sentimentos que não cabem em palavras",
    "Gratidão, fé, amor e homenagem",
  ];

  return (
    <section className="bg-[#091b2d] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d6c7f1]/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">
            <Heart className="h-3.5 w-3.5 text-[var(--gold)]" />
            Lembrança eterna
          </div>
          <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Não é apenas uma música.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-sky-50/80">
            É uma lembrança que pode ser ouvida para sempre. Algo que transforma histórias,
            sentimentos e momentos em um presente emocional de verdade.
          </p>
        </div>

        <div className="reveal grid gap-4 sm:grid-cols-2">
          {points.map((item, index) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-left shadow-[0_12px_30px_rgba(5,12,18,0.15)]"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-base font-medium text-white">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Badges Row ---------------- */
function Badges() {
  const items = [
    { icon: Sparkles, label: "100% Personalizada" },
    { icon: Send, label: "Entrega Digital" },
    { icon: MessageCircle, label: "Atendimento via WhatsApp" },
    { icon: ShieldCheck, label: "Produção Profissional" },
  ];
  return (
    <section className="border-y border-sky-100/10 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_35%),#041827]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-6 sm:grid-cols-4 md:px-8">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 text-xs font-medium text-sky-50 sm:text-sm"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[var(--gold)] shadow-[var(--shadow-soft)] ring-1 ring-white/10">
              <Icon className="h-4 w-4" />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Você conta sua história",
      desc: "Compartilhe a emoção, o momento e a pessoa que você quer homenagear.",
    },
    {
      n: "02",
      title: "Criamos sua letra",
      desc: "Transformamos os detalhes da sua história em uma mensagem emocional, envolvente e exclusiva.",
    },
    {
      n: "03",
      title: "Você aprova",
      desc: "Receba a proposta e confirme o que precisa ser ajustado antes de seguir para a música final.",
    },
    {
      n: "04",
      title: "Produzimos a música",
      desc: "A canção é feita com cuidado, arranjo e identidade sonora para refletir o momento real.",
    },
    {
      n: "05",
      title: "Você recebe",
      desc: "A música final chega de forma digital para você ouvir, guardar e compartilhar com quem ama.",
    },
  ];
  return (
    <section
      id="como-funciona"
      className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_30%),#041827] px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Como funciona"
          title="Seu testemunho merece virar uma canção"
          subtitle="Transforme sua história em uma música exclusiva, criada especialmente para você ou para alguém especial."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="reveal group relative rounded-3xl border border-sky-200/10 bg-[#0a1d2f]/80 p-7 shadow-[0_8px_30px_rgba(7,17,25,0.35)] transition-all hover:-translate-y-1 hover:border-sky-300/25"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="font-display text-5xl font-semibold text-[var(--sky-blue)]/40 transition-colors group-hover:text-[var(--sky-blue)]/70">
                {s.n}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sky-50/75">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Occasions ---------------- */
function Occasions() {
  const items = [
    {
      emoji: "❤️",
      label: "Minha esposa",
      summary: "Uma declaração de amor que conta a história de vocês.",
      para_quem: "Minha esposa",
    },
    {
      emoji: "💙",
      label: "Meu marido",
      summary: "Uma canção feita para representar o amor de vocês.",
      para_quem: "Meu marido",
    },
    {
      emoji: "🙏",
      label: "Minha mãe",
      summary: "Uma homenagem transformando gratidão em música.",
      para_quem: "Minha mãe",
    },
    {
      emoji: "👨‍👩‍👧",
      label: "Minha família",
      summary: "Uma história de família transformada em canção.",
      para_quem: "Minha família",
    },
    {
      emoji: "👶",
      label: "Meu filho(a)",
      summary: "Uma lembrança para guardar para sempre.",
      para_quem: "Meu filho(a)",
    },
    {
      emoji: "✨",
      label: "Alguém especial",
      summary: "Uma mensagem de fé, gratidão e esperança.",
      para_quem: "Alguém especial",
    },
    {
      emoji: "🎂",
      label: "Aniversário",
      summary: "Uma celebração emocionada em forma de música.",
      para_quem: "Aniversário",
    },
    {
      emoji: "💍",
      label: "Casamento",
      summary: "A história do amor que se tornou uma lembrança eterna.",
      para_quem: "Casamento",
    },
    {
      emoji: "✝️",
      label: "Batismo",
      summary: "Uma comemoração de fé e graça em forma de música.",
      para_quem: "Batismo",
    },
    {
      emoji: "🌅",
      label: "Testemunho",
      summary: "Um presente para eternizar a jornada de fé.",
      para_quem: "Testemunho",
    },
  ];

  return (
    <section
      id="ocasioes"
      className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%),#041827] px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Para quem você quer criar?"
          title="Transforme a história de quem você ama em uma música"
          subtitle="Cada momento merece uma canção que relembre a emoção, a fé e o amor de verdade."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((it, i) => (
            <div
              key={it.label}
              className="reveal group flex h-full flex-col justify-between rounded-[1.8rem] border border-sky-200/10 bg-[#0b1f2d]/80 p-5 shadow-[0_8px_30px_rgba(7,17,25,0.35)] transition-all hover:-translate-y-1 hover:border-[var(--gold)]/40"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--gold)]/12 text-2xl shadow-[var(--shadow-gold)]">
                    {it.emoji}
                  </span>
                  <span className="text-lg font-semibold text-white">{it.label}</span>
                </div>
                <p className="text-sm leading-relaxed text-sky-50/75">{it.summary}</p>
              </div>
              <div className="mt-5">
                <StartMusicWidget
                  buttonClassName="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  label={`Criar para ${it.label}`}
                  icon={<Sparkles className="h-4 w-4 text-[var(--gold)]" />}
                  initialFormState={{ para_quem: it.label, ocasiao: it.label }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Differentials ---------------- */
function Differentials() {
  const items = [
    {
      icon: Sparkles,
      title: "Música Exclusiva",
      desc: "Cada música é criada do zero, sem modelos prontos.",
    },
    {
      icon: Heart,
      title: "Letra Personalizada",
      desc: "Inspirada inteiramente na sua história e na sua fé.",
    },
    {
      icon: Headphones,
      title: "Produção Profissional",
      desc: "Qualidade de estúdio em cada arranjo.",
    },
    {
      icon: Send,
      title: "Entrega Digital",
      desc: "Receba sua música rapidamente, pronta para compartilhar.",
    },
    {
      icon: MessageCircle,
      title: "Atendimento Humanizado",
      desc: "Suporte direto via WhatsApp, com carinho.",
    },
  ];
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Por que escolher" title="Feito com cuidado, do início ao fim" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="reveal flex gap-4 rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--sky-blue)]/10 text-[var(--sky-blue)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  const items = [
    {
      name: "Marina",
      location: "São Paulo",
      message: "Nossa, foi emocionante demais. Parecia a nossa história inteira em música.",
      align: "left",
    },
    {
      name: "Rafael",
      location: "Rio",
      message: "Meu presente foi incrível. Ela chorou ao ouvir a letra e não saiu do replay.",
      align: "right",
    },
    {
      name: "Júlia",
      location: "Minas Gerais",
      message: "A música ficou tão pessoal que até meus pais pediram para ouvir outra vez.",
      align: "left",
    },
  ];

  return (
    <section
      id="exemplos"
      className="bg-gradient-to-b from-[var(--soft-gray)] to-background px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Provas de clientes"
          title="Pessoas que compraram e ficaram emocionadas"
          subtitle="Essas são histórias reais de quem transformou momentos especiais em músicas exclusivas."
        />

        <div className="reveal mt-12 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-4 rounded-[2rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6">
            {items.map((item) => (
              <div
                key={item.name}
                className={`flex ${item.align === "right" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] ${item.align === "right" ? "items-end" : "items-start"} flex flex-col gap-2`}
                >
                  <div
                    className={`flex items-center gap-2 ${item.align === "right" ? "justify-end" : "justify-start"}`}
                  >
                    {item.align === "left" && (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gold)]/15 text-xs font-bold text-[var(--gold)]">
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      {item.name} · {item.location}
                    </span>
                    {item.align === "right" && (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sky-blue)]/15 text-xs font-bold text-[var(--sky-blue)]">
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-[1.4rem] border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      item.align === "right"
                        ? "border-[var(--sky-blue)]/15 bg-[var(--sky-blue)]/8 text-primary"
                        : "border-border bg-[#f8f8fb] text-primary"
                    }`}
                  >
                    {item.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between rounded-[2rem] border border-[var(--gold)]/30 bg-[radial-gradient(circle_at_top,rgba(255,208,83,0.20),transparent_50%),linear-gradient(135deg,#0d1d30,#091a2c)] p-6 text-white shadow-[var(--shadow-glow)]">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[var(--gold)]">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100/75">
                Avaliação média
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold">4,9</span>
                <span className="pb-2 text-sky-100/80">/ 5</span>
              </div>
            </div>

            <div className="my-8 h-px bg-white/10" />

            <div>
              <h3 className="font-display text-2xl font-semibold">Ouça um exemplo</h3>
              <p className="mt-3 text-sm leading-relaxed text-sky-100/80">
                Experimente a emoção, a qualidade e a personalização do nosso processo.
              </p>

              <button
                type="button"
                onClick={playExampleAudio}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3.5 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              >
                <Play className="h-4 w-4" /> Ouvir exemplo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OfferSection() {
  const benefits = [
    "Música personalizada",
    "Letra exclusiva",
    "Voz cantada",
    "Entrega digital",
    "Prévia da música",
    "Possibilidade de revisão",
  ];

  const paymentOptions = [
    "Cartão de crédito e débito",
    "Pagamento por PIX",
    "Atendimento por WhatsApp para tirar dúvidas",
  ];

  return (
    <section className="bg-[#f7f0ff] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#d7c6f0] bg-white/80 p-6 shadow-[0_18px_40px_rgba(71,56,101,0.08)] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7c6f0] bg-[#f1e9ff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5b4d7c]">
              <Gift className="h-3.5 w-3.5 text-[#7e5ad8]" />
              Oferta especial
            </div>

            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-[#20202d] sm:text-5xl">
              Transforme sua história em um presente memorável.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#4f485f]">
              Uma música feita para celebrar a pessoa certa no momento certo, com emoção, sentimento
              e identidade própria.
            </p>

            <div className="mt-7 flex items-end gap-3">
              <span className="font-display text-5xl font-semibold tracking-[-0.06em] text-[#1d2437]">
                R$ {STARTING_PRICE.toFixed(2).replace(".", ",")}
              </span>
              <span className="pb-2 text-sm font-medium uppercase tracking-[0.18em] text-[#6d697a]">
                por música
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <StartMusicWidget
                buttonClassName="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
                buttonStyle={GRADIENT_GOLD}
                label="🎁 Criar Esse Presente"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e3d8f7] bg-[#f9f5ff] p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a497f]">
              O que você recebe
            </p>
            <ul className="mt-5 space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-[#2f2a37]">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#d9c9ff] text-[#3b2f53]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-base font-medium">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-[1.2rem] border border-[#d8c9f2] bg-white/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a497f]">
                Pagamento e atendimento
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#4b405d]">
                {paymentOptions.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#e8dcff] text-[#4a2d6d]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,211,102,0.25)] transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>

            <p className="mt-6 rounded-[1.2rem] border border-[#d8c9f2] bg-white/70 p-4 text-sm leading-relaxed text-[#4b405d]">
              Revisa, aprova e recebe uma canção feita com cuidado, atenção e emoção — sem
              complicação.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Order Form (multi-step) ---------------- */
const TIPOS_MUSICA = ["Romântica", "Acústica", "Pop", "Sertanejo", "Forró", "Infantil", "Outro"];

const OUTRO_GENEROS = [
  "Eletrônica / EDM",
  "Flashback",
  "Anos 80",
  "Forró",
  "Funk carioca / Funk brasileiro",
  "Jazz / Instrumental",
  "MPB",
  "Pagode",
  "Pop",
  "Pop romântico acústico",
  "Rap nacional",
  "R&B / Soul",
  "Reggae",
  "Cantiga infantil",
  "K-Pop",
  "Acústica",
  "Clássica",
];

const TIPOS_CANTOR = [
  { value: "feminino", label: "Voz feminina" },
  { value: "masculino", label: "Voz masculina" },
] as const;

type OrderFormState = {
  nome_cliente: string;
  telefone_cliente: string;
  email_cliente: string;
  para_quem: string;
  nome_receptor: string;
  ocasiao: string;
  genero_musical: string;
  outro_genero: string;
  tipo_cantor: "feminino" | "masculino";
  descricao: string;
  como_conheceu: "facebook" | "instagram" | "whatsapp" | "alguem" | "";
  nome_conheceu: string;
  bot_field: string;
};

const STEPS: { key: keyof OrderFormState; label: string; eyebrow: string }[] = [
  { key: "para_quem", label: "Para quem você quer criar essa canção? ❤️", eyebrow: "Etapa 1 de 6" },
  { key: "nome_cliente", label: "Como podemos te chamar?", eyebrow: "Etapa 2 de 6" },
  { key: "telefone_cliente", label: "Qual é o seu WhatsApp?", eyebrow: "Etapa 3 de 6" },
  { key: "ocasiao", label: "Qual é a ocasião especial?", eyebrow: "Etapa 4 de 6" },
  {
    key: "genero_musical",
    label: "Qual estilo combina com essa história?",
    eyebrow: "Etapa 5 de 6",
  },
  { key: "descricao", label: "Conte a história em poucas palavras", eyebrow: "Etapa 6 de 6" },
];
function OrderForm() {
  const send = useServerFn(sendOrder);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [orderId, setOrderId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const [formStartedAt, setFormStartedAt] = useState<number>(() => Date.now());
  const [form, setForm] = useState<OrderFormState>({
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    para_quem: "",
    nome_receptor: "",
    ocasiao: "",
    genero_musical: TIPOS_MUSICA[0],
    outro_genero: "",
    tipo_cantor: "feminino",
    descricao: "",
    como_conheceu: "",
    nome_conheceu: "",
    bot_field: "",
  });

  const descriptionSuggestions = [
    {
      label: "Para quem é a música?",
      value: "Esta música é para a pessoa que me apoiou na fé e me acompanhou em cada momento.",
    },
    {
      label: "Qual sentimento quer transmitir?",
      value: "Quero transmitir gratidão, amor e fé no nosso relacionamento e caminhada espiritual.",
    },
    {
      label: "Momento especial",
      value:
        "Descreva um momento especial, como quando vencemos juntos uma dificuldade ou recebemos uma bênção.",
    },
    {
      label: "Palavras importantes",
      value: "Inclua nomes, lugares e símbolos importantes, como igreja, família, casa ou oração.",
    },
    {
      label: "Como quer que ela se sinta?",
      value: "Quero que ela se sinta emocionada, fortalecida e abençoada ao ouvir esta canção.",
    },
    {
      label: "Qual mensagem fica na memória?",
      value:
        "Quero que a música deixe uma mensagem de amor, perseverança e agradecimento por tudo o que Deus fez.",
    },
    {
      label: "Qual bênção você quer celebrar?",
      value:
        "Quero celebrar a graça de Deus, a cura, a restauração e o cuidado que ele teve conosco em cada etapa.",
    },
    {
      label: "Como a música deve terminar?",
      value:
        "Quero uma finalização emocionante, com esperança, fé e um convite para continuar confiando em Deus.",
    },
  ];

  const occasionSuggestions = [
    "Aniversário",
    "Dia dos Namorados",
    "Casamento",
    "Aniversário de casamento",
    "Dia das Mães",
    "Dia dos Pais",
    "Batismo",
    "Comunhão",
    "Formatura",
    "Agradecimento por uma bênção",
    "Momento de superação",
    "Presente para uma pessoa especial",
  ];

  const appendDescriptionSuggestion = (suggestion: string) => {
    setForm((prev) => ({
      ...prev,
      descricao: prev.descricao.trim() ? `${prev.descricao.trim()} ${suggestion}` : suggestion,
    }));
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const validateStep = (): string | null => {
    if (form.bot_field.trim()) {
      return "Pedido inválido.";
    }

    if (current.key === "telefone_cliente") {
      const digits = form.telefone_cliente.replace(/\D/g, "");
      if (digits.length < 10) return "Informe um WhatsApp válido para a entrega da música.";
      return null;
    }

    if (current.key === "email_cliente") {
      const email = form.email_cliente.trim();
      if (!email) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return "Digite um e-mail válido ou deixe em branco.";
      return null;
    }

    if (current.key === "para_quem") {
      const hasRelation = form.para_quem.trim().length >= 2;
      const hasName = form.nome_receptor.trim().length >= 2;
      if (!hasRelation && !hasName) return "Preencha este campo para continuar.";
      return null;
    }

    const value = form[current.key].trim();
    if (current.key === "descricao" && value.length < 15)
      return "Conte um pouco mais (mínimo 15 caracteres).";
    if (current.key === "ocasiao" && value.length < 2) return "Preencha este campo para continuar.";
    if (current.key === "genero_musical" && value === "Outro" && !form.outro_genero.trim()) {
      return "Escolha um estilo na lista ou descreva outro gênero.";
    }
    if (value.length < 2) return "Preencha este campo para continuar.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => {
    setErrorMsg("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (form.bot_field.trim()) {
      setStatus("error");
      setErrorMsg("Pedido inválido.");
      return;
    }

    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setStatus("loading");
    try {
      const res = await send({ data: { ...form, form_started_at: formStartedAt } });
      setOrderId(res.id);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Erro ao enviar pedido.");
    }
  };

  useEffect(() => {
    if (status === "ok" && orderId) {
      const timer = window.setTimeout(() => {
        navigate({ to: "/acompanhar", search: { id: orderId } });
      }, 500);

      return () => window.clearTimeout(timer);
    }
  }, [status, orderId, navigate]);

  const reset = () => {
    setFormStartedAt(Date.now());
    setForm({
      nome_cliente: "",
      telefone_cliente: "",
      email_cliente: "",
      para_quem: "",
      nome_receptor: "",
      ocasiao: "",
      genero_musical: TIPOS_MUSICA[0],
      outro_genero: "",
      tipo_cantor: "feminino",
      descricao: "",
      como_conheceu: "",
      nome_conheceu: "",
      bot_field: "",
    });
    setStep(0);
    setStatus("idle");
    setErrorMsg("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && current.key !== "descricao") {
      e.preventDefault();
      if (step === STEPS.length - 1) submit();
      else next();
    }
  };

  return (
    <section id="pedido" className="bg-[#e8e2ef] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[980px]">
        <div className="mx-auto mb-5 max-w-[700px] rounded-[16px] border border-[#d5c3ef] bg-[#f3eef9] px-5 py-3 text-center text-[15px] font-medium text-[#4f4f61] shadow-[0_10px_20px_rgba(86,73,121,0.08)]">
          O jingle que produziram triplicou o engajamento da campanha. – Agência Nova
        </div>

        <h2 className="text-center font-display text-[clamp(2.7rem,5vw,5rem)] leading-[0.94] tracking-[-0.06em] text-[#ef4557]">
          Transforme sua história em uma música única
        </h2>
        <p className="mx-auto mt-4 max-w-[760px] text-center text-[1.05rem] text-[#544d5f]">
          Preencha o formulário abaixo e receba um orçamento personalizado em poucas horas.
        </p>

        <div className="reveal mt-10 rounded-[30px] border-[2px] border-[#b995ef] bg-[#f8f4fb] p-5 shadow-[0_14px_35px_rgba(119,95,170,0.12)] md:p-10 max-h-[80vh] overflow-y-auto">
          {status === "ok" ? (
            <div className="py-10 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sky-blue)]/10 text-[var(--sky-blue)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold text-primary">
                Pedido recebido! 🎉
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Redirecionando você para o acompanhamento do pedido e a etapa de produção.
              </p>
              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-border bg-[var(--soft-gray)] px-4 py-3 font-mono text-xs break-all text-primary">
                {orderId}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() =>
                    orderId && navigate({ to: "/acompanhar", search: { id: orderId } })
                  }
                  style={GRADIENT_GOLD}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)]"
                >
                  <Sparkles className="h-4 w-4" /> Acompanhar meu pedido
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-primary hover:border-[var(--gold)]"
                >
                  Fazer outro pedido
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{current.eyebrow}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    style={{ ...GRADIENT_GOLD, width: `${progress}%` }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <label className="block">
                <span className="mb-3 block font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] text-[#e4374c] sm:text-2xl">
                  {current.label}
                </span>

                {form.bot_field !== "" && (
                  <div className="sr-only" aria-hidden="true">
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.bot_field}
                      onChange={(e) => setForm({ ...form, bot_field: e.target.value })}
                    />
                  </div>
                )}

                {current.key === "descricao" ? (
                  <>
                    <textarea
                      autoFocus
                      rows={6}
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      onKeyDown={onKeyDown}
                      className="w-full resize-y rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-sm text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                      placeholder="Ex.: Quero uma música que fale sobre nossa história de amor, a fé que nos uniu, o nascimento da nossa filha…"
                    />

                    <div className="rounded-[18px] border border-[#d8c8f4] bg-[#f7f1ff] p-4 text-left">
                      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#5c4a77]">
                        Como você nos conheceu?
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { value: "facebook", label: "Facebook" },
                          { value: "instagram", label: "Instagram" },
                          { value: "whatsapp", label: "WhatsApp" },
                          { value: "alguem", label: "Alguém" },
                        ].map((option) => {
                          const active = form.como_conheceu === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  como_conheceu: option.value,
                                  nome_conheceu: option.value === "alguem" ? form.nome_conheceu : "",
                                })
                              }
                              className={`rounded-full border px-4 py-3 text-left text-sm font-medium transition-all ${
                                active
                                  ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                                  : "border-[#d6c4f4] bg-[#f9f6fb] text-[#4c425b] hover:border-[#a98ae9]"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {form.como_conheceu === "alguem" && (
                        <label className="mt-3 block">
                          <span className="mb-2 block text-[13px] font-medium text-[#2f2a37]">
                            Nome da pessoa
                          </span>
                          <input
                            type="text"
                            value={form.nome_conheceu}
                            onChange={(e) => setForm({ ...form, nome_conheceu: e.target.value })}
                            className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                            placeholder="Ex.: Ana, Carlos, João"
                          />
                        </label>
                      )}
                    </div>

                    <div className="sr-only" aria-hidden="true">
                      <label>
                        Campo de verificação
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={form.bot_field}
                          onChange={(e) => setForm({ ...form, bot_field: e.target.value })}
                        />
                      </label>
                    </div>
                    <p className="text-sm font-medium text-[#1f1a24]">
                      Quanto mais detalhes, mais linda fica a música.
                    </p>
                  </>
                ) : current.key === "telefone_cliente" ? (
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-primary">
                        WhatsApp para entrega
                      </span>
                      <input
                        autoFocus
                        type="tel"
                        value={form.telefone_cliente}
                        onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                        placeholder="(99) 99999-9999"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-primary">
                        E-mail para avisos (opcional)
                      </span>
                      <input
                        type="email"
                        value={form.email_cliente}
                        onChange={(e) => setForm({ ...form, email_cliente: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                        placeholder="seuemail@email.com"
                      />
                    </label>

                    <p className="text-sm text-muted-foreground">
                      WhatsApp obrigatório para a entrega. E-mail opcional, apenas para avisos e
                      confirmação.
                    </p>
                  </div>
                ) : current.key === "para_quem" ? (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-primary">
                        Quem vai receber a música?
                      </span>
                      <input
                        autoFocus
                        type="text"
                        value={form.para_quem}
                        onChange={(e) => setForm({ ...form, para_quem: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                        placeholder="Ex.: Minha esposa, meu filho"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-medium text-primary">
                        Qual o nome dele(a)?
                      </span>
                      <input
                        type="text"
                        value={form.nome_receptor}
                        onChange={(e) => setForm({ ...form, nome_receptor: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                        placeholder="Ex.: Maria, João, Ana"
                      />
                    </label>
                  </div>
                ) : current.key === "genero_musical" ? (
                  <div className="space-y-5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {TIPOS_MUSICA.map((t) => {
                        const active = form.genero_musical === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setForm({ ...form, genero_musical: t })}
                            className={`rounded-full border px-4 py-3 text-left text-sm font-medium transition-all ${
                              active
                                ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                                : "border-[#d9c8f5] bg-[#f9f6fb] text-[#5a5166] hover:border-[#a98ae9]"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {form.genero_musical === "Outro" && (
                      <label className="block rounded-2xl border border-border bg-background p-4">
                        <span className="mb-2 block text-sm font-medium text-primary">
                          Descreva outro estilo
                        </span>
                        <input
                          type="text"
                          value={form.outro_genero}
                          onChange={(e) => setForm({ ...form, outro_genero: e.target.value })}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-[var(--sky-blue)]"
                          placeholder="Ex.: R&B / Soul, Balada pop gospel, Pagode gospel"
                        />
                      </label>
                    )}

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <span className="mb-3 block text-sm font-medium text-[#1f1a24]">
                        Qual voz mais combina com a música?
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {TIPOS_CANTOR.map(({ value, label }) => {
                          const active = form.tipo_cantor === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setForm({ ...form, tipo_cantor: value })}
                              className={`rounded-full border px-4 py-3 text-sm font-medium transition-all ${
                                active
                                  ? "border-[#8d69d8] bg-[#efe7ff] text-[#3a2d53]"
                                  : "border-[#d9c8f5] bg-[#f9f6fb] text-[#5a5166] hover:border-[#a98ae9]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : current.key === "ocasiao" ? (
                  <div className="space-y-4">
                    <input
                      autoFocus
                      type="text"
                      value={form.ocasiao}
                      onChange={(e) => setForm({ ...form, ocasiao: e.target.value })}
                      onKeyDown={onKeyDown}
                      className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                      placeholder="Ex.: Aniversário de casamento, Dia das Mães, batismo, gratidão por uma bênção..."
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {occasionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setForm({ ...form, ocasiao: suggestion })}
                          className="rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-primary transition hover:border-[var(--sky-blue)]/40 hover:bg-[var(--sky-blue)]/5"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    autoFocus
                    type="text"
                    value={form[current.key]}
                    onChange={(e) => setForm({ ...form, [current.key]: e.target.value })}
                    onKeyDown={onKeyDown}
                    className="w-full rounded-[14px] border border-[#c8b3f6] bg-[#f9f6fb] px-4 py-3 text-base text-[#2f2a37] outline-none placeholder:text-[#8a7d98] focus:border-[#7e5ad8]"
                    placeholder={current.key === "nome_cliente" ? "Ex.: Maria Silva Souza" : ""}
                  />
                )}
              </label>

              {errorMsg && status !== "loading" && (
                <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMsg}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={prev}
                  disabled={step === 0 || status === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d7c8ef] bg-[#f2ecfa] px-5 py-3 text-sm font-semibold text-[#4d3d5d] transition-colors hover:border-[#b88fe9] disabled:opacity-40"
                >
                  Voltar
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#b68cff] to-[#7d5ad8] px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(125,90,216,0.35)] transition-transform hover:-translate-y-0.5"
                  >
                    Continuar <Sparkles className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === "loading"}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#b68cff] to-[#7d5ad8] px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(125,90,216,0.35)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                  >
                    {status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {status === "loading" ? "Enviando…" : "Enviar meu pedido"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const items = [
    {
      q: "Preciso saber escrever música?",
      a: "Não. Você só precisa contar a sua história, a emoção e o momento que quer celebrar. A partir disso, a música é criada para você.",
    },
    {
      q: "Como envio minha história?",
      a: "Você relata tudo no formulário do site, incluindo a pessoa, a ocasião e os detalhes que quiser que apareçam na letra e na mensagem da música.",
    },
    {
      q: "Como recebo a música?",
      a: "A entrega é 100% digital. Depois do processo, você recebe a música por meio do WhatsApp e do canal de acompanhamento do pedido.",
    },
    {
      q: "Quanto tempo demora?",
      a: "O processo é rápido e pensado para ser simples: você conta a história, aprova a letra e a música é produzida de acordo com o processo do projeto.",
    },
    {
      q: "Posso escolher o estilo?",
      a: "Sim. Você pode indicar o estilo musical que mais combina com a sua história, como romântico, pop, acústico, sertanejo, forró e outros.",
    },
    {
      q: "Posso fazer uma música para outra pessoa?",
      a: "Sim. O processo foi pensado para música para presente, homenagem, aniversário, casamento, família e qualquer momento especial.",
    },
    {
      q: "Posso pedir alterações?",
      a: "Sim. A prévia da música e a revisão da letra fazem parte do processo para você ajustar o que for preciso antes da entrega final.",
    },
    {
      q: "Posso usar como presente?",
      a: "Sim. Essa é uma das principais ideias do serviço: transformar uma história real em um presente emocional, pessoal e inesquecível.",
    },
    {
      q: "O pagamento é seguro?",
      a: "O projeto utiliza checkout seguro para processar a compra e mantém o acompanhamento do pedido de forma transparente.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Dúvidas" title="Perguntas frequentes" />
        <div className="reveal mt-12 space-y-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={it.q}
                className={`overflow-hidden rounded-2xl border bg-card transition-all ${
                  isOpen
                    ? "border-[var(--sky-blue)]/40 shadow-[var(--shadow-soft)]"
                    : "border-border"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base font-semibold text-primary sm:text-lg">
                    {it.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[var(--sky-blue)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCTA() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div
          style={GRADIENT_HERO}
          className="reveal relative overflow-hidden rounded-[2.5rem] px-6 py-20 text-center shadow-[var(--shadow-glow)] md:px-16 md:py-28"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.13_85/0.18),transparent_60%)]" />
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--sky-blue)]/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[var(--gold)]/15 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" /> Presente que toca o coração
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl md:text-6xl">
              Transforme uma história importante em uma lembrança que pode ser ouvida para sempre.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-white/80">
              Comece agora e crie uma música feita para a pessoa que você ama.
            </p>
            <StartMusicWidget
              buttonClassName="mt-10 inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-semibold text-[#071d2d] shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              buttonStyle={GRADIENT_GOLD}
              label="🎵 Transformar Minha História em Música"
              icon={<Sparkles className="h-5 w-5" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-[var(--soft-gray)] px-5 py-14 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              style={GRADIENT_GOLD}
              className="grid h-9 w-9 place-items-center rounded-full text-primary"
            >
              <Music className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold text-primary">Canção de Fé</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Vita Core Music
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Músicas personalizadas, feitas com cuidado para eternizar histórias de amor, emoção e
            lembranças.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Links
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="/privacy-policy" className="hover:text-primary transition-colors">
                Política de Privacidade
              </a>
            </li>
            <li>
              <a href="/terms-of-service" className="hover:text-primary transition-colors">
                Termos de Uso
              </a>
            </li>
            <li>
              <a href="/support" className="hover:text-primary transition-colors">
                Suporte
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Siga-nos
          </div>
          <div className="mt-4 flex gap-3">
            {[
              { icon: MessageCircle, href: WHATSAPP_URL, label: "WhatsApp" },
              { icon: Instagram, href: "#", label: "Instagram" },
              { icon: Facebook, href: "#", label: "Facebook" },
              { icon: TikTokIcon, href: "#", label: "TikTok" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-primary transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vita Core Music. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.5 3a5.5 5.5 0 0 0 4.5 4.5v3a8.4 8.4 0 0 1-4.5-1.3v6.6a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.1a2.7 2.7 0 1 0 1.8 2.5V3h3z" />
    </svg>
  );
}

/* ---------------- Shared ---------------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sky-blue)]">
        <span className="h-px w-6 bg-[var(--sky-blue)]/40" />
        {eyebrow}
        <span className="h-px w-6 bg-[var(--sky-blue)]/40" />
      </div>
      <h2 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight text-primary sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-balance text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// CheckCircle2 imported but kept implicit; suppress unused warning
void CheckCircle2;
