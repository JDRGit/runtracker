import ClientLayout from "./ClientLayout";

const requiredVariables = [
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "NETLIFY_DATABASE_URL",
];

export default function AuthConfigurationNotice() {
  return (
    <ClientLayout>
      <section className="mx-auto max-w-2xl">
        <div className="glass-panel">
          <p className="eyebrow">Configuration required</p>
          <h2 className="section-title mt-3">RunTracker cannot start auth yet</h2>
          <p className="section-copy mt-2">
            The app is deployed with Neon Auth, but the required server environment variables are not configured.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Add the following variables in Netlify, then redeploy:
          </div>

          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {requiredVariables.map((name) => (
              <li key={name} className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                <code>{name}</code>
              </li>
            ))}
          </ul>

          <p className="section-copy mt-6">
            After deploy, the homepage will resume normal sign-in and session checks automatically.
          </p>
        </div>
      </section>
    </ClientLayout>
  );
}
