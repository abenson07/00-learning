import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getAuthUser } from "@/lib/auth/server";
import {
  getSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

const LOCAL_LEARNER_COOKIE = "lp_local_learner_uid";

export type LearnerDbContext = {
  userId: string;
  client: SupabaseClient;
  source: "session" | "local_dev";
};

async function getOrCreateLocalLearnerUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(LOCAL_LEARNER_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const id = crypto.randomUUID();
  jar.set(LOCAL_LEARNER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
  return id;
}

/**
 * DB client + logical user id for learner_progress and related rows.
 * Prefer the signed-in Supabase user; in development only, fall back to a
 * cookie UUID and the service-role client so local work does not require auth.
 */
export async function getLearnerDbContext(): Promise<LearnerDbContext | null> {
  const auth = await getAuthUser();
  if (auth) {
    return {
      userId: auth.userId,
      client: await createSupabaseUserServerClient(),
      source: "session",
    };
  }

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    return null;
  }

  const userId = await getOrCreateLocalLearnerUserId();
  return {
    userId,
    client: getSupabaseServiceRoleClient(),
    source: "local_dev",
  };
}
