function trimOrUndef(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

/** Project URL: public env first, then server-only alias (works in RSC / middleware). */
export function getSupabaseUrl(): string | undefined {
  return (
    trimOrUndef(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    trimOrUndef(process.env.SUPABASE_URL)
  );
}

/**
 * Browser client must use NEXT_PUBLIC_* (non-public keys are not exposed to the client bundle).
 * Server code can also fall back to SUPABASE_ANON_KEY.
 */
export function getSupabaseAnonOrPublishableKey(): string | undefined {
  return (
    trimOrUndef(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    trimOrUndef(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ??
    trimOrUndef(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    trimOrUndef(process.env.SUPABASE_ANON_KEY)
  );
}

export function hasSupabaseEnvConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonOrPublishableKey());
}

/** Safe to show in UI — lists missing names only, never secret values. */
export function describeMissingSupabaseEnv(): string {
  const missing: string[] = [];
  if (!getSupabaseUrl()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL (or server-only SUPABASE_URL alongside server fetches)");
  }
  if (!getSupabaseAnonOrPublishableKey()) {
    missing.push(
      "one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY (or server-only SUPABASE_ANON_KEY)",
    );
  }
  return [
    "Supabase environment variables were not found at runtime.",
    `Missing: ${missing.join("; ")}.`,
    "Put them in the project root `.env.local`, save, then fully restart `next dev` (env is read at startup).",
  ].join(" ");
}
