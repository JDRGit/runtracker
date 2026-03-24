import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SupabaseSignOutButton from "./SupabaseSignOutButton";

export const dynamic = "force-dynamic";

export default async function SupabaseExamplePage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/supabase/sign-in");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-[24px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Supabase session</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Signed in as {user?.email || "Authenticated user"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link className="ghost-button" href="/">
            Back to RunTracker
          </Link>
          <SupabaseSignOutButton />
        </div>
      </header>

      <section className="glass-panel">
        <p className="eyebrow">Supabase</p>
        <h1 className="section-title mt-3">Todos example</h1>
        <p className="section-copy mt-2">
          This route is protected with Supabase Auth and uses the server-side client with cookie-aware session handling.
        </p>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error.message || "Could not load todos from Supabase."}
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {todos?.map((todo) => (
            <li
              key={todo.id}
              className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700"
            >
              {todo.name}
            </li>
          ))}

          {!error && (!todos || todos.length === 0) ? (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500">
              No todos were returned from the `todos` table yet.
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
