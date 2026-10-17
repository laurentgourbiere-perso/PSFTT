"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, register, type FormState } from "@/app/actions/auth";

function Error({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return <p className="rounded-xl bg-club-red/20 px-4 py-2 text-sm font-semibold text-red-200">{state.error}</p>;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="email">E-mail</label><input className="input" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div><label className="label" htmlFor="password">Mot de passe</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <Error state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Connexion…" : "Entrer sur le court"}</button>
      <p className="text-center text-sm text-slate-400">Pas encore de compte ? <Link href="/inscription" className="font-bold text-club-yellow">Inscrivez-vous</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="first_name">Prénom</label><input className="input" id="first_name" name="first_name" autoComplete="given-name" required /></div>
        <div><label className="label" htmlFor="last_name">Nom</label><input className="input" id="last_name" name="last_name" autoComplete="family-name" required /></div>
      </div>
      <div><label className="label" htmlFor="email">E-mail</label><input className="input" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="password">Mot de passe</label><input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></div>
        <div><label className="label" htmlFor="confirm">Confirmation</label><input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
      </div>
      <p className="text-xs text-slate-400">10 caractères minimum, avec au moins une lettre et un chiffre.</p>
      <label className="flex items-start gap-3 rounded-xl bg-white/5 p-3 text-sm">
        <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-yellow-400" required />
        <span>
          J&apos;accepte que le club traite mes données pour gérer mon compte, conformément à la{" "}
          <Link href="/confidentialite" target="_blank" className="font-bold text-club-yellow underline">politique de confidentialité</Link>.
          Ma fiche reste privée tant que je n&apos;autorise pas sa publication.
        </span>
      </label>
      <Error state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
      <p className="text-center text-sm text-slate-400">Déjà inscrit ? <Link href="/connexion" className="font-bold text-club-yellow">Connexion</Link></p>
    </form>
  );
}
