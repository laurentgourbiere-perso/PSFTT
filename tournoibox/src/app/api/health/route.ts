import { NextResponse } from "next/server";

/** Utilisé par le lanceur pour savoir si TournoiBox tourne déjà sur ce PC. */
export function GET() {
  return NextResponse.json({ app: "tournoibox" });
}
