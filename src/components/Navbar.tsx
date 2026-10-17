import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/roles";
import { db } from "@/lib/db";
import { parseAvatar } from "@/lib/avatar";
import { Logo } from "./Logo";
import { BallAvatar } from "./Avatar";
import { logout } from "@/app/actions/auth";
import { MobileMenu } from "./MobileMenu";

export async function Navbar() {
  const user = await getCurrentUser();
  const avatar = user
    ? parseAvatar((db.prepare("SELECT avatar FROM profiles WHERE user_id = ?").get(user.id) as { avatar: string | null } | undefined)?.avatar)
    : null;

  const links = [
    { href: "/club", label: "Le club" },
    { href: "/equipes", label: "Équipes" },
    { href: "/rencontres", label: "Rencontres" },
    { href: "/joueurs", label: "Joueurs" },
  ];
  if (user) links.push({ href: "/espace", label: "Mon espace" });
  if (can.seeMeetings(user?.role)) links.push({ href: "/comite/reunions", label: "Réunions" });
  if (can.seeBudget(user?.role)) links.push({ href: "/comite/budget", label: "Budget" });
  if (can.manageUsers(user?.role)) links.push({ href: "/admin/utilisateurs", label: "Admin" });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-club-navy/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Accueil PSFTT">
          <Logo compact />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-200 hover:bg-white/10 hover:text-club-yellow">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profil" className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 hover:bg-white/20">
                <span className="overflow-hidden rounded-full">
                  <BallAvatar config={avatar ?? undefined} className="h-8 w-8" />
                </span>
                <span className="hidden text-sm font-semibold sm:block">
                  {user.first_name}
                  <span className="ml-1 text-xs text-club-yellow">· {ROLE_LABELS[user.role]}</span>
                </span>
              </Link>
              <form action={logout}>
                <button className="rounded-full px-3 py-2 text-xs font-bold uppercase text-slate-300 hover:text-club-red" title="Se déconnecter">
                  Sortir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion" className="btn btn-ghost !py-2 !text-xs">Connexion</Link>
              <Link href="/inscription" className="btn btn-primary hidden !py-2 !text-xs sm:inline-flex">Rejoindre</Link>
            </>
          )}
          <MobileMenu links={links} />
        </div>
      </div>
    </header>
  );
}
