import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** True when the request carries a valid session cookie. Brain API routes gate
 *  on this (returning 401) so a fetch gets a clean status, not a login redirect. */
export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
