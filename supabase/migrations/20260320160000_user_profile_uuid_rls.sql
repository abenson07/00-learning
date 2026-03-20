-- learn-007 + learn-008: user_profile (personalization + role), UUID ownership, strict RLS

-- ---------------------------------------------------------------------------
-- User profile (occupation/context for AI; role for teacher/student UI)
-- ---------------------------------------------------------------------------
create table public.user_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  occupation text,
  context text,
  learning_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

create policy "user_profile_select_own"
  on public.user_profile for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_profile_update_own"
  on public.user_profile for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profile (user_id, role)
  values (new.id, 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing auth users (e.g. before this migration) get a profile row
insert into public.user_profile (user_id, role)
select id, 'student'
from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Convert ownership columns from text (mock ids) to uuid — clears incompatible rows
-- ---------------------------------------------------------------------------
truncate table public.comment_ai_response cascade;
truncate table public.comment cascade;
truncate table public.highlight cascade;
truncate table public.quiz_attempt cascade;
truncate table public.lesson_item_progress cascade;
truncate table public.learner_progress cascade;

alter table public.learner_progress
  alter column user_id type uuid using user_id::uuid;

alter table public.highlight
  alter column created_by_user_id type uuid using created_by_user_id::uuid;

alter table public.comment
  alter column created_by_user_id type uuid using created_by_user_id::uuid;

-- ---------------------------------------------------------------------------
-- Drop prototype permissive policies
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array ARRAY[
    'domain',
    'category',
    'topic',
    'content_item',
    'content_version',
    'lesson_plan',
    'lesson_plan_version',
    'lesson_plan_item',
    'learner_progress',
    'lesson_item_progress',
    'quiz_attempt',
    'highlight',
    'comment',
    'comment_ai_response',
    'quiz_question'
  ]
  loop
    execute format(
      'drop policy if exists "learn001_allow_all_anon" on public.%I',
      t
    );
    execute format(
      'drop policy if exists "learn001_allow_all_authenticated" on public.%I',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Public catalog (read-only for anon + authenticated)
-- ---------------------------------------------------------------------------
create policy "domain_select_all"
  on public.domain for select to anon, authenticated using (true);

create policy "category_select_all"
  on public.category for select to anon, authenticated using (true);

create policy "topic_select_all"
  on public.topic for select to anon, authenticated using (true);

create policy "content_item_select_all"
  on public.content_item for select to anon, authenticated using (true);

create policy "content_version_select_all"
  on public.content_version for select to anon, authenticated using (true);

create policy "lesson_plan_select_all"
  on public.lesson_plan for select to anon, authenticated using (true);

create policy "lesson_plan_version_select_all"
  on public.lesson_plan_version for select to anon, authenticated using (true);

create policy "lesson_plan_item_select_all"
  on public.lesson_plan_item for select to anon, authenticated using (true);

create policy "quiz_question_select_auth"
  on public.quiz_question for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Learner progress (own rows only)
-- ---------------------------------------------------------------------------
create policy "learner_progress_select_own"
  on public.learner_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy "learner_progress_insert_own"
  on public.learner_progress for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "learner_progress_update_own"
  on public.learner_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "learner_progress_delete_own"
  on public.learner_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Lesson item progress (via learner_progress)
-- ---------------------------------------------------------------------------
create policy "lip_select_own"
  on public.lesson_item_progress for select to authenticated
  using (
    exists (
      select 1 from public.learner_progress lp
      where lp.id = lesson_item_progress.learner_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "lip_insert_own"
  on public.lesson_item_progress for insert to authenticated
  with check (
    exists (
      select 1 from public.learner_progress lp
      where lp.id = lesson_item_progress.learner_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "lip_update_own"
  on public.lesson_item_progress for update to authenticated
  using (
    exists (
      select 1 from public.learner_progress lp
      where lp.id = lesson_item_progress.learner_progress_id
        and lp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.learner_progress lp
      where lp.id = lesson_item_progress.learner_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "lip_delete_own"
  on public.lesson_item_progress for delete to authenticated
  using (
    exists (
      select 1 from public.learner_progress lp
      where lp.id = lesson_item_progress.learner_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Quiz attempts (via progress chain)
-- ---------------------------------------------------------------------------
create policy "quiz_attempt_select_own"
  on public.quiz_attempt for select to authenticated
  using (
    exists (
      select 1 from public.lesson_item_progress lip
      join public.learner_progress lp on lp.id = lip.learner_progress_id
      where lip.id = quiz_attempt.lesson_item_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "quiz_attempt_insert_own"
  on public.quiz_attempt for insert to authenticated
  with check (
    exists (
      select 1 from public.lesson_item_progress lip
      join public.learner_progress lp on lp.id = lip.learner_progress_id
      where lip.id = quiz_attempt.lesson_item_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "quiz_attempt_update_own"
  on public.quiz_attempt for update to authenticated
  using (
    exists (
      select 1 from public.lesson_item_progress lip
      join public.learner_progress lp on lp.id = lip.learner_progress_id
      where lip.id = quiz_attempt.lesson_item_progress_id
        and lp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.lesson_item_progress lip
      join public.learner_progress lp on lp.id = lip.learner_progress_id
      where lip.id = quiz_attempt.lesson_item_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

create policy "quiz_attempt_delete_own"
  on public.quiz_attempt for delete to authenticated
  using (
    exists (
      select 1 from public.lesson_item_progress lip
      join public.learner_progress lp on lp.id = lip.learner_progress_id
      where lip.id = quiz_attempt.lesson_item_progress_id
        and lp.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Highlights & comments
-- ---------------------------------------------------------------------------
create policy "highlight_select_own"
  on public.highlight for select to authenticated
  using (created_by_user_id = (select auth.uid()));

create policy "highlight_insert_own"
  on public.highlight for insert to authenticated
  with check (created_by_user_id = (select auth.uid()));

create policy "highlight_update_own"
  on public.highlight for update to authenticated
  using (created_by_user_id = (select auth.uid()))
  with check (created_by_user_id = (select auth.uid()));

create policy "highlight_delete_own"
  on public.highlight for delete to authenticated
  using (created_by_user_id = (select auth.uid()));

create policy "comment_select_own"
  on public.comment for select to authenticated
  using (created_by_user_id = (select auth.uid()));

create policy "comment_insert_own"
  on public.comment for insert to authenticated
  with check (created_by_user_id = (select auth.uid()));

create policy "comment_update_own"
  on public.comment for update to authenticated
  using (created_by_user_id = (select auth.uid()))
  with check (created_by_user_id = (select auth.uid()));

create policy "comment_delete_own"
  on public.comment for delete to authenticated
  using (created_by_user_id = (select auth.uid()));

-- AI replies: readable when parent comment is yours; writes only via service role
create policy "comment_ai_response_select_own"
  on public.comment_ai_response for select to authenticated
  using (
    exists (
      select 1 from public.comment c
      where c.id = comment_ai_response.comment_id
        and c.created_by_user_id = (select auth.uid())
    )
  );
