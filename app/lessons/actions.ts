"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SetLessonStepCompleteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setLessonStepComplete(args: {
  planId: string;
  lessonId: string;
  stepNumber: number;
  complete: boolean;
}): Promise<SetLessonStepCompleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { planId, lessonId, stepNumber, complete } = args;

  if (!planId || !lessonId || !Number.isFinite(stepNumber)) {
    return { ok: false, error: "Invalid step" };
  }

  if (complete) {
    const { error } = await supabase.from("lesson_step_progress").insert({
      user_id: user.id,
      plan_id: planId,
      lesson_id: lessonId,
      step_number: stepNumber,
    });
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("lesson_step_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("lesson_id", lessonId)
      .eq("step_number", stepNumber);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/lessons", "layout");
  return { ok: true };
}
