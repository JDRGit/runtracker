"use client";

import { useEffect, useState } from "react";

export default function AuthPanel({
  errorMessage,
  isAuthenticatingWithGoogle,
  isAuthenticatingWithPasskey,
  isCheckingSession,
  isForbidden = false,
  onAuthenticateWithGoogle,
  onAuthenticateWithPasskey,
  onSignOut,
  user = null,
}) {
  const [isPasskeySupported, setIsPasskeySupported] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsPasskeySupported(typeof window.PublicKeyCredential !== "undefined");
  }, []);

  const helperCopy = isForbidden
    ? "This account is signed in, but it is not on the allowlist for this app."
    : "Use a saved passkey to sign in. If you have not registered one yet, use Google once and add a passkey from the dashboard.";

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

        {isPasskeySupported === false ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Passkey sign-in needs WebAuthn support in the browser. Google sign-in remains available so you can still access the app.
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {!user ? (
            <>
              <button
                className="primary-button w-full"
                disabled={isCheckingSession || isAuthenticatingWithPasskey || isPasskeySupported === false}
                onClick={onAuthenticateWithPasskey}
                type="button"
              >
                {isCheckingSession
                  ? "Checking session..."
                  : isAuthenticatingWithPasskey
                    ? "Waiting for passkey..."
                    : "Continue with passkey"}
              </button>

              <button
                className="ghost-button w-full"
                disabled={isCheckingSession || isAuthenticatingWithGoogle}
                onClick={onAuthenticateWithGoogle}
                type="button"
              >
                {isAuthenticatingWithGoogle ? "Redirecting to Google..." : "Use Google to register a passkey"}
              </button>
            </>
          ) : null}

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
