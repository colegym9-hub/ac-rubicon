import { notFound } from "next/navigation";
import { getWikiPage } from "@/lib/data/brain";
import WikiPageView from "@/components/brain/wiki/WikiPageView";

export const dynamic = "force-dynamic";

export default async function WikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getWikiPage(slug);
  if (!page) notFound();
  return <WikiPageView page={page} />;
}
