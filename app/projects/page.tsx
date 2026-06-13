import Link from "next/link";
import { getBoard } from "@/lib/data/board";
import type { ProjectCategory } from "@/lib/database.types";
import AddProject from "@/components/projects/AddProject";
import AddTask from "@/components/projects/AddTask";
import ProjectSection from "@/components/projects/ProjectSection";
import TaskRow from "@/components/projects/TaskRow";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: { key: ProjectCategory | "none"; label: string }[] = [
  { key: "finite", label: "Finite" },
  { key: "system", label: "Systems" },
  { key: "habit", label: "Habits" },
  { key: "later", label: "Later" },
  { key: "none", label: "Other" },
];

export default async function ProjectsPage() {
  const { configured, projects, inbox } = await getBoard();

  const groups = CATEGORY_ORDER.map((group) => ({
    ...group,
    projects: projects.filter((p) => (p.category ?? "none") === group.key),
  })).filter((group) => group.projects.length > 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Projects / Tasks
          </span>
          <h1 className="text-2xl font-extrabold">
            Everything, <span className="accent">prioritized.</span>
          </h1>
        </div>
        <Link
          href="/"
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          home
        </Link>
      </header>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code>.env.local</code> to load and save your tasks.
        </div>
      ) : null}

      <AddProject />

      <section
        className="rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold">Inbox</h2>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
            {inbox.length} one-off{inbox.length === 1 ? "" : "s"}
          </span>
        </div>
        {inbox.length > 0 ? (
          <div className="mt-2">
            {inbox.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        ) : null}
        <div className="mt-1">
          <AddTask placeholder="Quick capture…" />
        </div>
      </section>

      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            {group.label}
          </h2>
          {group.projects.map((project) => (
            <ProjectSection key={project.id} project={project} />
          ))}
        </div>
      ))}

      {configured && projects.length === 0 && inbox.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No projects yet — add one above, or quick-capture a task to the Inbox.
        </p>
      ) : null}
    </main>
  );
}
