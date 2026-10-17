"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Shuffle, Trash2 } from "lucide-react";
import { updateProfile, uploadPhoto, removePhoto, saveAvatar, changePassword } from "@/app/actions/profile";
import type { FormState } from "@/app/actions/auth";
import { AVATAR_OPTIONS, randomAvatar, type AvatarConfig } from "@/lib/avatar";
import { BallAvatar } from "@/components/Avatar";

export function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-xl bg-club-red/20 px-4 py-2 text-sm font-semibold text-red-200">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200">{state.ok}</p>;
  return null;
}

type Profile = Record<string, string | number | null>;

export function ProfileForm({ p }: { p: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const v = (k: string) => (p[k] ?? "") as string;
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} defaultValue={v(name)} {...props} />
    </div>
  );
  const select = (name: string, label: string, options: [string, string][]) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={v(name)}>
        <option value="">—</option>
        {options.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("nickname", "Surnom de joueur", { placeholder: "Ex. « Le Mur », « Turbo »", maxLength: 40 })}
        {field("motto", "Cri de guerre / devise", { placeholder: "Ex. « Pas de balle perdue ! »", maxLength: 120 })}
        {select("hand", "Main", [["droitier", "Droitier"], ["gaucher", "Gaucher"]])}
        {select("grip", "Prise", [["europeenne", "Européenne"], ["porte-plume", "Porte-plume"]])}
        {select("play_style", "Style de jeu", [["attaquant", "Attaquant"], ["lifteur", "Lifteur"], ["contreur", "Contreur"], ["défenseur", "Défenseur"], ["polyvalent", "Polyvalent"]])}
        {field("favorite_shot", "Coup fatal", { placeholder: "Ex. Flip revers, top coup droit…", maxLength: 60 })}
        {field("blade", "Bois", { maxLength: 60 })}
        {field("rubbers", "Revêtements", { maxLength: 100 })}
        {field("idol", "Joueur préféré", { placeholder: "Ex. Félix Lebrun", maxLength: 60 })}
        {field("licence_number", "N° de licence FFTT", { inputMode: "numeric", maxLength: 10 })}
        {field("phone", "Téléphone", { type: "tel", maxLength: 20 })}
      </div>
      <div>
        <label className="label" htmlFor="bio">Ma petite histoire avec le ping</label>
        <textarea className="input min-h-28" id="bio" name="bio" defaultValue={v("bio")} maxLength={800} />
      </div>
      <p className="text-xs text-slate-400">🔒 Licence et téléphone ne sont jamais publics. Le téléphone n&apos;est visible des adhérents que si vous l&apos;autorisez ci-dessous.</p>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mon profil"}</button>
    </form>
  );
}

export function PhotoUploader({ kind, current, title, hint, emoji }: { kind: "portrait" | "victory"; current: string | null; title: string; hint: string; emoji: string }) {
  const [state, action, pending] = useActionState(uploadPhoto, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="card-surface overflow-hidden">
      <div className="relative aspect-[4/5] bg-club-navy">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${current}`} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
            <span className="text-6xl">{emoji}</span>
            <span className="text-sm">{hint}</span>
          </div>
        )}
        <span className="skew-tag absolute left-3 top-3 bg-club-yellow text-xs font-black uppercase text-club-navy"><span>{title}</span></span>
      </div>
      <div className="space-y-2 p-3">
        <form ref={formRef} action={action}>
          <input type="hidden" name="kind" value={kind} />
          <label className="btn btn-ghost w-full cursor-pointer !text-xs">
            <Camera className="h-4 w-4" /> {pending ? "Envoi…" : current ? "Changer" : "Ajouter"}
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={() => formRef.current?.requestSubmit()} />
          </label>
        </form>
        {current && (
          <form action={removePhoto}>
            <input type="hidden" name="kind" value={kind} />
            <button className="flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-club-red"><Trash2 className="h-3 w-3" /> Retirer</button>
          </form>
        )}
        <Feedback state={state} />
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  normal: "Concentré", happy: "Ravi", fire: "Déterminé", cool: "Lunettes", wink: "Clin d'œil",
  smile: "Sourire", grin: "Banane", o: "Surpris", tongue: "Taquin", serious: "Sérieux",
  none: "Rien", headband: "Bandeau", cap: "Casquette", crown: "Couronne", sweat: "En sueur",
};

export function AvatarBuilder({ initial }: { initial: AvatarConfig }) {
  const [cfg, setCfg] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const set = (patch: Partial<AvatarConfig>) => { setCfg({ ...cfg, ...patch }); setSaved(false); };

  const row = <K extends keyof AvatarConfig>(key: K, title: string, colors = false) => (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-2">
        {(AVATAR_OPTIONS[key] as readonly string[]).map((o) => (
          <button
            type="button"
            key={o}
            onClick={() => set({ [key]: o } as Partial<AvatarConfig>)}
            className={`rounded-full border-2 text-xs font-bold transition ${cfg[key] === o ? "border-club-yellow" : "border-white/15 hover:border-white/40"} ${colors ? "h-8 w-8" : "px-3 py-1"}`}
            style={colors ? { background: o } : undefined}
            aria-label={o}
          >
            {colors ? "" : LABELS[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="overflow-hidden rounded-3xl border-4 border-club-yellow shadow-xl">
          <BallAvatar config={cfg} className="h-40 w-40" />
        </div>
        <button type="button" onClick={() => set(randomAvatar())} className="btn btn-ghost !text-xs"><Shuffle className="h-4 w-4" /> Au hasard</button>
      </div>
      <div className="space-y-3">
        {row("ball", "Balle", true)}
        {row("bg", "Fond", true)}
        {row("eyes", "Regard")}
        {row("mouth", "Bouche")}
        {row("hat", "Accessoire")}
        <button
          type="button"
          disabled={saved || pending}
          onClick={() => start(async () => { await saveAvatar(cfg); setSaved(true); })}
          className="btn btn-primary"
        >
          {pending ? "…" : saved ? "Avatar enregistré ✓" : "Enregistrer l'avatar"}
        </button>
      </div>
    </div>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div><label className="label" htmlFor="current">Actuel</label><input className="input" id="current" name="current" type="password" autoComplete="current-password" required /></div>
      <div><label className="label" htmlFor="next">Nouveau</label><input className="input" id="next" name="next" type="password" autoComplete="new-password" minLength={10} required /></div>
      <button className="btn btn-ghost" disabled={pending}>Changer</button>
      <div className="sm:col-span-3"><Feedback state={state} /></div>
    </form>
  );
}
