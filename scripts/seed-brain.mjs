// scripts/seed-brain.mjs
// One-time migration: the local markdown brain -> Supabase (wiki_pages, raw_sources, brain_log).
//
// Usage:
//   node scripts/seed-brain.mjs                 # DRY RUN — parse + report counts, no writes
//   node scripts/seed-brain.mjs --commit        # actually insert
//   node scripts/seed-brain.mjs --commit --brain "C:\\path\\to\\Cole-2nd-Brain"
//
// Idempotent: wiki_pages upsert-by-slug (skips existing); raw_sources skips rows whose
// raw_input already exists. Re-running is safe.
//
// Reads Supabase creds from ../.env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMMIT = process.argv.includes("--commit");
const brainArg = process.argv.indexOf("--brain");
const BRAIN_DIR =
  brainArg > -1 ? process.argv[brainArg + 1]
  : "C:\\Users\\alter\\Everything\\Cole's Second Brain\\Cole-2nd-Brain";
const WIKI_DIR = join(BRAIN_DIR, "wiki");
const RAW_DIR = join(BRAIN_DIR, "raw-sources");
const LOG_FILE = join(WIKI_DIR, "log.md.md");

const MAX_RAW_BYTES = 2_500_000; // skip very large dumps (12MB conversations.json) but keep long .md sources
const SKIP_EXT = new Set([".json"]); // structured dumps; the .md splits already cover them
const TEXT_EXT = new Set([".md", ".txt"]);

// slug -> domain (from Cole-2nd-Brain/CLAUDE.md + wiki/index.md.md)
const DOMAIN = {
  "ac-media": "A.C Media", "ac-media-site-brand": "A.C Media",
  "ac-media-customer-model": "A.C Media", "ac-media-financials": "A.C Media",
  "ac-media-operations": "A.C Media", "ac-media-platform-build": "A.C Media",
  "photography-business": "A.C Media", "photography-lead-generation": "A.C Media",
  "smg-sports-management": "BU", "som-content-strategy": "BU", "som-outreach-networking": "BU",
  "content-creation-youtube": "Content", "hook-scripting": "Content",
  "hist-238-essays": "Coursework", "macroeconomics-coursework": "Coursework",
  "writing-111-behavior-research": "Coursework",
  "second-brain-operating-system": "Personal Ops", "pkm-methodologies": "Personal Ops",
  "summer-2026-command-center": "Personal Ops", "calendar-scheduling": "Personal Ops",
  "daily-briefings-routines": "Personal Ops", "personal-ops": "Personal Ops",
  "claude-tooling-systems": "Personal Ops",
  "career-direction": "Mindset", "entrepreneurship-mindset": "Mindset",
  "personal-reflection": "Mindset", "college-life": "Mindset",
};
const PINNED = new Set(["summer-2026-command-center", "ac-media", "second-brain-operating-system"]);

function loadEnv() {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function parseWiki() {
  const files = readdirSync(WIKI_DIR).filter(
    (f) => f.endsWith(".md") && f !== "index.md.md" && f !== "log.md.md",
  );
  const pages = [];
  const unmapped = [];
  for (const f of files) {
    const content = readFileSync(join(WIKI_DIR, f), "utf8");
    const slug = f.replace(/\.md$/, "");
    const h1 = /^#\s+(.+)$/m.exec(content);
    const title = h1 ? h1[1].trim() : slug;
    let overview = null;
    if (h1) {
      const after = content.slice(content.indexOf(h1[0]) + h1[0].length);
      const beforeH2 = after.split(/\n##\s/)[0];
      const para = beforeH2.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)[0];
      overview = para ? para.replace(/\s+/g, " ").slice(0, 600) : null;
    }
    const related = [...new Set([...content.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1]))]
      .filter((s) => s !== slug);
    if (!DOMAIN[slug]) unmapped.push(slug);
    pages.push({
      slug, title, domain: DOMAIN[slug] || "Personal Ops", overview,
      content_md: content, related_slugs: related, pinned: PINNED.has(slug),
    });
  }
  return { pages, unmapped };
}

function parseRaw() {
  const rows = [];
  const skipped = [];
  for (const full of walk(RAW_DIR)) {
    const rel = relative(RAW_DIR, full).replace(/\\/g, "/");
    const ext = extname(full).toLowerCase();
    const name = basename(full, ext);
    const size = statSync(full).size;
    if (SKIP_EXT.has(ext) || size > MAX_RAW_BYTES) {
      skipped.push(`${rel} (${(size / 1024).toFixed(0)}KB)`);
      continue;
    }
    const isText = TEXT_EXT.has(ext);
    let content_md = null;
    const tags = ["migrated"];
    if (isText) {
      try { content_md = readFileSync(full, "utf8"); } catch { content_md = null; }
    } else {
      tags.push("binary"); // pdf/pptx/etc. — provenance row, no extractable text
    }
    const dateM = /(\d{4})[-_](\d{2})[-_](\d{2})/.exec(name);
    rows.push({
      type: "note",
      title: name.slice(0, 200),
      raw_input: `raw-sources/${rel}`,
      content_md,
      status: "ingested",
      source_date: dateM ? `${dateM[1]}-${dateM[2]}-${dateM[3]}` : null,
      tags,
    });
  }
  return { rows, skipped };
}

function parseLog() {
  let txt;
  try { txt = readFileSync(LOG_FILE, "utf8"); } catch { return []; }
  const OPS = new Set(["ingest", "query", "lint", "create", "update", "archive", "error"]);
  const chunks = txt.split(/\n(?=## \[)/).filter((c) => c.trim().startsWith("## ["));
  const out = [];
  for (const c of chunks) {
    const head = /^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+(\w+)\s*\|\s*(.+)$/m.exec(c);
    if (!head) continue;
    const [, date, action, title] = head;
    const body = c.slice(c.indexOf(head[0]) + head[0].length).trim();
    out.push({
      operation: OPS.has(action.toLowerCase()) ? action.toLowerCase() : "update",
      target_type: "brain",
      summary: `${title.trim()}${body ? " — " + body.replace(/\s+/g, " ").slice(0, 300) : ""}`,
      meta: { migrated: true, log_date: date, title: title.trim() },
      created_at: `${date}T12:00:00Z`,
    });
  }
  return out;
}

async function chunkedInsert(supabase, table, rows, size = 200) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table} insert failed at row ${i}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`  ${table}: ${inserted}/${rows.length}\r`);
  }
  process.stdout.write("\n");
  return inserted;
}

async function main() {
  console.log(`Brain dir: ${BRAIN_DIR}`);
  console.log(`Mode: ${COMMIT ? "COMMIT (writing)" : "DRY RUN (no writes)"}\n`);

  const { pages, unmapped } = parseWiki();
  const { rows: raw, skipped } = parseRaw();
  const log = parseLog();

  const byDomain = {};
  for (const p of pages) byDomain[p.domain] = (byDomain[p.domain] || 0) + 1;
  const shortOverview = pages.filter((p) => !p.overview || p.overview.length < 40).map((p) => p.slug);
  const textRaw = raw.filter((r) => r.content_md != null).length;

  console.log(`WIKI PAGES: ${pages.length}`);
  for (const [d, n] of Object.entries(byDomain)) console.log(`  ${d}: ${n}`);
  if (unmapped.length) console.log(`  ⚠ unmapped→Personal Ops: ${unmapped.join(", ")}`);
  if (shortOverview.length) console.log(`  ⚠ short/empty overview: ${shortOverview.join(", ")}`);
  console.log(`\nRAW SOURCES: ${raw.length} (${textRaw} with text, ${raw.length - textRaw} binary)`);
  console.log(`  skipped (json / >1MB): ${skipped.length}`);
  for (const s of skipped) console.log(`    - ${s}`);
  console.log(`\nBRAIN LOG ENTRIES: ${log.length}`);

  if (!COMMIT) {
    console.log("\nDry run complete. Re-run with --commit to write.");
    return;
  }

  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\nWriting wiki_pages (upsert by slug)...");
  const { error: wErr } = await supabase
    .from("wiki_pages")
    .upsert(pages, { onConflict: "slug", ignoreDuplicates: true });
  if (wErr) throw new Error(`wiki_pages upsert failed: ${wErr.message}`);
  console.log(`  wiki_pages: ${pages.length} upserted`);

  console.log("Writing raw_sources (skipping existing raw_input)...");
  const { data: existing, error: exErr } = await supabase
    .from("raw_sources").select("raw_input");
  if (exErr) throw new Error(`raw_sources read failed: ${exErr.message}`);
  const have = new Set((existing ?? []).map((r) => r.raw_input));
  const newRaw = raw.filter((r) => !have.has(r.raw_input));
  // Large content_md makes a batch INSERT exceed the statement timeout — insert big rows alone.
  const big = newRaw.filter((r) => (r.content_md?.length ?? 0) > 350_000);
  const small = newRaw.filter((r) => (r.content_md?.length ?? 0) <= 350_000);
  await chunkedInsert(supabase, "raw_sources", small, 50);
  if (big.length) await chunkedInsert(supabase, "raw_sources", big, 1);
  console.log(`  raw_sources: ${newRaw.length} inserted (${raw.length - newRaw.length} already present)`);

  console.log("Writing brain_log...");
  const { count: logCount } = await supabase
    .from("brain_log").select("*", { count: "exact", head: true });
  if ((logCount ?? 0) === 0 && log.length) {
    await chunkedInsert(supabase, "brain_log", log);
    console.log(`  brain_log: ${log.length} inserted`);
  } else {
    console.log(`  brain_log: skipped (already has ${logCount} rows)`);
  }

  console.log("\n✅ Seed complete.");
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
