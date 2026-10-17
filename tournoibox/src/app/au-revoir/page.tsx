import { Logo } from "@/components/Logo";

export const metadata = { title: "À bientôt" };

export default function AuRevoirPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo size={56} />
      <p className="font-display text-4xl font-bold">À bientôt !</p>
      <p className="text-muted">TournoiBox est arrêté et vos données sont sauvegardées. Vous pouvez fermer cette fenêtre. Pour le relancer, utilisez l&apos;icône TournoiBox du bureau.</p>
    </main>
  );
}
