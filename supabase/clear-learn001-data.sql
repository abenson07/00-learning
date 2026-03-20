-- Wipes learn-001 data only (keeps table definitions). Use before re-running seed.sql if inserts failed halfway or you need a clean reseed.
-- Supabase SQL Editor → Run, then run seed.sql.

truncate table
  public.comment_ai_response,
  public.comment,
  public.highlight,
  public.quiz_attempt,
  public.lesson_item_progress,
  public.learner_progress,
  public.lesson_plan_item,
  public.lesson_plan_version,
  public.lesson_plan,
  public.content_version,
  public.content_item,
  public.topic,
  public.category,
  public.domain
restart identity cascade;
