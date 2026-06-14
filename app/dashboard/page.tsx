import { redirect } from "next/navigation";

// The dashboard moved to /home (home = the dashboard). Kept as a redirect so old
// links and bookmarks don't 404.
export default function DashboardRedirect() {
  redirect("/home");
}
