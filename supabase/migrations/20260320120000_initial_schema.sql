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
