import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonOrPublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonOrPublishableKey();

  if (!url || !key) {
    throw new Error(
      "Your project's URL and Key are required to create a Supabase client. Set NEXT_PUBLIC_SUPABASE_URL and a NEXT_PUBLIC_* key in .env.local.",
    );
  }

  return createBrowserClient(url, key);
}
