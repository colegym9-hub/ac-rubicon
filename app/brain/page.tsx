// Brain tab — shell. Capture, wiki browse, and chat land here in B3; the
// cloud schema + migration (B0/B1) come first. (Static for now; becomes
// dynamic when it fetches captures/wiki in B3.)
export default function BrainPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none flex-col gap-6 px-5 md:px-10 pt-12 pb-24 md:pb-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Second brain
        </span>
        <h1 className="text-3xl font-extrabold leading-tight">Brain</h1>
      </header>

      <div
        className="rounded-[var(--radius)] border bg-card/60 p-6 text-sm text-muted-foreground backdrop-blur-md"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <p className="font-medium text-foreground">Coming together.</p>
        <p className="mt-1">
          Capture, the wiki, and chat land here next — your sources flow in, the
          wiki files itself, and you can ask it anything.
        </p>
      </div>
    </main>
  );
}
