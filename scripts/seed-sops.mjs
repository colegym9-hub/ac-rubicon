// scripts/seed-sops.mjs — seed the CloudMD SOPs (brain_sops) into Supabase.
//   node scripts/seed-sops.mjs            # upsert by key (won't overwrite edited content unless --force)
//   node scripts/seed-sops.mjs --force    # overwrite content too
// Reads creds from ../.env.local. Cole edits these in-app afterward (/settings/brain).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const FORCE = process.argv.includes("--force");

function loadEnv() {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const CLOUDMD = `# CloudMD — Cole's Second Brain operating rules

How the brain works. Every routine reads this first, then its own routine doc.

## What the brain is
A compounding knowledge base. Raw inputs (links, notes, voice, photos) land as **raw sources**; the routines synthesize them into a **wiki** of maintained markdown pages — Cole's current best understanding of each topic. The wiki is the product; raw sources are the input. Cole reads the wiki; the routines write and maintain it. **Raw sources are immutable — never edit them.**

## Wiki domains
Pages are grouped by domain. Put a source on the page whose scope it extends:
- **A.C Media** — the photography business, financials, operations, platform build, lead gen.
- **BU** — SOM content/brand strategy, SMG, outreach/networking at Binghamton.
- **Content** — YouTube scripting, hooks, reels, personal brand voice.
- **Coursework** — HIST 238, macroeconomics, Writing 111.
- **Personal Ops** — systems, daily briefings, PKM, the summer command center, calendar, Claude tooling.
- **Mindset** — career direction, entrepreneurship, personal reflection, college life.
Most sources extend an existing page. A genuinely new topic with no home goes to **needs-review** — a new page is never created automatically; Cole decides.

## Wiki page format
\`\`\`
# Title
One-paragraph overview — the current best synthesis. Keep it current.
## Related topics
- [[page-slug]] — why it connects (one clause)
## Sources
### Source title (date if notable)
1–2 sentences: what it establishes, key facts in **bold**. Note if it supersedes a prior entry.
Source: <raw source title / id>
\`\`\`

## Conventions
- Slugs: lowercase-hyphenated. Link between pages with [[page-slug]].
- Dates: ISO (YYYY-MM-DD) in logs; "April 20 2026" style in prose. Bold key numbers/stats.
- **Append** source entries — don't rewrite a page; update the overview only when it's now stale.

## The toolbox (MCP tools)
- \`get_sop(key)\` — read a CloudMD doc (this one, or a routine's).
- \`get_pending_work\` — sources / questions / replans waiting.
- \`convert_source(id)\` — the app converts a link/file to markdown (Supadata); if it can't, you do it yourself.
- \`get_brain_pages(domain?)\` / \`get_wiki_page(slug)\` / \`search_wiki(query)\` — read the wiki.
- \`upsert_wiki_page(...)\` — write/append a wiki page.
- \`set_source_status(id, status)\` — raw | converting | converted | ingesting | ingested | needs_review | error.
- \`add_project_note(projectId, content, sourceId?)\` — add background to an active project.
- \`append_brain_log(...)\` — record what you did.
- chat: \`save_chat_answer\` · replan: \`save_replan_plan\` · weekly: \`save_lint_report\` / \`save_insight\`.
Each routine's doc names the subset it uses.

## Cole (context)
Student at Binghamton (School of Management); runs A.C Media (sports media-day + senior portrait photography, NY/PA); building content/brand strategy as the long-term career, A.C Media as the income engine. Uses WHOOP, Claude Code routines, custom skills. Night-owl; deep work in the evenings; gym 4–8pm.`;

const INGEST = `# Ingest routine (process-brain)

You turn pending raw sources into wiki updates — and, when clearly relevant, project notes. Read the general CloudMD first for the brain's rules + page format.

## Loop
1. \`get_pending_work\` → sources waiting (status \`raw\` or \`converted\`).
2. Drain the **whole** queue. When done, call \`get_pending_work\` again — if more arrived while you worked, keep going until it's empty.

## Per source
1. **Convert** (if needed): call \`convert_source(id)\`. On success you get clean markdown. If it can't (unsupported / failed), transcribe or extract it yourself from the raw input. \`set_source_status(id, 'converted')\` once you have the markdown.
2. **Place it in the wiki — always the target.** Read the index (\`get_brain_pages\`) + the candidate page(s) (\`get_wiki_page\`). Using the domain table, find the page(s) it extends.
   - **Confident** → write the source entry in the standard format, update the overview only if now stale, add [[links]], \`append_brain_log\`, \`set_source_status(id, 'ingested')\`. A source can update **more than one page** — do each.
   - **Not confident, or a genuinely new topic with no home** → \`set_source_status(id, 'needs_review')\` and **do not touch the wiki**. Never create a page yourself — Cole decides.
3. **Feed projects (only when clearly relevant).** Check the active projects. If a source is real, useful background for one — context for what Cole's building — \`add_project_note(projectId, <1–2 sentences + key facts>, sourceId)\`. Confident-only; if unsure, skip (no needs-review for notes). A source can feed both the wiki and a project.

## Rules
- Raw sources are immutable. Append to wiki pages; never rewrite them.
- Confident → file it; not confident → needs-review. Cole trusts the file action, so keep entries accurate and in-format. The stronger this doc + the CloudMD, the better you file.`;

const STUB = (name) => `# ${name} routine

Designed next, together. Read the general CloudMD for the brain's rules. This routine's specific job, the tools it uses, and its rules will be filled in here — and you can edit it anytime from this page.`;

const SOPS = [
  { key: "cloudmd", label: "General — CloudMD", content_md: CLOUDMD, sort: 0 },
  { key: "ingest", label: "Ingest (process-brain)", content_md: INGEST, sort: 1 },
  { key: "chat", label: "Chat (brain-chat)", content_md: STUB("Chat"), sort: 2 },
  { key: "replan", label: "Re-plan (replan-day)", content_md: STUB("Re-plan"), sort: 3 },
  { key: "daily", label: "Daily (planner + sweep)", content_md: STUB("Daily"), sort: 4 },
  { key: "weekly", label: "Weekly (lint + insight)", content_md: STUB("Weekly"), sort: 5 },
];

async function main() {
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env in .env.local");
    process.exit(1);
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  for (const sop of SOPS) {
    const { data: existing } = await supabase.from("brain_sops").select("key").eq("key", sop.key).maybeSingle();
    if (existing && !FORCE) {
      // Keep label/sort fresh but don't clobber edited content.
      await supabase.from("brain_sops").update({ label: sop.label, sort: sop.sort }).eq("key", sop.key);
      console.log(`  kept   ${sop.key} (content preserved; --force to overwrite)`);
    } else {
      await supabase.from("brain_sops").upsert(sop, { onConflict: "key" });
      console.log(`  ${existing ? "forced" : "seeded"} ${sop.key}`);
    }
  }
  console.log("✅ SOPs seeded.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
