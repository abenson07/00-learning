import type { User } from "@supabase/supabase-js";

import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

export async function getAuthUser(): Promise<{
  user: User;
  userId: string;
} | null> {
  const supabase = await createSupabaseUserServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { user, userId: user.id };
}

export type UserProfileRow = {
  user_id: string;
  role: "teacher" | "student";
  occupation: string | null;
  context: string | null;
  learning_style: string | null;
};

export async function getUserProfileForUser(
  userId: string,
): Promise<UserProfileRow | null> {
  const supabase = await createSupabaseUserServerClient();
  const { data, error } = await supabase
    .from("user_profile")
    .select("user_id, role, occupation, context")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const role = data.role === "teacher" ? "teacher" : "student";
  return {
    user_id: data.user_id,
    role,
    occupation: data.occupation,
    context: data.context,
    learning_style: null,
  };
}
