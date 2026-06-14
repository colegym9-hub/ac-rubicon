import { redirect } from "next/navigation";

// Graphs became Insights. Kept as a redirect so old links don't 404.
export default function GraphsRedirect() {
  redirect("/insights");
}
