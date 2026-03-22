-- =============================================================================
-- CURRICULUM ONLY — paste in Supabase SQL Editor
-- =============================================================================
-- Prerequisites: migrations 20260320120000 through 20260320160000 already
-- applied. Table public.lesson_plan_item MUST still have columns:
--   content_item_id, effective_content_version_id
-- If those columns are already gone, this script has already run — do NOT paste.
--
-- Source of truth (keep in sync): migrations/20260322100000_lesson_reading_curriculum.sql
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
