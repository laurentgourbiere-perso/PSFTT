"use client";
import { useEffect, useRef, useState } from "react";

export type SlideItem = { id: string; node: React.ReactNode };

/**
 * Fait défiler les diapositives. Les données sont rafraîchies toutes les 3 s par la page :
 * on reste sur la même diapositive (repérée par son identifiant) même si la liste change.
 */
export function Carousel({ slides, seconds }: { slides: SlideItem[]; seconds: number }) {
  const [currentId, setCurrentId] = useState(slides[0]?.id);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  useEffect(() => {
    const t = setInterval(() => {
      const list = slidesRef.current;
      if (list.length < 2) return;
      setCurrentId((id) => {
        const i = list.findIndex((s) => s.id === id);
        return list[(i + 1) % list.length].id;
      });
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const index = Math.max(0, slides.findIndex((s) => s.id === currentId));
  const slide = slides[index];
  if (!slide) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div key={slide.id} className="min-h-0 flex-1 animate-[slidein_.6s_ease-out]">{slide.node}</div>
      {slides.length > 1 && (
        <div className="mt-[1vw] flex items-center gap-[0.5vw]">
          {slides.map((s, i) => (
            <span key={s.id} className="h-[0.35vw] flex-1 overflow-hidden rounded-full bg-white/10">
              {i === index && <span key={slide.id} className="block h-full bg-brand" style={{ animation: `progress ${seconds}s linear forwards` }} />}
              {i < index && <span className="block h-full w-full bg-brand/50" />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
