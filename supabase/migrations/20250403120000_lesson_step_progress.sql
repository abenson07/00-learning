-- Per-user step completion for JSON lesson plans (plan_id = content.id in lesson_plans.content).
CREATE TABLE IF NOT EXISTS public.lesson_step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  lesson_id text NOT NULL,
  step_number int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_step_progress_unique_step UNIQUE (user_id, plan_id, lesson_id, step_number)
);

CREATE INDEX IF NOT EXISTS lesson_step_progress_user_plan_idx
  ON public.lesson_step_progress (user_id, plan_id);

ALTER TABLE public.lesson_step_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_step_progress_select_own"
  ON public.lesson_step_progress
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "lesson_step_progress_insert_own"
  ON public.lesson_step_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "lesson_step_progress_delete_own"
  ON public.lesson_step_progress
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.lesson_step_progress TO authenticated;
