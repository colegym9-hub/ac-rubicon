import Link from "next/link";
import { logout } from "@/app/login/actions";

type Surface = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  ready: boolean;
};

const surfaces: Surface[] = [
  {
    href: "/projects",
    eyebrow: "01",
    title: "Projects / Tasks",
    body: "Priority-weighted tasks, projects by category, a one-off Inbox.",
    ready: true,
  },
  {
    href: "/today",
    eyebrow: "02",
    title: "Today / Scheduler",
    body: "An AI-planned, time-blocked day — on your phone before your desk.",
    ready: false,
  },
  {
    href: "/tracking",
    eyebrow: "03",
    title: "Tracking",
    body: "One-tap daily metrics that expand into notes.",
    ready: false,
  },
  {
    href: "/graphs",
    eyebrow: "04",
    title: "Graphs",
    body: "Throughput, trends, and the plan-vs-done adherence mirror.",
    ready: false,
  },
];

function SurfaceCard({ surface }: { surface: Surface }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          {surface.eyebrow}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-primary/70">
          {surface.ready ? "ready" : "soon"}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-bold transition-colors group-hover:text-primary">
        {surface.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{surface.body}</p>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          AC Rubicon
        </span>
        <h1 className="text-4xl font-extrabold leading-[1.1]">
          Optimizing my past into{" "}
          <span className="accent">building my future.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          The command center for projects, tasks, and the day ahead.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        {surfaces.map((surface) => {
          const className =
            "group rounded-[var(--radius)] border bg-card/70 p-4 backdrop-blur-md transition-colors";
          const style = { borderColor: "var(--glass-border)" };

          return surface.ready ? (
            <Link
              key={surface.href}
              href={surface.href}
              className={`${className} hover:border-primary/60`}
              style={style}
            >
              <SurfaceCard surface={surface} />
            </Link>
          ) : (
            <div
              key={surface.href}
              className={`${className} opacity-70`}
              style={style}
            >
              <SurfaceCard surface={surface} />
            </div>
          );
        })}
      </nav>

      <footer className="mt-auto flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        <span>v0 · foundation</span>
        <form action={logout}>
          <button
            type="submit"
            className="uppercase tracking-[0.2em] transition-colors hover:text-primary"
          >
            lock
          </button>
        </form>
      </footer>
    </main>
  );
}
