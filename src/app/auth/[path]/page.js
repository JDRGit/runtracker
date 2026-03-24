import { AuthView } from "@neondatabase/auth/react/ui";
import { redirect } from "next/navigation";
import { auth, isNeonAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({ params }) {
  const { path } = await params;
  const isConfigured = isNeonAuthConfigured();
  const { data: session } = isConfigured ? await auth.getSession() : { data: null };

  if (session?.user?.id && (path === "sign-in" || path === "sign-up")) {
    redirect("/");
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="glass-panel">
        <p className="eyebrow">Neon Auth</p>
        <h1 className="section-title mt-3">Secure access for RunTracker</h1>
        <p className="section-copy mt-2">Use the configured Neon Auth providers to continue.</p>
        {isConfigured ? (
          <div className="mt-6">
            <AuthView pathname={path} />
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Configure <code>NEON_AUTH_BASE_URL</code> and <code>NEON_AUTH_COOKIE_SECRET</code> before using auth
            routes.
          </p>
        )}
      </div>
    </section>
  );
}
