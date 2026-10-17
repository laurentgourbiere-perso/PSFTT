import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-6xl font-bold">404</p>
      <p className="text-muted">Cette page n&apos;existe pas.</p>
      <Link href="/" className="btn btn-primary">Retour aux tournois</Link>
    </main>
  );
}
