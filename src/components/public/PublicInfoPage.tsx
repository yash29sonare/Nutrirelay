import Link from "next/link";

interface PublicInfoPageProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PublicInfoPage({ eyebrow, title, description, children }: PublicInfoPageProps) {
  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b border-white/12 pb-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#aeb4bb]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9bec5]">{description}</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-white/80 hover:text-white">
            NutriRelay
          </Link>
        </div>

        <div className="space-y-6 py-8 text-sm leading-7 text-[#d6d9dd]">
          {children}
        </div>
      </div>
    </main>
  );
}
