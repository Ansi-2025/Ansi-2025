import { useEffect, useState } from "react";
import { GuidanceToggle } from "@/components/guidance-toggle";
import { initializeGuidance, playGuidance, stopGuidance } from "@/lib/audio-guidance";

export function WelcomeGuidance() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    initializeGuidance();
    void playGuidance("welcome").then((result) => {
      if (active) setBlocked(result === "blocked");
    });
    return () => {
      active = false;
      stopGuidance("cancelled", "welcome");
    };
  }, []);

  return (
    <div className="mt-5 flex flex-col items-center gap-2 text-sky-100">
      {blocked && <p role="status" className="text-center text-xs">Seu navegador bloqueou a reprodução automática da mensagem de boas-vindas.</p>}
      <GuidanceToggle />
    </div>
  );
}
