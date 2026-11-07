import { useEffect, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  getGuidanceError,
  initializeGuidance,
  isGuidanceMuted,
  setGuidanceMuted,
  subscribeGuidance,
} from "@/lib/audio-guidance";

export function GuidanceToggle() {
  const muted = useSyncExternalStore(subscribeGuidance, isGuidanceMuted, () => false);
  const error = useSyncExternalStore(subscribeGuidance, getGuidanceError, () => "");

  useEffect(() => { initializeGuidance(); }, []);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setGuidanceMuted(!muted)}
        aria-pressed={!muted}
        className="inline-flex items-center gap-2 rounded-full border border-current px-3 py-2 text-xs font-semibold"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? "Ativar orientações em áudio" : "Silenciar orientações em áudio"}
      </button>
      {error && !muted && <p role="status" className="max-w-xs text-xs">{error}</p>}
    </div>
  );
}
