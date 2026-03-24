"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

function getMessage(error, fallbackMessage) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message || fallbackMessage;
}

export default function SupabaseAuthCard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/supabase`,
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.replace("/supabase");
          router.refresh();
          return;
        }

        setSuccessMessage(
          "Account created. Check your email for a confirmation link, then come back to sign in.",
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/supabase");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        getMessage(
          error,
          isSignUp ? "Could not create your account." : "Could not sign you in with email and password.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl">
      <div className="glass-panel">
        <p className="eyebrow">Supabase auth</p>
        <h1 className="section-title mt-3">
          {isSignUp ? "Create your account" : "Sign in with email"}
        </h1>
        <p className="section-copy mt-2">
          {isSignUp
            ? "Use Supabase email auth to create a user for the protected todos page."
            : "Sign in to access the protected Supabase todos example."}
        </p>

        <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !isSignUp ? "bg-slate-950 text-white" : "text-slate-600"
            }`}
            onClick={() => {
              setMode("sign-in");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isSignUp ? "bg-slate-950 text-white" : "text-slate-600"
            }`}
            onClick={() => {
              setMode("sign-up");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">Email</span>
            <input
              autoComplete="email"
              className="field-input"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="field-label">Password</span>
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="field-input"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button className="primary-button w-full" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-500">
          <span>
            {isSignUp ? "Already have an account?" : "Need an account?"}
          </span>
          <button
            className="ghost-button"
            onClick={() => {
              setMode(isSignUp ? "sign-in" : "sign-up");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            type="button"
          >
            {isSignUp ? "Switch to sign in" : "Switch to sign up"}
          </button>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          <Link className="underline decoration-slate-300 underline-offset-4" href="/">
            Back to RunTracker
          </Link>
        </div>
      </div>
    </section>
  );
}
