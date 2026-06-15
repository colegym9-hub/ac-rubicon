import Link from "next/link";
import { getSops } from "@/lib/data/sops";
import SopEditor from "@/components/brain/SopEditor";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BrainSopPage() {
  const sops = await getSops();

  return (
    <main className="mx-auto w-full max-w-md md:max-w-3xl px-5 md:px-10 pt-8 pb-24">
      <Link href="/settings" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CloudMD</span>
        <h1 className="text-2xl font-extrabold leading-tight">The brain&apos;s <span className="accent">operating rules.</span></h1>
      </header>
      <p className="mt-2 text-sm text-muted-foreground">
        How the routines run. The general doc is shared by every routine; each routine also has its own. Edit here — changes apply on the next run.
      </p>

      <div className="mt-5">
        {sops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not seeded yet — run <code className="text-primary">scripts/seed-sops.mjs</code>.</p>
        ) : (
          <SopEditor sops={sops} />
        )}
      </div>
    </main>
  );
}
