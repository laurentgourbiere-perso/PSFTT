"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(!open)} className="rounded-full p-2 hover:bg-white/10" aria-label="Menu">
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-white/10 bg-club-navy p-4 shadow-2xl">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-lg font-bold uppercase hover:bg-white/10">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
