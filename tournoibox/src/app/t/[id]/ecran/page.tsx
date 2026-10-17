import { Monitor } from "lucide-react";
import { getTournament } from "@/lib/tournament";
import { SCREEN_MODES } from "@/lib/screen-modes";
import { setScreenMode } from "@/app/actions-screen";
import { OpenScreenButton } from "@/components/ui";
import { ScreenForm } from "@/components/ScreenForm";
import { ScreenPreview } from "@/components/ScreenPreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Écran" };

export default async function EcranControlPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTournament(Number((await params).id))!;
  const label = (key: string, base: string) => (key === "tables" ? `${t.court_label}s` : base);
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="space-y-6">
          <div>
            <p className="font-display text-2xl font-bold">Ce que montre l&apos;écran</p>
            <p className="mb-3 text-sm text-muted">Ouvrez l&apos;écran sur le vidéoprojecteur une fois pour toutes, puis pilotez-le d&apos;ici : il change tout seul en 3 secondes.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(SCREEN_MODES).map(([key, m]) => (
                <form key={key} action={setScreenMode}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="mode" value={key} />
                  <button className={`panel flex h-full w-full items-start gap-3 p-3 text-left transition ${t.screen_mode === key ? "!border-brand bg-brand/15" : "hover:!border-brand-2"}`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <span>
                      <span className="block font-semibold">{label(key, m.label)}{t.screen_mode === key && <span className="chip ml-2 bg-brand text-white">à l&apos;écran</span>}</span>
                      <span className="block text-xs text-muted">{m.help}</span>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>
          <div className="panel p-4">
            <ScreenForm id={t.id} mode={t.screen_mode} message={t.screen_message} seconds={t.slide_seconds} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-2xl font-bold">Aperçu</p>
            <OpenScreenButton href={`/ecran/${t.id}`}><Monitor className="h-4 w-4" />Ouvrir sur le vidéoprojecteur</OpenScreenButton>
          </div>
          <ScreenPreview src={`/ecran/${t.id}`} />
          <p className="mt-2 text-xs text-muted">Astuce : sur le vidéoprojecteur, appuyez sur F11 pour le plein écran. Le pointeur de la souris disparaît sur l&apos;écran.</p>
        </section>
      </div>
    </main>
  );
}
