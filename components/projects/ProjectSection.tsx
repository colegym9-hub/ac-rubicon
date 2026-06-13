import ProjectHeader from "@/components/projects/ProjectHeader";
import TaskRow from "@/components/projects/TaskRow";
import AddTask from "@/components/projects/AddTask";
import type { ProjectWithTasks } from "@/lib/data/board";

export default function ProjectSection({
  project,
}: {
  project: ProjectWithTasks;
}) {
  return (
    <section
      className="rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <ProjectHeader project={project} taskCount={project.tasks.length} />
      {project.tasks.length > 0 ? (
        <div className="mt-2">
          {project.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      ) : null}
      <div className="mt-1">
        <AddTask projectId={project.id} />
      </div>
    </section>
  );
}
