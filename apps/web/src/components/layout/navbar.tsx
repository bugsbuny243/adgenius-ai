import Link from "next/link";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          Koschei AI
        </Link>
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <Link href="/" className="hover:text-cyan-300">
            Ana Sayfa
          </Link>
          <Link href="/workspace" className="rounded-full border border-cyan-300/40 px-4 py-2 hover:bg-cyan-400/10">
            Çalışma Alanı
          </Link>
        </div>
      </nav>
    </header>
  );
};
