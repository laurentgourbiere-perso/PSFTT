"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit la page à intervalle régulier : les écrans suivent les inscriptions en direct. */
export function AutoRefresh({ seconds = 3 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

/** Ouvre l'écran de diffusion dans une fenêtre séparée, à glisser sur le vidéoprojecteur. */
export function OpenScreenButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.open(href, "tournoibox-ecran", "popup,width=1280,height=720")}>
      {children}
    </button>
  );
}
