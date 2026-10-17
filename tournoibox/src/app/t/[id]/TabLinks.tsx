"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["inscriptions", "Inscriptions"],
  ["competition", "Compétition"],
  ["salle", "Salle"],
  ["ecran", "Écran"],
  ["tableaux", "Tableaux"],
  ["reglages", "Réglages"],
] as const;

export function TabLinks({ id }: { id: number }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {TABS.map(([slug, label]) => {
        const href = `/t/${id}/${slug}`;
        const active = path.startsWith(href);
        return (
          <Link key={slug} href={href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? "bg-brand text-white" : "text-muted hover:bg-white/5 hover:text-white"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
