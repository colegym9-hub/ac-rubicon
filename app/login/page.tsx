import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, safeInternalPath, verifySessionToken } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in → skip the gate.
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    redirect("/");
  }

  const safeNext = safeInternalPath(next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-12">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          AC Rubicon
        </span>
        <h1 className="text-3xl font-extrabold leading-tight">
          <span className="accent">Locked.</span> Enter to continue.
        </h1>
      </header>
      <LoginForm next={safeNext} />
    </main>
  );
}
