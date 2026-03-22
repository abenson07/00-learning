-- =============================================================================
-- FULL SCHEMA PASTE — Supabase Dashboard → SQL Editor
-- =============================================================================
-- Use ONLY on an empty new project (or you intend to reset). This file is the
-- concatenation of every file in supabase/migrations/ in timestamp order.
-- It is NOT “all brand-new migrations” each time we ship a feature: we append
-- new timestamped files to migrations/; this paste file is regenerated when
-- you need one clipboard for a greenfield DB.
--
-- Already have the first four migrations applied? Do NOT run this whole file.
-- Paste ONLY supabase/migrations/20260322100000_lesson_reading_curriculum.sql
-- (or the copy in docs/features/.../human-dependencies.md).
-- =============================================================================

-- =============================================================================
-- FILE: 20260320120000_initial_schema.sql (paste order for empty hosted project — run as ONE script or in 5 steps)
-- =============================================================================

-- learn-001: core schema for learning platform (taxonomy, content, lessons, progress, reader)

-- Taxonomy
create table public.domain (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domain (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, slug)
);

create table public.topic (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.category (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

-- Content item first (current_version_id added after content_version exists)
create table public.content_item (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topic (id) on delete cascade,
  content_type text not null,
  title text not null,
  slug text not null,
  current_version_id uuid,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.content_version (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_item (id) on delete cascade,
  version_number int not null,
  is_latest boolean not null default false,
  content_rich_json jsonb not null default '{}'::jsonb,
  plain_text text not null,
  published_at timestamptz not null default now(),
  addendum_markdown text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_item_id, version_number)
);

alter table public.content_item
  add constraint content_item_current_version_fk
  foreign key (current_version_id) references public.content_version (id) on delete set null;

create index content_version_content_item_id_idx on public.content_version (content_item_id);

-- Lesson plans
create table public.lesson_plan (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domain (id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_plan_version (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plan (id) on delete cascade,
  version_number int not null,
  source_timestamp timestamptz not null default now(),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lesson_plan_id, version_number)
);

create table public.lesson_plan_item (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_version_id uuid not null references public.lesson_plan_version (id) on delete cascade,
  sequence int not null,
  content_item_id uuid not null references public.content_item (id) on delete restrict,
  effective_content_version_id uuid not null references public.content_version (id) on delete restrict,
  requires_quiz boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lesson_plan_version_id, sequence)
);

create index lesson_plan_item_version_idx on public.lesson_plan_item (lesson_plan_version_id);

-- Learner progress
create table public.learner_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lesson_plan_version_id uuid not null references public.lesson_plan_version (id) on delete cascade,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_item_progress (
  id uuid primary key default gen_random_uuid(),
  learner_progress_id uuid not null references public.learner_progress (id) on delete cascade,
  lesson_plan_item_id uuid not null references public.lesson_plan_item (id) on delete cascade,
  article_status text not null,
  completed_at timestamptz,
  completed_content_version_id uuid references public.content_version (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_progress_id, lesson_plan_item_id)
);

create table public.quiz_attempt (
  id uuid primary key default gen_random_uuid(),
  lesson_item_progress_id uuid not null references public.lesson_item_progress (id) on delete cascade,
  score int not null default 0,
  max_score int not null default 0,
  status text not null,
  submitted_at timestamptz,
  answers jsonb,
  created_at timestamptz not null default now()
);

-- Reader: highlights + comments
create table public.highlight (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.content_version (id) on delete cascade,
  plain_text_start int not null,
  plain_text_end int not null,
  created_by_user_id text not null,
  created_at timestamptz not null default now()
);

create index highlight_content_version_id_idx on public.highlight (content_version_id);

create table public.comment (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.content_version (id) on delete cascade,
  highlight_id uuid references public.highlight (id) on delete set null,
  created_by_user_id text not null,
  body text not null,
  parent_comment_id uuid references public.comment (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index comment_content_version_id_idx on public.comment (content_version_id);

create table public.comment_ai_response (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comment (id) on delete cascade,
  provider text not null,
  body text not null,
  created_at timestamptz not null default now(),
  model text
);

-- learn-001: RLS on with permissive anon/authenticated policies for prototype; learn-008 will tighten
alter table public.domain enable row level security;
alter table public.category enable row level security;
alter table public.topic enable row level security;
alter table public.content_item enable row level security;
alter table public.content_version enable row level security;
alter table public.lesson_plan enable row level security;
alter table public.lesson_plan_version enable row level security;
alter table public.lesson_plan_item enable row level security;
alter table public.learner_progress enable row level security;
alter table public.lesson_item_progress enable row level security;
alter table public.quiz_attempt enable row level security;
alter table public.highlight enable row level security;
alter table public.comment enable row level security;
alter table public.comment_ai_response enable row level security;

-- Permissive read/write for anon+authenticated during prototype (no auth.uid() yet)
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
    'comment_ai_response'
  ]
  loop
    execute format(
      'create policy "learn001_allow_all_anon" on public.%I for all to anon using (true) with check (true)',
      t
    );
    execute format(
      'create policy "learn001_allow_all_authenticated" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- =============================================================================
-- FILE: 20260320140000_quiz_question.sql (paste order for empty hosted project — run as ONE script or in 5 steps)
-- =============================================================================

-- learn-005: quiz templates per lesson plan item

create table public.quiz_question (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_item_id uuid not null references public.lesson_plan_item (id) on delete cascade,
  question_index int not null,
  question_text text not null,
  choices jsonb not null,
  correct_choice_id text not null,
  max_points int not null default 1,
  created_at timestamptz not null default now(),
  unique (lesson_plan_item_id, question_index)
);

create index quiz_question_lesson_plan_item_id_idx
  on public.quiz_question (lesson_plan_item_id);

alter table public.quiz_question enable row level security;

create policy "learn001_allow_all_anon" on public.quiz_question
  for all to anon using (true) with check (true);

create policy "learn001_allow_all_authenticated" on public.quiz_question
  for all to authenticated using (true) with check (true);

-- =============================================================================
-- FILE: 20260320150000_content_version_supersedes.sql (paste order for empty hosted project — run as ONE script or in 5 steps)
-- =============================================================================

-- learn-006: content version supersession chain (optional FK for tooling / future use)

alter table public.content_version
  add column supersedes_version_id uuid references public.content_version (id) on delete set null;

create index content_version_supersedes_version_id_idx
  on public.content_version (supersedes_version_id);

-- =============================================================================
-- FILE: 20260320160000_user_profile_uuid_rls.sql (paste order for empty hosted project — run as ONE script or in 5 steps)
-- =============================================================================

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

-- =============================================================================
-- FILE: 20260322100000_lesson_reading_curriculum.sql (paste order for empty hosted project — run as ONE script or in 5 steps)
-- =============================================================================

-- Curriculum model: lessons (lesson_plan_item) have many readings (lesson_reading).
-- Plan-level goals/tools; per-lesson goals/tools. No new RLS (single-user testing).

alter table public.lesson_plan
  add column if not exists learning_goal text,
  add column if not exists plan_kind text not null default 'standard',
  add column if not exists tools jsonb;

alter table public.lesson_plan_item
  add column if not exists title text,
  add column if not exists learning_goal text,
  add column if not exists tools jsonb;

create table public.lesson_reading (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_item_id uuid not null references public.lesson_plan_item (id) on delete cascade,
  reading_sequence int not null,
  content_item_id uuid not null references public.content_item (id) on delete restrict,
  effective_content_version_id uuid not null references public.content_version (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (lesson_plan_item_id, reading_sequence)
);

create index lesson_reading_item_idx on public.lesson_reading (lesson_plan_item_id);

create table public.lesson_reading_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_item_progress_id uuid not null references public.lesson_item_progress (id) on delete cascade,
  lesson_reading_id uuid not null references public.lesson_reading (id) on delete cascade,
  article_status text not null,
  completed_at timestamptz,
  completed_content_version_id uuid references public.content_version (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_item_progress_id, lesson_reading_id)
);

create index lesson_reading_progress_lip_idx
  on public.lesson_reading_progress (lesson_item_progress_id);

insert into public.lesson_reading (
  lesson_plan_item_id,
  reading_sequence,
  content_item_id,
  effective_content_version_id
)
select
  id,
  1,
  content_item_id,
  effective_content_version_id
from public.lesson_plan_item;

update public.lesson_plan_item lpi
set title = ci.title
from public.content_item ci
where ci.id = lpi.content_item_id
  and (lpi.title is null or trim(lpi.title) = '');

insert into public.lesson_reading_progress (
  lesson_item_progress_id,
  lesson_reading_id,
  article_status,
  completed_at,
  completed_content_version_id
)
select
  lip.id,
  lr.id,
  lip.article_status,
  lip.completed_at,
  lip.completed_content_version_id
from public.lesson_item_progress lip
join public.lesson_reading lr
  on lr.lesson_plan_item_id = lip.lesson_plan_item_id
  and lr.reading_sequence = 1;

alter table public.lesson_plan_item drop column content_item_id;
alter table public.lesson_plan_item drop column effective_content_version_id;
