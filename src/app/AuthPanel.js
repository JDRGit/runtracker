"use client";

import { useState } from "react";

export default function AuthPanel({ errorMessage, isAuthenticating, isCheckingSession, onAuthenticate }) {
  const [token, setToken] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onAuthenticate(token);
  };

  return (
    <section className="mx-auto max-w-xl">
      <div className="glass-panel">
        <p className="eyebrow">Protected access</p>
        <h2 className="section-title mt-3">Sign in to RunTracker</h2>
        <p className="section-copy mt-2">
          This dashboard is private. Enter the admin token configured in
          `RUNTRACKER_ADMIN_TOKEN` to access the API and run history.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="field-label" htmlFor="admin-token">
              Admin token
            </label>
            <input
              autoComplete="current-password"
              className="field-input"
              id="admin-token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter admin token"
              required
              type="password"
              value={token}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="primary-button w-full"
            disabled={isCheckingSession || isAuthenticating}
            type="submit"
          >
            {isCheckingSession ? "Checking session..." : isAuthenticating ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
