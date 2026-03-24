import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SupabaseAuthCard from "../SupabaseAuthCard";

export const dynamic = "force-dynamic";

export default async function SupabaseSignInPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims?.sub) {
    redirect("/supabase");
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">Protected example</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Supabase email authentication
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          This area uses Supabase Auth plus SSR middleware. Sign in or create an account to reach the protected todos route.
        </p>
      </div>

      <SupabaseAuthCard />
    </main>
  );
}
