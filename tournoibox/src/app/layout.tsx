import type { Metadata } from "next";
import "./globals.css";
// Démarre la sauvegarde automatique de la base dès la première page servie
import "@/lib/backup";

export const metadata: Metadata = {
  title: { default: "TournoiBox", template: "%s · TournoiBox" },
  description: "Organisez votre tournoi sur place, sans internet.",
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
