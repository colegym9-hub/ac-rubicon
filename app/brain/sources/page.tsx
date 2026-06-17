import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSourcesByPage } from "@/lib/data/brain";
import SourcesByPageView from "@/components/brain/SourcesByPageView";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const data = await getSourcesByPage();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-12 pb-24">
      <header className="flex flex-col gap-1">
        <Link
          href="/brain"
          className="mb-1 flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Brain
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Second brain
        </span>
        <h1 className="text-3xl font-extrabold leading-tight">Sources</h1>
      </header>

      <SourcesByPageView data={data} />
    </main>
  );
}
