import Link from "next/link";
import type { ProjectCard as ProjectCardData } from "@/lib/data/board";
import { CATEGORY_LABELS } from "@/lib/labels";
import { todayISO } from "@/lib/day";
import ProgressBar from "@/components/projects/ProgressBar";

function dueMeta(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null;
  return { label: due.slice(5), overdue: due < todayISO() };
}

export default function ProjectCard({ project }: { project: ProjectCardData }) {
  const due = dueMeta(project.target_date);
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/70 p-3 backdrop-blur-md transition-colors hover:border-primary/60"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <span className="font-bold leading-tight">{project.name}</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {project.category ? (
          <span
            className="rounded-full border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.15em] text-muted-foreground"
            style={{ borderColor: "var(--glass-border)" }}
          >
            {CATEGORY_LABELS[project.category]}
          </span>
        ) : null}
        {due ? (
          <span
            className={`font-mono text-[0.55rem] uppercase tracking-[0.15em] ${
              due.overdue ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {due.overdue ? "overdue " : "due "}
            {due.label}
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
          {project.done}/{project.total}
        </span>
      </div>
      <ProgressBar pct={project.progressPct} mode={project.progress_mode} />
    </Link>
  );
}
