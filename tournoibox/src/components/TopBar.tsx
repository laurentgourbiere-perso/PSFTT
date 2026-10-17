import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { Logo } from "./Logo";

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" aria-label="Accueil TournoiBox"><Logo size={30} /></Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{children}</div>
        <form action={logout}>
          <button className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-hot" title="Verrouiller TournoiBox">
            <LogOut className="h-4 w-4" />Verrouiller
          </button>
        </form>
      </div>
    </header>
  );
}
