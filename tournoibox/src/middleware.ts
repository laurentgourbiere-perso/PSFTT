import { NextResponse, type NextRequest } from "next/server";

/**
 * TournoiBox ne répond qu'au PC sur lequel il tourne.
 * Le serveur n'écoute déjà que sur 127.0.0.1 ; on refuse en plus tout nom d'hôte inattendu
 * (protection contre les attaques par « DNS rebinding » depuis une page web ouverte sur le PC).
 */
const ALLOWED = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (!ALLOWED.has(host)) return new NextResponse("Accès refusé", { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };
