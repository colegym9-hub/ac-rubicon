"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label
        htmlFor="password"
        className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground"
      >
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        required
        className="rounded-[var(--radius)] border bg-card/70 px-3 py-3 text-base outline-none transition-colors focus:border-primary"
        style={{ borderColor: "var(--glass-border)" }}
      />
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-[var(--radius)] bg-primary px-3 py-3 text-base font-bold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
