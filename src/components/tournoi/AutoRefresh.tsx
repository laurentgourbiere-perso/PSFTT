"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Rafraîchit la page à intervalle régulier (diffusion en direct sans recharger). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  const [last, setLast] = useState("");
  useEffect(() => {
    setLast(new Date().toLocaleTimeString("fr-FR"));
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setLast(new Date().toLocaleTimeString("fr-FR"));
      }
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return <span className="text-[10px] uppercase tracking-wider text-slate-500">Mis à jour {last}</span>;
}
