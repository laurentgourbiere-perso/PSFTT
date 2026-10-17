import Link from "next/link";

export default function AccesRefuse() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-7xl">🙅‍♂️🏓</p>
      <h1 className="font-display mt-4 text-5xl uppercase">Balle let !</h1>
      <p className="mt-2 text-slate-300">Cette zone est réservée à un autre niveau d&apos;accès. Si vous pensez que c&apos;est une erreur, contactez le comité.</p>
      <Link href="/espace" className="btn btn-primary mt-6">Retour à mon espace</Link>
    </div>
  );
}
