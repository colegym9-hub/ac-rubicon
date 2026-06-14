import type { CaptureSummary } from "@/lib/brain/types";
import type { RawSourceType } from "@/lib/database.types";
import CaptureStatusBadge from "./CaptureStatusBadge";
import { FileText, Video, Camera, Link2, Mic, Image as ImageIcon, MessageSquare, Music2 } from "lucide-react";

const ICON: Record<RawSourceType, typeof FileText> = {
  note: FileText,
  youtube: Video,
  instagram: Camera,
  tiktok: Music2,
  article: Link2,
  voice: Mic,
  image: ImageIcon,
  chat_answer: MessageSquare,
};

export default function CaptureRow({ capture }: { capture: CaptureSummary }) {
  const Icon = ICON[capture.type] ?? FileText;
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm">{capture.title || "Untitled"}</span>
      <CaptureStatusBadge status={capture.status} />
    </div>
  );
}
