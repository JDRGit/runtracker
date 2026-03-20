"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import AuthPanel from "./AuthPanel";
import ClientLayout from "./ClientLayout";
import LogRunForm from "./LogRunForm";
import PasskeyPanel from "./PasskeyPanel";
import RunList from "./RunList";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatRunDate,
  getRunStats,
  sortRunsByDate,
} from "@/lib/runs";

async function getResponseError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function getAuthActionError(error, fallbackMessage) {
  const code = typeof error?.code === "string" ? error.code : "";

  if (code === "AUTH_CANCELLED" || code === "ERROR_CEREMONY_ABORTED") {
    return "The authentication prompt was cancelled.";
  }

  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message || fallbackMessage;
}

export default function RunTrackerApp() {
  const { data: sessionData, error: sessionError, isPending: isCheckingSession } = authClient.useSession();
  const [authError, setAuthError] = useState("");
  const [authorizationError, setAuthorizationError] = useState("");
  const [isAuthenticatingWithGoogle, setIsAuthenticatingWithGoogle] = useState(false);
  const [isAuthenticatingWithPasskey, setIsAuthenticatingWithPasskey] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [listError, setListError] = useState("");
  const [activeDeleteId, setActiveDeleteId] = useState("");
  const session = sessionData ?? null;
  const user = session?.user ?? null;

  useEffect(() => {
    if (!sessionError) {
      return;
    }

    setAuthError(sessionError.message || "Could not verify your session.");
  }, [sessionError]);

  useEffect(() => {
    if (!user?.id) {
      setRuns([]);
      setIsLoading(false);
      setLoadError("");
      setListError("");
      setActiveDeleteId("");
      setAuthorizationError("");
      return;
    }

    const loadRuns = async () => {
      setIsLoading(true);
      setLoadError("");
      setAuthorizationError("");

      try {
        const response = await fetch("/api/runs", {
          cache: "no-store",
        });

        if (response.status === 401) {
          throw new Error("Your session expired. Sign in again.");
        }

        if (response.status === 403) {
          const message = await getResponseError(
            response,
            "Your account is signed in, but it is not allowed to access this app.",
          );
          setAuthorizationError(message);
          setRuns([]);
          return;
        }

        if (!response.ok) {
          throw new Error(await getResponseError(response, "Could not load your runs."));
        }

        const data = await response.json();
        setRuns(sortRunsByDate(data));
      } catch (error) {
        setLoadError(error.message || "Could not load your runs.");
      } finally {
        setIsLoading(false);
      }
    };

    loadRuns();
  }, [user?.id]);

  const handleAuthenticateWithPasskey = async () => {
    setAuthError("");
    setAuthorizationError("");
    setIsAuthenticatingWithPasskey(true);

    try {
      const result = await authClient.signIn.passkey();

      if (result.error) {
        throw new Error(getAuthActionError(result.error, "Could not sign in with your passkey."));
      }
    } catch (error) {
      setAuthError(getAuthActionError(error, "Could not sign in with your passkey."));
    } finally {
      setIsAuthenticatingWithPasskey(false);
    }
  };

  const handleAuthenticateWithGoogle = async () => {
    setAuthError("");
    setAuthorizationError("");
    setIsAuthenticatingWithGoogle(true);

    try {
      await authClient.signIn.social({
        callbackURL: "/",
        provider: "google",
      });
    } catch (error) {
      setAuthError(error.message || "Could not start Google sign-in.");
    } finally {
      setIsAuthenticatingWithGoogle(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError("");
    setAuthorizationError("");
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      setRuns([]);
      setLoadError("");
      setListError("");
    } catch (error) {
      setAuthError(error.message || "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCreateRun = async (runPayload) => {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(runPayload),
    });

    if (response.status === 401) {
      throw new Error("Your session expired. Sign in again.");
    }

    if (response.status === 403) {
      const message = await getResponseError(
        response,
        "Your account is signed in, but it is not allowed to access this app.",
      );
      setAuthorizationError(message);
      throw new Error(message);
    }

    if (!response.ok) {
      throw new Error(await getResponseError(response, "Could not save that run."));
    }

    const savedRun = await response.json();
    setRuns((currentRuns) => sortRunsByDate([savedRun, ...currentRuns]));
    setListError("");
    setLoadError("");

    return savedRun;
  };

  const handleDeleteRun = async (id) => {
    setActiveDeleteId(id);
    setListError("");

    try {
      const response = await fetch("/api/runs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.status === 401) {
        throw new Error("Your session expired. Sign in again.");
      }

      if (response.status === 403) {
        const message = await getResponseError(
          response,
          "Your account is signed in, but it is not allowed to access this app.",
        );
        setAuthorizationError(message);
        throw new Error(message);
      }

      if (!response.ok) {
        throw new Error(await getResponseError(response, "Could not delete that run."));
      }

      setRuns((currentRuns) => currentRuns.filter((run) => run.id !== id));
    } catch (error) {
      setListError(error.message || "Could not delete that run.");
    } finally {
      setActiveDeleteId("");
    }
  };

  const stats = getRunStats(runs);

  if (!user || authorizationError) {
    return (
      <ClientLayout user={user}>
        <AuthPanel
          errorMessage={authorizationError || authError}
          isAuthenticatingWithGoogle={isAuthenticatingWithGoogle}
          isAuthenticatingWithPasskey={isAuthenticatingWithPasskey}
          isCheckingSession={isCheckingSession}
          isForbidden={Boolean(authorizationError)}
          onAuthenticateWithGoogle={handleAuthenticateWithGoogle}
          onAuthenticateWithPasskey={handleAuthenticateWithPasskey}
          onSignOut={user ? handleSignOut : null}
          user={user}
        />
      </ClientLayout>
    );
  }

  const statCards = [
    {
      label: "Total distance",
      value: formatDistance(stats.totalDistance),
      note: `${stats.runCount} logged ${stats.runCount === 1 ? "run" : "runs"}`,
    },
    {
      label: "Total time",
      value: formatDuration(stats.totalDurationMinutes),
      note: stats.averagePace ? `Average pace ${formatPace(stats.averagePace)}` : "Pace shows up after your first run",
    },
    {
      label: "Best pace",
      value: stats.bestPace ? formatPace(stats.bestPace) : "--",
      note: stats.bestPace ? "Fastest logged pace" : "Log a run to benchmark pace",
    },
    {
      label: "Longest run",
      value: stats.longestDistance ? formatDistance(stats.longestDistance) : "--",
      note: stats.mostRecentRunDate
        ? `Most recent on ${formatRunDate(stats.mostRecentRunDate)}`
        : "Your latest run will appear here",
    },
  ];

  const snapshotItems = [
    {
      label: "Latest run",
      value: stats.mostRecentRunDate ? formatRunDate(stats.mostRecentRunDate) : "No runs yet",
    },
    {
      label: "Average pace",
      value: stats.averagePace ? formatPace(stats.averagePace) : "--",
    },
    {
      label: "Longest effort",
      value: stats.longestDistance ? formatDistance(stats.longestDistance) : "--",
    },
  ];

  return (
    <ClientLayout
      actions={
        <button className="ghost-button" disabled={isSigningOut} onClick={handleSignOut} type="button">
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      }
      user={user}
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="glass-panel bg-white/80">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-amber-200/60 via-orange-100/20 to-transparent blur-2xl" />
          <div className="relative">
            <p className="eyebrow">Mileage dashboard</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Log runs, watch your pace, and keep your training history readable.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This dashboard keeps the basics visible: total distance, time on feet, pace, and
              a clean timeline of every run you log.
            </p>
            {loadError && runs.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {loadError}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="glass-panel bg-slate-950 text-white">
          <p className="eyebrow text-white/60">Quick snapshot</p>
          <div className="mt-8 space-y-5">
            {snapshotItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article key={card.label} className="stat-card">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="glass-panel">
            <div className="mb-6">
              <p className="eyebrow">New entry</p>
              <h3 className="section-title mt-3">Log a run</h3>
              <p className="section-copy mt-2">
                Capture the date, distance, and total time. Pace is calculated automatically.
              </p>
            </div>
            <LogRunForm onCreateRun={handleCreateRun} />
          </div>

          <div className="glass-panel">
            <PasskeyPanel />
          </div>
        </div>

        <div className="glass-panel">
          <RunList
            activeDeleteId={activeDeleteId}
            errorMessage={listError || (runs.length > 0 ? loadError : "")}
            isLoading={isLoading}
            onDeleteRun={handleDeleteRun}
            runs={runs}
          />
        </div>
      </section>
    </ClientLayout>
  );
}
