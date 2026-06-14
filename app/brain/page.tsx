import { getCaptures, getWikiPages } from "@/lib/data/brain";
import BrainPage from "@/components/brain/BrainPage";

export const dynamic = "force-dynamic";

export default async function Brain() {
  const [captures, wikiGroups] = await Promise.all([getCaptures(), getWikiPages()]);
  return <BrainPage initialCaptures={captures} wikiGroups={wikiGroups} />;
}
