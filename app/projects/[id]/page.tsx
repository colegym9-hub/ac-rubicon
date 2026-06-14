import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/project";
import ProjectEditor from "@/components/projects/ProjectEditor";
import ProgressControl from "@/components/projects/ProgressControl";
import TaskRow from "@/components/projects/TaskRow";
import AddTask from "@/components/projects/AddTask";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { configured, detail } = await getProject(id);
  if (configured && !detail) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 py-10">
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Project
        </span>
        <Link
          href="/projects"
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          ← board
        </Link>
      </header>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code>.env.local</code>.
        </div>
      ) : detail ? (
        <>
          <ProjectEditor project={detail.project} />
          <ProgressControl
            id={detail.project.id}
            mode={detail.project.progress_mode}
            pct={detail.progressPct}
            manualValue={detail.project.progress}
          />
          <section
            className="flex flex-col rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold">Tasks</h2>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                {detail.done}/{detail.total} done
              </span>
            </div>
            {detail.tasks.length > 0 ? (
              <div className="mt-2">
                {detail.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            ) : null}
            <div className="mt-1">
              <AddTask projectId={detail.project.id} />
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
