import { useRef, useState } from "react";
import { Headphones, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const examples = [
  { name: "Exemplo 1", url: import.meta.env.VITE_EXAMPLE_MUSIC_1 },
  { name: "Exemplo 2", url: import.meta.env.VITE_EXAMPLE_MUSIC_2 },
  { name: "Exemplo 3", url: import.meta.env.VITE_EXAMPLE_MUSIC_3 },
];

export function MusicExamples() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playAttempt = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");

  const playExample = (index: number) => {
    const attempt = ++playAttempt.current;
    const audio = audioRef.current;
    const url = examples[index].url;
    setError("");

    if (!audio || !url) {
      setError("Este exemplo não está disponível no momento. Tente novamente mais tarde.");
      return;
    }

    audio.pause();
    audio.src = url;
    setSelected(index);
    void audio.play().catch(() => {
      if (attempt === playAttempt.current) {
        setError("Não foi possível reproduzir o áudio. Tente novamente.");
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      playAttempt.current++;
      audioRef.current?.pause();
      setSelected(null);
      setError("");
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition hover:border-[var(--gold)] hover:bg-white/15"
        >
          <Headphones className="h-4 w-4" /> Ver Exemplos
        </button>
      </DialogTrigger>
      <DialogContent className="border-white/15 bg-[#0b2132] text-white sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="pr-10 font-display text-2xl">Ouça nossas músicas</DialogTitle>
          <DialogDescription className="text-sky-100/80">
            Escolha um exemplo para ouvir uma música personalizada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {examples.map((example, index) => (
            <button
              key={example.name}
              type="button"
              onClick={() => playExample(index)}
              aria-pressed={selected === index}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left font-semibold transition ${
                selected === index
                  ? "border-[var(--gold)] bg-white/15"
                  : "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10"
              }`}
            >
              <Play className="h-4 w-4 text-[var(--gold)]" aria-hidden="true" />
              {example.name}
            </button>
          ))}
        </div>
        <audio
          ref={audioRef}
          controls
          preload="none"
          hidden={selected === null}
          aria-label={selected === null ? "Reprodutor de exemplos" : `Reprodutor de ${examples[selected].name}`}
          onError={() => setError("Não foi possível carregar o áudio. Tente novamente mais tarde.")}
          className="w-full"
        />
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
