import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function createClient(cookieStore) {
  const resolvedCookieStore = cookieStore ?? (await cookies());
  const { supabaseKey, supabaseUrl } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return resolvedCookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            resolvedCookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies directly.
          // Middleware refresh keeps the browser-side session current.
        }
      },
    },
  });
}
