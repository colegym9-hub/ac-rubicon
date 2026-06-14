import { redirect } from "next/navigation";

// Signed-in landing = the home dashboard at /home.
// (Middleware gates "/" → /login when signed out.)
export default function Index() {
  redirect("/home");
}
