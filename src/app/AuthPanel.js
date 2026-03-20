"use client";

export default function AuthPanel({
  errorMessage,
  isAuthenticating,
  isCheckingSession,
  isForbidden = false,
  onAuthenticate,
  onSignOut,
  user = null,
}) {
  const helperCopy = isForbidden
    ? "This Google account is signed in, but it is not on the allowlist for this app."
    : "Sign in with Google to access your private run history.";

  return (
    <section className="mx-auto max-w-xl">
      <div className="glass-panel">
        <p className="eyebrow">Protected access</p>
        <h2 className="section-title mt-3">Sign in to RunTracker</h2>
        <p className="section-copy mt-2">{helperCopy}</p>

        {user ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-sm text-slate-700">
            Signed in as <span className="font-medium text-slate-950">{user.email || user.name || "Unknown user"}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            className="primary-button w-full"
            disabled={isCheckingSession || isAuthenticating || isForbidden}
            onClick={onAuthenticate}
            type="button"
          >
            {isCheckingSession
              ? "Checking session..."
              : isAuthenticating
                ? "Redirecting to Google..."
                : "Continue with Google"}
          </button>

          {user && onSignOut ? (
            <button className="ghost-button w-full" onClick={onSignOut} type="button">
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
