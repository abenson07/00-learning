import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-12 md:gap-5">
        <section className="flex flex-col justify-between gap-8 rounded-md border border-border bg-muted p-8 md:col-span-7 md:p-10 lg:p-12">
          <div>
            <p className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-md border border-foreground/15 bg-card text-xs font-black text-foreground">
                01
              </span>
              <span className="text-[0.65rem] font-semibold tracking-wider uppercase">
                Learning overview
              </span>
            </p>
            <h1 className="mt-6 max-w-xl text-3xl font-extrabold tracking-tighter text-foreground uppercase sm:text-4xl lg:text-5xl lg:leading-[1.05]">
              Build skills with structured lessons
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Browse the library or open a lesson plan — same routes, sharper
              layout. Everything stays sans-serif, high contrast, tile-based.
            </p>
          </div>
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            Prototype UI — progress and content come from your Supabase seed.
          </p>
        </section>

        <div className="grid gap-4 md:col-span-5 md:grid-rows-2">
          <Link
            href="/library"
            className="group flex flex-col justify-between rounded-md border border-border bg-card p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-8"
          >
            <div>
              <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Library
              </p>
              <p className="mt-3 text-4xl font-black tracking-tighter text-foreground tabular-nums">
                Browse
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Domains, categories, topics — open any article from the catalog.
            </p>
            <span className="mt-4 text-xs font-bold tracking-wide text-foreground uppercase underline-offset-4 group-hover:underline">
              Open library →
            </span>
          </Link>

          <Link
            href="/lessons"
            className="group flex flex-col justify-between rounded-md border border-border bg-card p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-8"
          >
            <div>
              <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Lessons
              </p>
              <p className="mt-3 text-4xl font-black tracking-tighter text-foreground tabular-nums">
                Plans
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Syllabus, readings, and progress in one flow.
            </p>
            <span className="mt-4 text-xs font-bold tracking-wide text-foreground uppercase underline-offset-4 group-hover:underline">
              View lessons →
            </span>
          </Link>
        </div>
      </div>

      <section className="flex flex-col items-center justify-center gap-4 rounded-md border border-foreground/10 bg-black px-8 py-12 text-center text-white md:px-16 md:py-16">
        <h2 className="max-w-2xl text-2xl font-extrabold tracking-tighter uppercase sm:text-3xl md:text-4xl">
          Keep going — one tile at a time
        </h2>
        <p className="max-w-md text-sm font-light text-white/70">
          Monochrome shell, bold type, no serif noise. Use the top nav to jump
          between areas.
        </p>
      </section>
    </div>
  );
}
