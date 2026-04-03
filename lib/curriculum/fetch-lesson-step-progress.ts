import { createClient } from "@/lib/supabase/server";

export type LessonStepProgressRow = { lessonId: string; stepNumber: number };

export async function fetchLessonStepProgress(planId: string): Promise<{
  userId: string | null;
  steps: LessonStepProgressRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, steps: [] };
  }

  const { data, error } = await supabase
    .from("lesson_step_progress")
    .select("lesson_id, step_number")
    .eq("user_id", user.id)
    .eq("plan_id", planId);

  if (error) {
    console.error("[fetchLessonStepProgress]", error.message);
    return { userId: user.id, steps: [] };
  }

  const rows = data ?? [];
  return {
    userId: user.id,
    steps: rows.map((r) => ({
      lessonId: r.lesson_id as string,
      stepNumber: r.step_number as number,
    })),
  };
}
