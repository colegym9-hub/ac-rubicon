import type { RawSourceType, RawSourceStatus, WikiStatus } from "@/lib/database.types";

// View-models for the Brain surface (server data layer → components).

export type CaptureSummary = {
  id: string;
  type: RawSourceType;
  title: string | null;
  status: RawSourceStatus;
  error_msg: string | null;
  source_date: string | null;
  created_at: string;
};

export type CaptureDetail = CaptureSummary & {
  content_md: string | null;
  raw_input: string;
  pages: { slug: string; title: string }[]; // wiki pages this source fed (once ingested)
};

export type WikiSummary = {
  id: string;
  slug: string;
  title: string;
  domain: string;
  overview: string | null;
  pinned: boolean;
  updated_at: string;
};

export type WikiGroup = { domain: string; pages: WikiSummary[] };

export type SourceEntry = {
  id: string;
  type: RawSourceType;
  title: string | null;
  created_at: string;
};

export type WikiDetail = {
  id: string;
  slug: string;
  title: string;
  domain: string;
  overview: string | null;
  content_md: string | null;
  related_slugs: string[];
  status: WikiStatus;
  pinned: boolean;
  version: number;
  updated_at: string;
  sources: SourceEntry[];
};

export type ChatTurn = {
  id: string;
  question: string;
  answer: string | null;
  status: "pending" | "answering" | "answered" | "error";
  citations: { slug: string; title: string }[];
  error_msg: string | null;
};
