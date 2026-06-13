"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
  getAppPassword,
  safeInternalPath,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeInternalPath(formData.get("next"));

  const appPassword = getAppPassword();
  if (!appPassword) {
    return {
      error:
        "No password is configured yet. Set APP_PASSWORD in .env.local (see specs/TODO.md).",
    };
  }
  if (!verifyPassword(password, appPassword)) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/login");
}
