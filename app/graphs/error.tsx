"use client";

export default function GraphsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">
        Something broke
      </p>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
