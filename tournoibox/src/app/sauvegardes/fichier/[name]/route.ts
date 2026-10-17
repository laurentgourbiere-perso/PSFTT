import fs from "node:fs";
import { NextResponse } from "next/server";
import { isOrganizer } from "@/lib/auth";
import { backupNow, backupPath } from "@/lib/backup";

/** Téléchargement d'une sauvegarde (pour la copier sur une clé USB). « actuelle » sauvegarde la base à l'instant. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await isOrganizer())) return new NextResponse("Accès refusé", { status: 403 });
  let { name } = await params;
  if (name === "actuelle") name = await backupNow("manuelle");
  const file = backupPath(name);
  if (!file) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(fs.readFileSync(file), {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
