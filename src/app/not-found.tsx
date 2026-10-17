import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="bounce-ball mx-auto h-10 w-10 rounded-full bg-white" />
      <h1 className="font-display mt-6 text-6xl uppercase">Faute !</h1>
      <p className="mt-2 text-slate-300">La balle est sortie de la table : cette page n&apos;existe pas (ou plus).</p>
      <Link href="/" className="btn btn-primary mt-6">Retour à l&apos;accueil</Link>
    </div>
  );
}
