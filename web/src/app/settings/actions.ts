"use server";

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

export async function saveUserProfileSettingsAction(input: {
  occupation: string;
  context: string;
  learningStyle: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await getAuthUser();
  if (!auth) {
    return { ok: false, message: "You must be signed in." };
  }

  const supabase = await createSupabaseUserServerClient();

  const occupation = input.occupation.trim() || null;
  const context = input.context.trim() || null;

  const { error } = await supabase
    .from("user_profile")
    .update({
      occupation,
      context,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/lessons");
  return { ok: true };
}
