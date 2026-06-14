import Link from "next/link";
import { getBoard } from "@/lib/data/board";
import AddProject from "@/components/projects/AddProject";
import AddTask from "@/components/projects/AddTask";
import ProjectCard from "@/components/projects/ProjectCard";
import TaskRow from "@/components/projects/TaskRow";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { configured, columns, inbox } = await getBoard();
  const totalProjects = columns.reduce((n, c) => n + c.projects.length, 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pt-10 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Projects / Tasks
          </span>
          <h1 className="text-2xl font-extrabold">
            The <span className="accent">priority board.</span>
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
          <code>.env.local</code> to load and save your projects.
        </div>
      ) : null}

      <AddProject />

      {/* Priority board — columns scroll horizontally (swipe), cards tap to open. */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {columns.map((col) => (
          <section
            key={col.value}
            className="flex w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col gap-2"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                {col.label}
              </h2>
              <span className="font-mono text-[0.6rem] text-muted-foreground">
                {col.projects.length}
              </span>
            </div>
            {col.projects.length > 0 ? (
              col.projects.map((project) => <ProjectCard key={project.id} project={project} />)
            ) : (
              <p
                className="rounded-[var(--radius)] border border-dashed p-3 text-center text-xs text-muted-foreground"
                style={{ borderColor: "var(--glass-border)" }}
              >
                —
              </p>
            )}
          </section>
        ))}
      </div>

      {configured && totalProjects === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet — tap <span className="text-foreground">+ New project</span> above to add
          your first, or quick-capture a one-off task to the Inbox below.
        </p>
      ) : null}

      {/* Inbox — one-off tasks with no project. */}
      <section
        className="flex flex-col rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
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
    </main>
  );
}
