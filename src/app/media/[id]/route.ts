import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { readImage, FILE_ID } from "@/lib/uploads";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

// Les photos ne sont pas dans /public : chaque accès vérifie le consentement du joueur
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!FILE_ID.test(id)) return new Response("Not found", { status: 404 });
  const owner = db
    .prepare("SELECT user_id, public_profile, public_photos FROM profiles WHERE photo_portrait = ? OR photo_victory = ?")
    .get(id, id) as { user_id: number; public_profile: number; public_photos: number } | undefined;
  if (!owner) return new Response("Not found", { status: 404 });

  const viewer = await getCurrentUser();
  const allowed = viewer?.id === owner.user_id || can.seeMembers(viewer?.role) || (owner.public_profile && owner.public_photos);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const buf = readImage(id);
  if (!buf) return new Response("Not found", { status: 404 });
  const ext = id.split(".").pop() as keyof typeof TYPES;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
