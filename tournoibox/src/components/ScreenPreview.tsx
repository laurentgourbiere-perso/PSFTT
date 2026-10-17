"use client";
import { useEffect, useRef, useState } from "react";

/** Aperçu réduit de l'écran de la salle : la page est rendue en 1600×900 puis mise à l'échelle du cadre. */
export function ScreenPreview({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="panel relative aspect-video overflow-hidden">
      <iframe src={src} title="Aperçu de l'écran de la salle" className="pointer-events-none absolute left-0 top-0 border-0"
        style={{ width: 1600, height: 900, transform: `scale(${scale})`, transformOrigin: "top left" }} />
    </div>
  );
}
