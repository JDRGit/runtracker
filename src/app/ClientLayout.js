"use client";

function formatTodayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function ClientLayout({ actions = null, children, user = null }) {
  const todayLabel = formatTodayLabel();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-900/10 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="eyebrow">Run tracker</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">RunTracker</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {user ? (
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                <span>{user.name || user.email || "Signed in"}</span>
              </div>
            ) : null}
            {actions}
            <div className="inline-flex rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
              <span suppressHydrationWarning>{todayLabel}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
