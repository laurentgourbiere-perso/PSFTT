import { LogoMark } from "./Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="hero-bg relative min-h-[80vh] overflow-hidden px-4 py-16">
      <div className="stripes absolute inset-0" />
      <div className="relative mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="float h-20 w-20" />
          <h1 className="font-display mt-4 text-5xl uppercase">{title}</h1>
          <p className="text-slate-300">{subtitle}</p>
        </div>
        <div className="card-surface p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
