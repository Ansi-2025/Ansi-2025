const urls = {
  welcome: import.meta.env.VITE_GUIDE_WELCOME,
  start: import.meta.env.VITE_GUIDE_START,
  create: import.meta.env.VITE_GUIDE_CREATE,
  occasion: import.meta.env.VITE_GUIDE_OCCASION,
  style: import.meta.env.VITE_GUIDE_STYLE,
  story: import.meta.env.VITE_GUIDE_STORY,
  preview: import.meta.env.VITE_GUIDE_PREVIEW,
  secondVersion: import.meta.env.VITE_GUIDE_SECOND_VERSION,
  back: import.meta.env.VITE_GUIDE_BACK,
};

export type GuidanceName = keyof typeof urls;
type Result = "ended" | "cancelled" | "muted" | "failed" | "blocked";
const storageKey = "cancao-de-fe:mute-guidance";
let muted = false;
let current: { name: GuidanceName; audio: HTMLAudioElement; finish: (result: Result) => void } | null = null;
const listeners = new Set<() => void>();
let errorMessage = "";

export function initializeGuidance() {
  try {
    muted = localStorage.getItem(storageKey) === "true";
  } catch (error) {
    console.warn("Não foi possível ler a preferência de áudio.", error);
  }
  listeners.forEach((listener) => listener());
}

export function subscribeGuidance(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isGuidanceMuted() { return muted; }
export function getGuidanceError() { return errorMessage; }

export function stopGuidance(result: Result = "cancelled", name?: GuidanceName) {
  if (current && (!name || current.name === name)) current.finish(result);
}

export function setGuidanceMuted(value: boolean) {
  muted = value;
  if (value) stopGuidance("muted");
  try {
    localStorage.setItem(storageKey, String(value));
  } catch (error) {
    console.warn("Não foi possível salvar a preferência de áudio.", error);
  }
  listeners.forEach((listener) => listener());
}

export function playGuidance(name: GuidanceName): Promise<Result> {
  stopGuidance();
  if (muted) return Promise.resolve("muted");
  const url = urls[name];
  if (!url) {
    errorMessage = "As orientações em áudio não estão configuradas. Você pode continuar normalmente.";
    console.warn(`[audio-guidance] Áudio não configurado: ${name}`);
    listeners.forEach((listener) => listener());
    return Promise.resolve("failed");
  }
  errorMessage = "";
  listeners.forEach((listener) => listener());

  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.volume = 0.6;
    audio.playbackRate = 1.2;
    let finished = false;
    const finish = (result: Result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      if (current?.audio === audio) current = null;
      resolve(result);
    };
    const onEnded = () => finish("ended");
    const onError = () => {
      errorMessage = "Não foi possível reproduzir a orientação em áudio. Você pode continuar normalmente.";
      console.warn(`[audio-guidance] Falha ao reproduzir: ${name}`);
      listeners.forEach((listener) => listener());
      finish("failed");
    };
    const timeout = setTimeout(onError, 30000);
    current = { name, audio, finish };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    void audio.play().catch((error: unknown) => {
      if (finished) return;
      if (name === "welcome" && error instanceof DOMException && error.name === "NotAllowedError") {
        finish("blocked");
      } else {
        onError();
      }
    });
  });
}
