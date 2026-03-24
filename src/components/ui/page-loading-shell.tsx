type PageLoadingShellProps = {
  badge: string;
  title: string;
  description: string;
};

export function PageLoadingShell({ badge, title, description }: PageLoadingShellProps) {
  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <section className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8">
        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-black/5 bg-white px-6 py-7 shadow-[0_20px_60px_rgba(30,57,75,0.06)] sm:px-8 sm:py-8">
            <span className="inline-flex rounded-full bg-[color:var(--primary-container)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
              {badge}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)]">{description}</p>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(30,57,75,0.06)] sm:p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-32 rounded-full bg-[color:var(--surface-container-high)]" />
              <div className="h-12 w-full rounded-2xl bg-[color:var(--surface-container-low)]" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-36 rounded-[1.5rem] bg-[color:var(--surface-container-low)]" />
                <div className="h-36 rounded-[1.5rem] bg-[color:var(--surface-container-low)]" />
              </div>
              <div className="h-28 rounded-[1.5rem] bg-[color:var(--surface-container-low)]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
