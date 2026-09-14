import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Heart, Loader2, Music4, Sparkles, Volume2, Wand2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { sendOrder } from "@/lib/order.functions";
import { buildKidsOrderData, type KidsFormData } from "@/lib/kids-briefing";

export const Route = createFileRoute("/kids")({
  head: () => ({
    meta: [
      { title: "Canção de Fé Kids — Crie músicas personalizadas para crianças" },
      {
        name: "description",
        content:
          "Crie uma música personalizada para brincar, aprender e interagir com seu pequeno por apenas R$10.",
      },
      { property: "og:title", content: "Canção de Fé Kids — Crie músicas personalizadas para crianças" },
      {
        property: "og:description",
        content:
          "Transforme momentos do dia em músicas que seu filho vai querer cantar de novo.",
      },
    ],
  }),
  component: KidsPage,
});

const AGE_OPTIONS = ["0–2 anos", "3–4 anos", "5–6 anos", "7–9 anos", "10+ anos"];

const OBJECTIVE_OPTIONS = [
  { label: "Falar e repetir palavras", icon: "🗣️" },
  { label: "Animais", icon: "🐾" },
  { label: "Cores", icon: "🎨" },
  { label: "Números", icon: "🔢" },
  { label: "Emoções", icon: "❤️" },
  { label: "Higiene", icon: "🧼" },
  { label: "Organização", icon: "🧸" },
  { label: "Hora de dormir", icon: "🌙" },
  { label: "Família", icon: "👨‍👩‍👧" },
  { label: "Brincadeiras", icon: "👏" },
  { label: "Diversão", icon: "🎵" },
];

const INTERACTION_OPTIONS = [
  "Bater palmas",
  "Repetir palavras",
  "Dançar",
  "Fazer sons de animais",
  "Dar tchau",
  "Apontar",
  "Contar",
  "Encontrar cores",
  "Abraçar alguém",
  "Responder perguntas",
];

const KIDS_ACTIVITY_IDEAS = [
  {
    title: "Caça às cores",
    emoji: "🎨",
    text: "Pedir para achar objetos de uma cor, repetir o nome e cantar a música cada vez que encontrar um novo item.",
  },
  {
    title: "Sons de animais",
    emoji: "🐶",
    text: "Transformar cada animal em um som divertido e repetir junto com a música da criança para rir e aprender.",
  },
  {
    title: "Hora de dormir",
    emoji: "🌙",
    text: "Criar uma canção com frases calmantes, nomes da família e um refrão suave para acalmar antes de dormir.",
  },
  {
    title: "Brincadeira de movimento",
    emoji: "🕺",
    text: "Usar gestos, passos, pulos e palmas para seguir o ritmo da letra e fazer a música virar dança em casa.",
  },
  {
    title: "História em família",
    emoji: "📖",
    text: "Incluir nomes de irmãos, avós, mamãe e papai na letra para criar uma narrativa cheia de amor e afeto.",
  },
  {
    title: "Aprender sem pressão",
    emoji: "🧠",
    text: "Escolher palavras de números, letras, emoções e hábitos diários para transformar aprendizado em música leve.",
  },
];

const STEP_ITEMS = [
  {
    number: "01",
    title: "Conte sobre seu pequeno",
    description: "Nome, idade e o que ele gosta.",
    icon: "🧸",
  },
  {
    number: "02",
    title: "Escolha o momento",
    description: "Brincar, aprender, dormir, rotina e muito mais.",
    icon: "🎈",
  },
  {
    number: "03",
    title: "Receba sua música",
    description: "Uma música criada especialmente para vocês.",
    icon: "🎵",
  },
];

const THEME_OPTIONS = [
  { label: "Hora de escovar os dentes", icon: "🪥" },
  { label: "Aprendendo os animais", icon: "🐶" },
  { label: "Aprendendo as cores", icon: "🎨" },
  { label: "Hora de dormir", icon: "🌙" },
  { label: "Aprender palavras", icon: "🗣️" },
  { label: "Aprender números", icon: "🔢" },
  { label: "Emoções", icon: "❤️" },
  { label: "Guardar brinquedos", icon: "🧸" },
  { label: "Família", icon: "👨‍👩‍👧" },
  { label: "Brincadeiras", icon: "👏" },
  { label: "Alimentação", icon: "🍎" },
  { label: "Diversão", icon: "🎵" },
];

const PERSONALIZATION_TAGS = [
  "Nome da criança",
  "Animal favorito",
  "Brinquedo favorito",
  "Cores",
  "Números",
  "Palavras",
  "Rotina",
  "Família",
];

const PARTICIPATION_TAGS = [
  "👏 Bata palmas",
  "🗣️ Repita a palavra",
  "🐶 Faça o som do animal",
  "💃 Dance",
  "👋 Dê tchau",
  "🔢 Conte junto",
];

const EMPTY_FORM: KidsFormData = {
  childName: "",
  ageGroup: AGE_OPTIONS[1],
  objectives: ["Animais"],
  interactions: ["Repetir palavras"],
  focusWord: "",
  favoriteAnimal: "",
  favoriteToy: "",
  favoriteFood: "",
  momName: "",
  dadName: "",
  siblingNames: "",
  grandparentsNames: "",
  childStory: "",
};

function KidsPage() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<KidsFormData>(EMPTY_FORM);
  const navigate = useNavigate();
  const send = useServerFn(sendOrder);

  const stepConfig = useMemo(
    () => [
      { title: "Nome da criança", key: "name" },
      { title: "Idade", key: "age" },
      { title: "Objetivo da música", key: "objectives" },
      { title: "Personalização", key: "details" },
      { title: "Interação", key: "interactions" },
      { title: "Dados para entrega", key: "contact" },
    ],
    [],
  );

  const isCurrentStepValid = () => {
    if (stepConfig[step]?.key === "name") {
      return form.childName.trim().length >= 2;
    }
    if (stepConfig[step]?.key === "objectives") {
      return form.objectives.length > 0;
    }
    if (stepConfig[step]?.key === "contact") {
      return form.childName.trim().length >= 2 && form.phone.trim().length >= 10;
    }
    return true;
  };

  const handleToggleObjective = (label: string) => {
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(label)
        ? prev.objectives.filter((item) => item !== label)
        : [...prev.objectives, label],
    }));
  };

  const handleToggleInteraction = (label: string) => {
    setForm((prev) => ({
      ...prev,
      interactions: prev.interactions.includes(label)
        ? prev.interactions.filter((item) => item !== label)
        : [...prev.interactions, label],
    }));
  };

  const handleThemeSelection = (label: string) => {
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(label) ? prev.objectives : [...prev.objectives, label],
    }));
    setStep(0);
  };

  const nextStep = () => {
    if (!isCurrentStepValid()) {
      setError("Preencha os dados antes de continuar.");
      return;
    }

    setError("");
    setStep((value) => Math.min(value + 1, stepConfig.length - 1));
  };

  const previousStep = () => {
    setError("");
    setStep((value) => Math.max(value - 1, 0));
  };

  const submitKidsOrder = async () => {
    if (!isCurrentStepValid()) {
      setError("Informe o nome da criança e o WhatsApp do responsável para continuar.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = buildKidsOrderData(form, {
        phone: form.phone ?? "",
        email: form.email ?? "",
      });

      const response = await send({ data: payload });
      navigate({ to: "/acompanhar", search: { id: response.id, token: response.token } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar sua música Kids agora.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / stepConfig.length) * 100;
  const currentStepTitle = stepConfig[step]?.title ?? "Criação";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5ef_0%,#fff9f4_35%,#f8f3ff_100%)] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-rose-200/70 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#ffb86f] via-[#ff7fb5] to-[#8a7ef7] text-white shadow-lg">
              <Music4 className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-700">Canção de Fé</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Kids</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link to="/" className="transition hover:text-slate-900">
              Início
            </Link>
            <Link to="/acompanhar" className="transition hover:text-slate-900">
              Acompanhar pedido
            </Link>
          </nav>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <section className="grid gap-8 overflow-hidden rounded-[32px] border border-[#f4d7d5] bg-white/80 p-6 shadow-[0_30px_80px_rgba(221,115,105,0.08)] md:p-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-600">
              <Sparkles className="h-3.5 w-3.5" />
              Canção de Fé Kids
            </div>

            <h1 className="max-w-xl font-display text-4xl font-semibold tracking-[-0.06em] text-slate-900 md:text-5xl">
              Transforme momentos do dia em músicas que seu filho vai querer cantar de novo.
            </h1>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 md:text-lg">
              Crie músicas personalizadas para brincar, interagir, aprender e transformar pequenos momentos da rotina em memórias especiais.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffbf69] via-[#ff8f71] to-[#f7769c] px-6 py-3.5 text-base font-semibold text-white shadow-[0_16px_35px_rgba(247,118,156,0.22)] transition hover:-translate-y-0.5"
              >
                🎵 Criar minha música por R$10
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">Leva só alguns minutinhos para personalizar.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "🪥 Hora de escovar os dentes",
                "🐶 Aprendendo os animais",
                "🎨 Aprendendo as cores",
                "🌙 Hora de dormir",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#dddbf7] bg-[linear-gradient(180deg,#fffaf8_0%,#fff1ee_100%)] p-4 md:p-5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Fluxo rápido</span>
              <span>{step + 1} de {stepConfig.length}</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f7d8d1]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffbf69] via-[#ff8f71] to-[#ef5aa8] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-6 rounded-[22px] border border-white/70 bg-white/80 p-4 shadow-inner shadow-rose-100">
              <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-500">
                <span>{step === stepConfig.length - 1 ? "Quase pronto! 🎵" : `Etapa ${step + 1} de ${stepConfig.length}`}</span>
                <span>{currentStepTitle}</span>
              </div>

              {step === 0 && (
                <KidsStepBlock title="Qual é o nome da criança?" subtitle="Vamos criar uma música especial para ela! 💕">
                  <input
                    autoFocus
                    value={form.childName}
                    onChange={(event) => setForm((prev) => ({ ...prev, childName: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
                    placeholder="Ex.: Laura"
                  />
                  {form.childName.trim() && (
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 px-4 py-3 text-sm text-slate-700">
                      Vamos criar uma música especial para a <span className="font-semibold">{form.childName}</span>! 💕
                    </div>
                  )}
                </KidsStepBlock>
              )}

              {step === 1 && (
                <KidsStepBlock title="Qual é a faixa etária da criança?" subtitle="Essa informação ajuda a ajustar o tom e a linguagem da música.">
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {AGE_OPTIONS.map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, ageGroup: age }))}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          form.ageGroup === age
                            ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                            : "border-rose-100 bg-white text-slate-700 hover:border-rose-200"
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </KidsStepBlock>
              )}

              {step === 2 && (
                <KidsStepBlock title="Qual é o objetivo da música?" subtitle="Escolha um ou mais temas que a criança está aprendendo ou vivendo.">
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {OBJECTIVE_OPTIONS.map(({ label, icon }) => {
                      const selected = form.objectives.includes(label);

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleToggleObjective(label)}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                            selected
                              ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                              : "border-rose-100 bg-white text-slate-700 hover:border-rose-200"
                          }`}
                        >
                          <span className="text-lg">{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </KidsStepBlock>
              )}

              {step === 3 && (
                <KidsStepBlock title="Personalize a música" subtitle="Esses dados ajudam a criar uma letra mais conectada com a rotina da criança.">
                  <div className="mt-4 grid gap-4">
                    <InputField label="Palavra que a criança está aprendendo" value={form.focusWord} onChange={(value) => setForm((prev) => ({ ...prev, focusWord: value }))} placeholder="Ex.: cachorro" />
                    <InputField label="Animal favorito" value={form.favoriteAnimal} onChange={(value) => setForm((prev) => ({ ...prev, favoriteAnimal: value }))} placeholder="Ex.: cachorro" />
                    <InputField label="Brinquedo favorito" value={form.favoriteToy} onChange={(value) => setForm((prev) => ({ ...prev, favoriteToy: value }))} placeholder="Ex.: ursinho" />
                    <InputField label="Comida favorita" value={form.favoriteFood} onChange={(value) => setForm((prev) => ({ ...prev, favoriteFood: value }))} placeholder="Ex.: macarrão" />
                    <InputField label="Nome da mamãe" value={form.momName} onChange={(value) => setForm((prev) => ({ ...prev, momName: value }))} placeholder="Ex.: Márcia" />
                    <InputField label="Nome do papai" value={form.dadName} onChange={(value) => setForm((prev) => ({ ...prev, dadName: value }))} placeholder="Ex.: João" />
                    <InputField label="Nomes dos irmãos" value={form.siblingNames} onChange={(value) => setForm((prev) => ({ ...prev, siblingNames: value }))} placeholder="Ex.: Sofia e Pedro" />
                    <InputField label="Nomes dos avós" value={form.grandparentsNames} onChange={(value) => setForm((prev) => ({ ...prev, grandparentsNames: value }))} placeholder="Ex.: Dona Helena e Seu Carlos" />
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Conte um pouco sobre a criança</span>
                      <textarea
                        rows={4}
                        value={form.childStory}
                        onChange={(event) => setForm((prev) => ({ ...prev, childStory: event.target.value }))}
                        className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
                        placeholder="Ex.: Ela está aprendendo os nomes dos animais e ama cachorro."
                      />
                    </label>
                  </div>
                </KidsStepBlock>
              )}

              {step === 4 && (
                <KidsStepBlock title="Como a música deve interagir com a criança?" subtitle="Escolha as ações que a música vai convidar a fazer juntos.">
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {INTERACTION_OPTIONS.map((interaction) => {
                      const selected = form.interactions.includes(interaction);

                      return (
                        <button
                          key={interaction}
                          type="button"
                          onClick={() => handleToggleInteraction(interaction)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                            selected
                              ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                              : "border-rose-100 bg-white text-slate-700 hover:border-rose-200"
                          }`}
                        >
                          {interaction}
                        </button>
                      );
                    })}
                  </div>
                </KidsStepBlock>
              )}

              {step === 5 && (
                <KidsStepBlock title="Dados para a entrega" subtitle="Precisamos apenas do WhatsApp do responsável para seguir com a criação do pedido.">
                  <div className="mt-4 grid gap-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp do responsável</span>
                      <input
                        type="tel"
                        value={form.phone ?? ""}
                        onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
                        placeholder="(11) 99999-0000"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">E-mail (opcional)</span>
                      <input
                        type="email"
                        value={form.email ?? ""}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
                        placeholder="seuemail@email.com"
                      />
                    </label>
                    <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 p-4 text-sm text-slate-700">
                      <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-rose-500" />
                        Resumo da música
                      </div>
                      <p>
                        <span className="font-semibold">{form.childName || "Sua criança"}</span> • {form.ageGroup} • {form.objectives.join(", ") || "aprendizado e diversão"}
                      </p>
                    </div>
                  </div>
                </KidsStepBlock>
              )}

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={step === 0}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Voltar
                </button>

                {step < stepConfig.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffbf69] via-[#ff8f71] to-[#f7769c] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(247,118,156,0.16)] transition hover:-translate-y-0.5"
                  >
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitKidsOrder}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffbf69] via-[#ff8f71] to-[#f7769c] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(247,118,156,0.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isSubmitting ? "Enviando..." : "Gerar minha música"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Como funciona" title="É fácil criar 🎵" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEP_ITEMS.map(({ number, title, description, icon }) => (
              <div key={number} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">{number}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-xl">{icon}</span>
                </div>
                <h3 className="font-display text-2xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Temas e situações" title="O que vocês querem transformar em música?" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {THEME_OPTIONS.map(({ label, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleThemeSelection(label)}
                className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-[0_12px_30px_rgba(15,23,42,0.03)] transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_40px_rgba(244,114,182,0.08)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-xl">{icon}</span>
                <span className="text-sm font-semibold text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[30px] border border-rose-100 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)] md:p-8">
          <div className="max-w-2xl">
            <SectionHeader eyebrow="Personalização" title="Você escolhe os detalhes. A música conta a história. ❤️" />
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Conte um pouquinho sobre seu pequeno e deixe a música com a cara dele.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {PERSONALIZATION_TAGS.map((tag) => (
              <span key={tag} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Pais + filhos" title="Mais do que ouvir. É para participar. ❤️" />
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            As músicas podem incentivar a criança a repetir palavras, bater palmas, dançar, fazer sons de animais, responder perguntas e brincar junto com quem ela ama.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PARTICIPATION_TAGS.map((tag) => (
              <div key={tag} className="rounded-[22px] border border-slate-200 bg-white p-4 text-base font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
                {tag}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)] md:p-8">
          <SectionHeader eyebrow="Pronto para criar?" title="Qual vai ser a primeira música do seu pequeno?" />
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Escolha uma ideia, conte um pouquinho sobre ele e crie uma música especial para esse momento.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffbf69] via-[#ff8f71] to-[#f7769c] px-6 py-3.5 text-base font-semibold text-white shadow-[0_16px_35px_rgba(247,118,156,0.22)] transition hover:-translate-y-0.5"
            >
              🎵 Criar minha música por R$10
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function KidsStepBlock({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold leading-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>}
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-500">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-900 md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
        placeholder={placeholder}
      />
    </label>
  );
}

