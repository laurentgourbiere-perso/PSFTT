import type { Metadata } from "next";
import "./globals.css";

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
