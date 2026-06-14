import { redirect } from "next/navigation";

// The dashboard is the landing once you're signed in; the old card menu is
// replaced by the bottom tab bar. (Middleware gates "/" → /login when signed out.)
export default function Home() {
  redirect("/dashboard");
}
