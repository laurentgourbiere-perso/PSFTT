"use client";
import { useEffect, useState } from "react";
import { Maximize } from "lucide-react";

export function Clock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);
  return <p className="font-display text-[3vw] font-bold tabular-nums leading-none">{now}</p>;
}

export function FullscreenButton() {
  return (
    <button type="button" className="flex cursor-pointer items-center gap-2 text-sm hover:text-white" onClick={() => document.documentElement.requestFullscreen?.()}>
      <Maximize className="h-4 w-4" />Plein écran (ou F11)
    </button>
  );
}
