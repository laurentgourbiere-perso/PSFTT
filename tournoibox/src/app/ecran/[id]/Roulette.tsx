"use client";
import { useEffect, useState } from "react";

const SPIN_MS = 6000;

/**
 * Tirage de tombola en direct : les noms défilent de plus en plus lentement, puis le gagnant apparaît.
 * Le suspense ne se joue qu'une fois, dans les secondes qui suivent le tirage.
 */
export function Roulette({ names, winner, club, prize, drawnAt }: { names: string[]; winner: string; club: string | null; prize: string; drawnAt: string }) {
  const end = Date.parse(drawnAt) + SPIN_MS;
  const [shown, setShown] = useState<string | null>(Date.now() >= end ? winner : names[0] ?? winner);
  const done = shown === winner && Date.now() >= end - 50;

  useEffect(() => {
    if (Date.now() >= end) { setShown(winner); return; }
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) { setShown(winner); return; }
      i = (i + 1) % Math.max(1, names.length);
      setShown(names[i] ?? winner);
      // Ralentit à l'approche de la fin : 60 ms au départ, ~450 ms à la fin
      timer = setTimeout(tick, 60 + (1 - left / SPIN_MS) * 390);
    };
    tick();
    return () => clearTimeout(timer);
  }, [end, names, winner]);

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[1.6vw] font-bold uppercase tracking-[0.3em] text-brand-2">🎟️ Tombola</p>
      <p className="mt-[1vw] text-[2.4vw] text-muted">{prize}</p>
      <div className={`mt-[2vw] rounded-[1.5vw] px-[4vw] py-[2vw] transition-all duration-500 ${done ? "scale-110 bg-lime text-ink" : "bg-panel"}`}>
        <p className="font-display text-[6vw] font-bold leading-none">{shown}</p>
        {done && club && <p className="mt-[0.8vw] text-[1.6vw] font-semibold opacity-70">{club}</p>}
      </div>
      <p className={`mt-[2vw] font-display text-[3vw] font-bold transition-opacity duration-700 ${done ? "opacity-100" : "opacity-0"}`}>🎉 Félicitations ! 🎉</p>
    </div>
  );
}
