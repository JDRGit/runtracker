import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { supabaseKey, supabaseUrl } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseKey);
}
