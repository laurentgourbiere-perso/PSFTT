export function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-club-red">{kicker}</p>
      <h2 className="font-display text-4xl uppercase sm:text-5xl">{title}</h2>
      <div className="mt-2 h-1.5 w-16 -skew-x-12 bg-club-yellow" />
    </div>
  );
}
