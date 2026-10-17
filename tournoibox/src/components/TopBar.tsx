import Link from "next/link";
import { DatabaseBackup, LogOut, Power } from "lucide-react";
import { logout } from "@/app/actions";
import { shutdownAction } from "@/app/actions-system";
import { Logo } from "./Logo";

export function TopBar({ children }: { children?: React.ReactNode }) {
  // « Quitter » n'existe que dans l'application installée (en développement, le serveur est géré à la main)
  const packaged = process.env.TOURNOIBOX_PACKAGED === "1";
  return (
    <header className="sticky top-0 z-30 print:hidden border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" aria-label="Accueil TournoiBox"><Logo size={30} /></Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{children}</div>
        <Link href="/sauvegardes" className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-white" title="Sauvegardes">
          <DatabaseBackup className="h-4 w-4" /><span className="hidden xl:inline">Sauvegardes</span>
        </Link>
        <form action={logout}>
          <button className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-hot" title="Verrouiller TournoiBox">
            <LogOut className="h-4 w-4" /><span className="hidden xl:inline">Verrouiller</span>
          </button>
        </form>
        {packaged && (
          <form action={shutdownAction}>
            <button className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-hot" title="Sauvegarder et arrêter TournoiBox">
              <Power className="h-4 w-4" /><span className="hidden xl:inline">Quitter</span>
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
