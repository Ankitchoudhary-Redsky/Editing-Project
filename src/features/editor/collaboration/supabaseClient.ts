import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_PUBLIC_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable shared documents.",
    );
  }
  console.log("Supabase client created with URL:", supabaseUrl);
  console.log("Supabase client created with Anon Key:", supabaseAnonKey);
  if (!client) {
    console.log("Creating new Supabase client instance...");
    client = createClient(supabaseUrl, supabaseAnonKey);
  }

  console.log("Supabase client instance:", client);
  return client;
}
