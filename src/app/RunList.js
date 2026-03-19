"use client";

import {
  formatDistance,
  formatDuration,
  formatPace,
  formatRunDate,
  getRunPace,
} from "@/lib/runs";

export default function RunList({ activeDeleteId, errorMessage, isLoading, onDeleteRun, runs }) {
  return (
    <section>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">History</p>
          <h3 className="section-title mt-3">Recent runs</h3>
          <p className="section-copy mt-2">
            {runs.length > 0
              ? `${runs.length} run${runs.length === 1 ? "" : "s"} logged so far.`
              : "Your saved runs will appear here."}
          </p>
        </div>
        {errorMessage ? (
          <p className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/50 px-5 py-8 text-sm text-slate-500">
          Loading your runs...
        </div>
      ) : null}

      {!isLoading && runs.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No runs logged yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add your first run to start building a training timeline.
          </p>
        </div>
      ) : null}

      {!isLoading && runs.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {runs.map((run) => {
            const runPace = getRunPace(run);
            const isDeleting = activeDeleteId === run.id;

            return (
              <li
                key={run.id}
                className="grid gap-4 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-slate-950">{formatRunDate(run.date)}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      {formatPace(runPace)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Distance</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {formatDistance(run.distance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Time</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {formatDuration(run.durationMinutes ?? run.time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pace</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {formatPace(runPace)}
                      </p>
                    </div>
                  </div>

                  {run.notes ? (
                    <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {run.notes}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-start justify-end">
                  <button
                    className="ghost-button"
                    disabled={isDeleting}
                    onClick={() => onDeleteRun(run.id)}
                    type="button"
                  >
                    {isDeleting ? "Removing..." : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
