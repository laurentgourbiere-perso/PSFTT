import { redirect } from "next/navigation";

export default async function TournamentIndex({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/t/${(await params).id}/inscriptions`);
}
