import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Play,
  Music,
  Heart,
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
import { sendOrder } from "@/lib/order.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isValidPersonName } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canção de Fé — Músicas Gospel Personalizadas" },
      {
        name: "description",
        content:
          "Transforme sua história de fé em uma música gospel exclusiva, criada especialmente para você e sua família. Produção profissional e entrega digital.",
      },
      { property: "og:title", content: "Canção de Fé — Músicas Gospel Personalizadas" },
      {
        property: "og:description",
        content:
          "Sua história merece ser cantada. Crie uma canção gospel única, baseada na sua jornada de fé.",
      },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Canção de Fé" },
      {
        name: "twitter:description",
        content: "Músicas gospel personalizadas, criadas a partir da sua história.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const CREATE_URL = "#pedido";
const WHATSAPP_URL = "https://wa.me/5541997232395?text=Quero%20criar%20minha%20Can%C3%A7%C3%A3o%20de%20F%C3%A9";
const EXAMPLE_AUDIO_URL = "https://coivogokbzizhwfhywkp.supabase.co/storage/v1/object/public/musicas/Cancao%20de%20fe.mp3";
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
        <HowItWorks />
        <Occasions />
        <Differentials />
        <Testimonials />
        <OrderForm />
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
          <span style={GRADIENT_GOLD} className="grid h-9 w-9 place-items-center rounded-full text-primary shadow-[var(--shadow-gold)]">
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
          <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
          <a href="#exemplos" className="transition-colors hover:text-white">Exemplos</a>
          <a href="#ocasioes" className="transition-colors hover:text-white">Ocasiões</a>
          <a href="#faq" className="transition-colors hover:text-white">Perguntas</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/acompanhar"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            <Music className="h-4 w-4" /> Acompanhar Pedido
          </a>
          <StartMusicWidget
            buttonClassName="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
            buttonStyle={GRADIENT_GOLD}
            label="Criar Minha Canção — R$19,90"
            icon={<Sparkles className="h-4 w-4" />}
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
}: {
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  label: string;
  icon?: React.ReactNode;
}) {
  const send = useServerFn(sendOrder);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [widgetStep, setWidgetStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number>(() => Date.now());
  const [form, setForm] = useState<OrderFormState>({
    nome_cliente: "",
    telefone_cliente: "",
    email_cliente: "",
    para_quem: "",
    ocasiao: "",
    genero_musical: TIPOS_MUSICA[0],
    outro_genero: "",
    tipo_cantor: "feminino",
    descricao: "",
    bot_field: "",
  });

  const widgetSteps = [
    { key: "nome_cliente", label: "Qual é o seu nome completo?", eyebrow: "Passo 1 de 6", placeholder: "Ex.: Maria Silva Souza" },
    { key: "telefone_cliente", label: "Qual é o seu WhatsApp? (obrigatório)", eyebrow: "Passo 2 de 6", placeholder: "(99) 99999-9999" },
    { key: "para_quem", label: "Quem vai receber a música?", eyebrow: "Passo 3 de 6", placeholder: "Ex.: Minha esposa, meu filho" },
    { key: "ocasiao", label: "Qual é a ocasião?", eyebrow: "Passo 4 de 6", placeholder: "Ex.: Aniversário, casamento" },
    { key: "genero_musical", label: "Qual gênero musical deseja?", eyebrow: "Passo 5 de 6", placeholder: "" },
    { key: "descricao", label: "Conte sua história e o que deve aparecer na música", eyebrow: "Passo 6 de 6", placeholder: "Ex.: Quero uma música emocionante sobre nossa história..." },
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
    { label: "Para quem é a música?", value: "Esta música é para a pessoa que me apoiou na fé e me acompanhou em cada momento." },
    { label: "Qual sentimento quer transmitir?", value: "Quero transmitir gratidão, amor e fé no nosso relacionamento e caminhada espiritual." },
    { label: "Momento especial", value: "Descreva um momento especial, como quando vencemos juntos uma dificuldade ou recebemos uma bênção." },
    { label: "Palavras importantes", value: "Inclua nomes, lugares e símbolos importantes, como igreja, família, casa ou oração." },
    { label: "Como quer que ela se sinta?", value: "Quero que ela se sinta emocionada, fortalecida e abençoada ao ouvir esta canção." },
  ];

  const current = widgetSteps[widgetStep];
  const progress = ((widgetStep + 1) / widgetSteps.length) * 100;

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
      ocasiao: "",
      genero_musical: TIPOS_MUSICA[0],
      outro_genero: "",
      tipo_cantor: "feminino",
      descricao: "",
      bot_field: "",
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
      if (form.email_cliente.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_cliente.trim())) {
        return "Digite um e-mail válido ou deixe em branco.";
      }
      return null;
    }
    if (current.key === "para_quem") {
      return form.para_quem.trim().length < 2 ? "Descreva para quem será a música." : null;
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
      const mensagem = error instanceof Error ? error.message : "Não foi possível criar a música agora. Tente novamente.";
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
        <button type="button" style={buttonStyle} className={buttonClassName}>
          {icon}
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[920px] overflow-hidden border border-[var(--sky-blue)]/25 bg-[#031926] p-0 text-white shadow-[0_30px_80px_rgba(1,10,22,0.75)] sm:rounded-[28px]">
        <div className="max-h-[80vh] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(103,176,245,0.18),transparent_40%),linear-gradient(180deg,rgba(3,25,38,0.96),rgba(3,20,32,0.98))] px-6 py-6 sm:px-8 sm:py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-sky-100/75">
              <span>{current.eyebrow}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                style={{ ...GRADIENT_GOLD, width: `${progress}%` }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100/15 bg-sky-100/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
              <Sparkles className="h-3 w-3 text-[var(--gold)]" />
              Criar minha música
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#f5e7d0] sm:text-5xl">
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
                  <span className="mb-2 block text-sm font-medium text-sky-100">WhatsApp obrigatório</span>
                  <input
                    autoFocus
                    type="tel"
                    value={form.telefone_cliente}
                    onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-[#071a2d] px-4 py-3 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
                    placeholder={current.placeholder}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-sky-100">E-mail (opcional)</span>
                  <input
                    type="email"
                    value={form.email_cliente}
                    onChange={(e) => setForm({ ...form, email_cliente: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-[#071a2d] px-4 py-3 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
                    placeholder="seuemail@email.com"
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
                  className="w-full rounded-2xl border border-[var(--sky-blue)]/60 bg-[#071a2d] px-4 py-3 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
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
                          ? "border-[var(--sky-blue)] bg-[var(--sky-blue)]/10 text-[#f4e8d8]"
                          : "border-[var(--sky-blue)]/50 bg-[#071a2d] text-sky-50 hover:border-[var(--gold)]/60"
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
                          ? "border-[var(--gold)] bg-[rgba(214,171,59,0.12)] text-[#f4e8d8]"
                          : "border-[var(--sky-blue)]/50 bg-[#071a2d] text-sky-50 hover:border-[var(--gold)]/60"
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>

                {form.genero_musical === "Outro" && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-sky-100">Descreva outro estilo</span>
                    <input
                      type="text"
                      value={form.outro_genero}
                      onChange={(e) => setForm({ ...form, outro_genero: e.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-[#071a2d] px-4 py-3 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
                      placeholder="Ex.: R&B / Soul, Pop gospel, Forró gospel"
                    />
                  </label>
                )}

                <div className="space-y-3 pt-2">
                  <h4 className="font-display text-2xl font-semibold text-[#f4e8d8]">Qual voz mais combina com a música?</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {TIPOS_CANTOR.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, tipo_cantor: value })}
                        className={`rounded-full border px-4 py-4 text-left text-lg font-medium transition-all ${
                          form.tipo_cantor === value
                            ? "border-[var(--sky-blue)] bg-[var(--sky-blue)]/10 text-[#f4e8d8]"
                            : "border-[var(--sky-blue)]/50 bg-[#071a2d] text-sky-50 hover:border-[var(--gold)]/60"
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
                  rows={6}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full rounded-2xl border border-[var(--sky-blue)]/60 bg-[#071a2d] px-4 py-4 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
                  placeholder={current.placeholder}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {descriptionSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, descricao: prev.descricao.trim() ? `${prev.descricao.trim()} ${suggestion.value}` : suggestion.value }))}
                      className="rounded-2xl border border-[var(--sky-blue)]/50 bg-[#071a2d] p-4 text-left text-sm text-sky-50 transition-colors hover:border-[var(--gold)]/60 hover:text-[#f4e8d8]"
                    >
                      <span className="font-semibold text-[#f4e8d8]">{suggestion.label}</span>
                      <p className="mt-1 text-sky-100/80">{suggestion.value}</p>
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-[var(--sky-blue)]/40 bg-[rgba(19,60,82,0.35)] p-4 text-sm leading-relaxed text-sky-100/80">
                  <h5 className="mb-2 font-semibold text-[#f4e8d8]">Dicas para deixar a música perfeita</h5>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Para quem é a música? Diga o nome da pessoa e sua relação com ela.</li>
                    <li>Qual sentimento deve prevalecer? Ex.: gratidão, fé, amor, esperança, celebração.</li>
                    <li>Quais momentos especiais lembrar? Encontros, bênçãos, superações, vitórias ou bênçãos.</li>
                    <li>Quais palavras ou imagens não podem faltar? Nomes, lugares, símbolos, sonhos ou expressões importantes.</li>
                    <li>Como quer que a pessoa se sinta ao ouvir? Emocionada, acolhida, tocada, fortalecida ou inspirada.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <input
                autoFocus
                type="text"
                value={form[current.key]}
                onChange={(e) => setForm({ ...form, [current.key]: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#071a2d] px-4 py-3 text-base text-white outline-none placeholder:text-sky-100/30 focus:border-[var(--gold)]"
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
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-sky-50 transition-colors hover:border-white/30 disabled:opacity-40"
            >
              Voltar
            </button>

            {widgetStep < widgetSteps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                style={GRADIENT_GOLD}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              >
                Continuar <Sparkles className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={status === "loading"}
                style={GRADIENT_GOLD}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              >
                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.15;
    audio.currentTime = 0;
    audio.play()
      .then(() => setIsExamplePlaying(true))
      .catch(() => {
        setIsExamplePlaying(false);
      });

    const target = document.getElementById("exemplos");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePauseExample = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play()
        .then(() => setIsExamplePlaying(true))
        .catch(() => setIsExamplePlaying(false));
      return;
    }

    audio.pause();
    setIsExamplePlaying(false);
  };

  return (
    <>
      <audio ref={audioRef} src={EXAMPLE_AUDIO_URL} preload="auto" playsInline onPause={() => setIsExamplePlaying(false)} onPlay={() => setIsExamplePlaying(true)} />
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

        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-5 pb-20 pt-36 text-center md:pt-44">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/25 bg-sky-100/8 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-sky-100 backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
            Música Gospel Personalizada
          </span>

          <h1
            className="text-balance font-display text-4xl font-semibold leading-[1.05] text-white sm:text-6xl md:text-7xl animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Sua história pode virar uma <span className="bg-gradient-to-r from-[var(--gold-soft)] via-white to-[var(--gold)] bg-clip-text text-transparent">música gospel personalizada</span>
          </h1>

          <p
            className="mt-6 max-w-2xl text-balance text-base text-sky-50/85 sm:text-lg animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            Conte sua história e receba uma canção criada especialmente para você ou para alguém especial.
          </p>

          <div
            className="mt-4 text-balance text-xl font-semibold text-[var(--gold)] animate-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            Por apenas R$ 19,90
          </div>

          <p
            className="mt-3 max-w-2xl text-balance text-sm text-sky-50/80 animate-fade-up"
            style={{ animationDelay: "310ms" }}
          >
            Você conta sua história → aprova a letra → recebe sua música
          </p>

          <div
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row animate-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <StartMusicWidget
              buttonClassName="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              buttonStyle={GRADIENT_GOLD}
              label="Criar Minha Canção — R$19,90"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <a
              href="#exemplos"
              onClick={handleExampleClick}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              <Play className="h-4 w-4" /> Ouvir um exemplo
            </a>
          </div>

          <div
            className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 text-center animate-fade-up"
            style={{ animationDelay: "420ms" }}
          >
            <Stat value="1.350+" label="Músicas criadas" />
            <Stat value="4.9" label="Avaliação média" icon={<Star className="h-3 w-3 fill-current" />} />
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
          <div key={label} className="flex items-center justify-center gap-2 text-xs font-medium text-sky-50 sm:text-sm">
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
    { n: "01", title: "Você conta sua história", desc: "Compartilhe a emoção, o momento e a pessoa que você quer homenagear." },
    { n: "02", title: "Nós criamos a letra", desc: "Transformamos sua história em uma mensagem emocional, envolvente e exclusiva." },
    { n: "03", title: "Você aprova", desc: "Receba a prévia e confirme o resultado com tranquilidade antes da música final." },
    { n: "04", title: "Você recebe sua música", desc: "Baixe a composição final e compartilhe esse momento especial com quem você ama." },
  ];
  return (
    <section id="como-funciona" className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_30%),#041827] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Como funciona"
          title="Seu testemunho merece virar uma canção"
          subtitle="Transforme sua história de fé, amor e superação em uma música gospel exclusiva, criada especialmente para você ou para alguém especial."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    { emoji: "🙏", label: "Gratidão a Deus" },
    { emoji: "❤️", label: "Homenagem para Esposa" },
    { emoji: "👨‍👩‍👧", label: "Família" },
    { emoji: "👶", label: "Nascimento" },
    { emoji: "🎂", label: "Aniversário" },
    { emoji: "💍", label: "Casamento" },
    { emoji: "🎓", label: "Formatura" },
    { emoji: "✝️", label: "Batismo" },
    { emoji: "🌅", label: "Testemunho" },
    { emoji: "🙌", label: "Ministério" },
  ];
  return (
    <section id="ocasioes" className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%),#041827] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Para cada momento"
          title="Ocasiões para celebrar"
          subtitle="Uma canção pode marcar para sempre os momentos que mais importam."
        />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it, i) => (
            <div
              key={it.label}
              className="reveal group flex flex-col items-center gap-2 rounded-2xl border border-sky-200/10 bg-[#0b1f2d]/80 px-4 py-6 text-center shadow-[0_8px_30px_rgba(7,17,25,0.35)] transition-all hover:-translate-y-1 hover:border-[var(--gold)]/40"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <span className="text-3xl transition-transform group-hover:scale-110">{it.emoji}</span>
              <span className="text-sm font-medium text-white">{it.label}</span>
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
    { icon: Sparkles, title: "Música Exclusiva", desc: "Cada música é criada do zero, sem modelos prontos." },
    { icon: Heart, title: "Letra Personalizada", desc: "Inspirada inteiramente na sua história e na sua fé." },
    { icon: Headphones, title: "Produção Profissional", desc: "Qualidade de estúdio em cada arranjo." },
    { icon: Send, title: "Entrega Digital", desc: "Receba sua música rapidamente, pronta para compartilhar." },
    { icon: MessageCircle, title: "Atendimento Humanizado", desc: "Suporte direto via WhatsApp, com carinho." },
  ];
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Por que escolher"
          title="Feito com cuidado, do início ao fim"
        />
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
      quote: "Eu chorei ao ouvir a música. Eles conseguiram colocar toda a nossa história em uma canção com tanto carinho.",
      name: "Maria, SP",
    },
    {
      quote: "Foi o presente mais emocionante que já demos. A letra parecia ter sido escrita exatamente para a nossa família.",
      name: "Marcos & Júlia",
    },
    {
      quote: "A mensagem ficou tão forte e tão pessoal que até os meus pais ficaram emocionados. Valeu cada detalhe.",
      name: "Rafael, RJ",
    },
    {
      quote: "A música tocou no coração da minha esposa e ela disse que parecia uma parte da nossa história em forma de música.",
      name: "Thiago, MG",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-[var(--soft-gray)] to-background px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Depoimentos"
          title="Histórias que viraram canção"
          subtitle="Pessoas que confiaram na sua história para criar algo que vai ficar marcado para sempre."
        />

        <div className="reveal mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:border-[var(--gold)]/40"
            >
              <div className="flex gap-1 text-[var(--gold)]">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <blockquote className="mt-5 flex-1 text-base leading-relaxed text-primary">
                “{item.quote}”
              </blockquote>

              <div className="mt-6 border-t border-border pt-4 text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {item.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Order Form (multi-step) ---------------- */
const TIPOS_MUSICA = [
  "Adoração",
  "Congregacional",
  "Intimista / Acústica",
  "Romântica Gospel",
  "Infantil",
  "Sertanejo Gospel",
  "Pop Gospel",
  "Outro",
];

const OUTRO_GENEROS = [
  "Eletrônica / EDM",
  "Flashback",
  "Anos 80",
  "Forró",
  "Funk carioca / Funk brasileiro",
  "Gospel / Música cristã",
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
  ocasiao: string;
  genero_musical: string;
  outro_genero: string;
  tipo_cantor: "feminino" | "masculino";
  descricao: string;
  bot_field: string;
};

const STEPS: { key: keyof OrderFormState; label: string; eyebrow: string }[] = [
  { key: "nome_cliente", label: "Qual é o seu nome completo?", eyebrow: "Passo 1 de 6" },
  { key: "telefone_cliente", label: "Qual é o seu WhatsApp? (obrigatório)", eyebrow: "Passo 2 de 6" },
  { key: "para_quem", label: "Quem vai receber a música?", eyebrow: "Passo 3 de 6" },
  { key: "ocasiao", label: "Qual é a ocasião?", eyebrow: "Passo 4 de 6" },
  { key: "genero_musical", label: "Qual gênero musical deseja?", eyebrow: "Passo 5 de 6" },
  { key: "descricao", label: "Conte sua história e o que deve aparecer na música", eyebrow: "Passo 6 de 6" },
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
    ocasiao: "",
    genero_musical: TIPOS_MUSICA[0],
    outro_genero: "",
    tipo_cantor: "feminino",
    descricao: "",
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
      value: "Descreva um momento especial, como quando vencemos juntos uma dificuldade ou recebemos uma bênção.",
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
      descricao: prev.descricao.trim()
        ? `${prev.descricao.trim()} ${suggestion}`
        : suggestion,
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Digite um e-mail válido ou deixe em branco.";
      return null;
    }

    const value = form[current.key].trim();
    if (current.key === "descricao" && value.length < 15) return "Conte um pouco mais (mínimo 15 caracteres).";
    if ((current.key === "para_quem" || current.key === "ocasiao") && value.length < 2) return "Preencha este campo para continuar.";
    if (current.key === "genero_musical" && value === "Outro" && !form.outro_genero.trim()) {
      return "Escolha um estilo na lista ou descreva outro gênero.";
    }
    if (value.length < 2) return "Preencha este campo para continuar.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => { setErrorMsg(""); setStep((s) => Math.max(s - 1, 0)); };

  const submit = async () => {
    if (form.bot_field.trim()) {
      setStatus("error");
      setErrorMsg("Pedido inválido.");
      return;
    }

    const err = validateStep();
    if (err) { setErrorMsg(err); return; }
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
      ocasiao: "",
      genero_musical: TIPOS_MUSICA[0],
      outro_genero: "",
      tipo_cantor: "feminino",
      descricao: "",
      bot_field: "",
    });
    setStep(0);
    setStatus("idle");
    setErrorMsg("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && current.key !== "descricao") {
      e.preventDefault();
      if (step === STEPS.length - 1) submit(); else next();
    }
  };

  return (
    <section id="pedido" className="bg-[var(--soft-gray)] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionHeader
          eyebrow="Criar minha música"
          title="Conte sua história em poucos passos"
          subtitle="Responda uma pergunta de cada vez. Leva menos de 2 minutos."
        />

        <div className="reveal mt-12 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-10 max-h-[80vh] overflow-y-auto">
          {status === "ok" ? (
            <div className="py-10 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sky-blue)]/10 text-[var(--sky-blue)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold text-primary">Pedido recebido! 🎉</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Redirecionando você para o acompanhamento do pedido e a etapa de produção.
              </p>
              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-border bg-[var(--soft-gray)] px-4 py-3 font-mono text-xs break-all text-primary">
                {orderId}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => orderId && navigate({ to: "/acompanhar", search: { id: orderId } })}
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
                <span className="mb-3 block font-display text-xl font-semibold text-primary sm:text-2xl">
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
                      className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-[var(--sky-blue)]"
                      placeholder="Ex.: Quero uma música que fale sobre nossa história de amor, a fé que nos uniu, o nascimento da nossa filha…"
                    />
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {descriptionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.label}
                          type="button"
                          onClick={() => appendDescriptionSuggestion(suggestion.value)}
                          className="rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-primary transition hover:border-[var(--sky-blue)]/40 hover:bg-[var(--sky-blue)]/5"
                        >
                          <span className="font-semibold">{suggestion.label}</span>
                          <p className="mt-1 text-xs text-muted-foreground">{suggestion.value}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-[var(--sky-blue)]/30 bg-[var(--sky-blue)]/5 p-4 text-sm text-muted-foreground">
                      <p className="font-semibold text-primary mb-3">Dicas para deixar a música perfeita</p>
                      <ul className="list-disc space-y-2 pl-5">
                        <li><strong>Para quem é a música?</strong> Diga o nome da pessoa e sua relação com ela.</li>
                        <li><strong>Qual sentimento deve prevalecer?</strong> Ex.: gratidão, fé, amor, esperança, celebração.</li>
                        <li><strong>Quais momentos especiais lembrar?</strong> Encontros, bênçãos, superações, vitórias ou bênçãos.</li>
                        <li><strong>Quais palavras ou imagens não podem faltar?</strong> Nomes, lugares, símbolos, sonhos ou expressões importantes.</li>
                        <li><strong>Como quer que a pessoa se sinta ao ouvir?</strong> Emocionada, acolhida, tocada, fortalecida ou inspirada.</li>
                      </ul>
                      <p className="mt-3">Estas informações ajudam nosso sistema a gerar a letra e o roteiro da música com mais precisão.</p>
                    </div>
                  </>
                ) : current.key === "telefone_cliente" ? (
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-primary">WhatsApp para entrega</span>
                      <input
                        autoFocus
                        type="tel"
                        value={form.telefone_cliente}
                        onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-[var(--sky-blue)]"
                        placeholder="(99) 99999-9999"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-primary">E-mail para avisos (opcional)</span>
                      <input
                        type="email"
                        value={form.email_cliente}
                        onChange={(e) => setForm({ ...form, email_cliente: e.target.value })}
                        onKeyDown={onKeyDown}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-[var(--sky-blue)]"
                        placeholder="seuemail@email.com"
                      />
                    </label>

                    <p className="text-sm text-muted-foreground">
                      WhatsApp obrigatório para a entrega. E-mail opcional, apenas para avisos e confirmação.
                    </p>
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
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                              active
                                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-primary shadow-[var(--shadow-soft)]"
                                : "border-border bg-background text-muted-foreground hover:border-[var(--sky-blue)]/40 hover:text-primary"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {form.genero_musical === "Outro" && (
                      <label className="block rounded-2xl border border-border bg-background p-4">
                        <span className="mb-2 block text-sm font-medium text-primary">Descreva outro estilo</span>
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
                      <span className="mb-3 block text-sm font-medium text-primary">Qual voz mais combina com a música?</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {TIPOS_CANTOR.map(({ value, label }) => {
                          const active = form.tipo_cantor === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setForm({ ...form, tipo_cantor: value })}
                              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                                active
                                  ? "border-[var(--sky-blue)] bg-[var(--sky-blue)]/10 text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-[var(--sky-blue)]/40 hover:text-primary"
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
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-[var(--sky-blue)]"
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
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-[var(--sky-blue)]"
                    placeholder={
                      current.key === "nome_cliente"
                        ? "Ex.: Maria Silva Souza"
                        : ""
                    }
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
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-primary transition-colors hover:border-[var(--sky-blue)]/40 disabled:opacity-40"
                >
                  Voltar
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    style={GRADIENT_GOLD}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
                  >
                    Continuar <Sparkles className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === "loading"}
                    style={GRADIENT_GOLD}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                  >
                    {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
    { q: "Quanto tempo demora?", a: "Em média, sua música fica pronta em até 12 horas após o envio da sua história." },
    { q: "Posso escolher o estilo?", a: "Sim! Você pode indicar o estilo gospel preferido — adoração, congregacional, intimista, entre outros." },
    { q: "Posso pedir alterações?", a: "Claro. Enviamos uma prévia para você ouvir e ajustar antes da entrega final." },
    { q: "Como recebo a música?", a: "A entrega é 100% digital, em alta qualidade, direto no seu e-mail ou WhatsApp." },
    { q: "É realmente exclusiva?", a: "Sim. Cada canção é criada do zero, inspirada apenas na sua história. Nada de modelos prontos." },
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
                  isOpen ? "border-[var(--sky-blue)]/40 shadow-[var(--shadow-soft)]" : "border-border"
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
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
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
        <div style={GRADIENT_HERO} className="reveal relative overflow-hidden rounded-[2.5rem] px-6 py-20 text-center shadow-[var(--shadow-glow)] md:px-16 md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.13_85/0.18),transparent_60%)]" />
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--sky-blue)]/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[var(--gold)]/15 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" /> Sua canção exclusiva
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl md:text-6xl">
              Transforme sua história em uma canção inesquecível.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-white/80">
              Comece agora — basta contar o que vive no seu coração.
            </p>
            <StartMusicWidget
              buttonClassName="mt-10 inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-semibold text-primary shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
              buttonStyle={GRADIENT_GOLD}
              label="Criar Minha Canção — R$19,90"
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
            <span style={GRADIENT_GOLD} className="grid h-9 w-9 place-items-center rounded-full text-primary">
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
            Músicas gospel personalizadas, feitas com cuidado para eternizar histórias de fé, amor e gratidão.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Links</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="/privacy-policy" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
            <li><a href="/terms-of-service" className="hover:text-primary transition-colors">Termos de Uso</a></li>
            <li><a href="/support" className="hover:text-primary transition-colors">Suporte</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Siga-nos</div>
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
