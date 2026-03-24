import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseAnonOrPublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl()!,
    getSupabaseAnonOrPublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Cookie-free server client for public, read-only rendering paths.
 * Avoids forcing route blocking on cookies()/headers() access.
 */
export function createPublicServerClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonOrPublishableKey();
  if (!url || !key) {
    throw new Error("Supabase URL and anon/publishable key are required.");
  }
  return createSupabaseClient(url, key);
}
