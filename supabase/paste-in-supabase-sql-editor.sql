-- =============================================================================
-- learn-001: full setup for hosted Supabase (no CLI required)
-- =============================================================================
-- Where: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Use on a fresh project OR after you drop the learn-001 tables. Re-running
-- the CREATE TABLE section will error on "already exists".
--
-- If you already have empty tables: skip to `seed.sql` (or the "--- Seed ---" section
-- below) and run only that. If seed partially ran, run `clear-learn001-data.sql` then `seed.sql`.
--
-- Same content as: migrations/20260320120000_initial_schema.sql
--   + 20260320140000_quiz_question.sql + seed.sql
-- =============================================================================

-- --- Schema -----------------------------------------------------------------

-- learn-001: core schema for learning platform (taxonomy, content, lessons, progress, reader)

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
alter table public.quiz_question enable row level security;
alter table public.highlight enable row level security;
alter table public.comment enable row level security;
alter table public.comment_ai_response enable row level security;

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
    'quiz_question',
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

-- --- Seed -------------------------------------------------------------------

insert into public.domain (id, name, slug, sort_order) values
  ('b1111111-1111-4111-8111-111111111101', 'technical', 'technical', 1),
  ('b1111111-1111-4111-8111-111111111102', 'agent', 'agent', 2);

insert into public.category (id, domain_id, name, slug, sort_order) values
  ('b2222222-2222-4222-8222-222222222201', 'b1111111-1111-4111-8111-111111111101', 'databases', 'databases', 1),
  ('b2222222-2222-4222-8222-222222222202', 'b1111111-1111-4111-8111-111111111102', 'prompting', 'prompting', 1);

insert into public.topic (id, category_id, name, slug, sort_order) values
  ('b3333333-3333-4333-8333-333333333301', 'b2222222-2222-4222-8222-222222222201', 'postgres_basics', 'postgres_basics', 1),
  ('b3333333-3333-4333-8333-333333333302', 'b2222222-2222-4222-8222-222222222202', 'LLM_reasoning', 'LLM_reasoning', 1);

insert into public.content_item (id, topic_id, content_type, title, slug, sort_order, current_version_id) values
  ('b4444444-4444-4444-8444-444444444401', 'b3333333-3333-4333-8333-333333333301', 'article', 'Postgres concepts for builders', 'postgres-concepts', 1, null),
  ('b4444444-4444-4444-8444-444444444402', 'b3333333-3333-4333-8333-333333333302', 'article', 'JavaScript basics for agent tooling', 'js-basics-agents', 1, null),
  ('b4444444-4444-4444-8444-444444444403', 'b3333333-3333-4333-8333-333333333302', 'article', 'Build a product: agents + persistence', 'build-a-product-bridge', 2, null);

insert into public.content_version (id, content_item_id, version_number, is_latest, content_rich_json, plain_text, published_at, addendum_markdown) values
  (
    'b7777777-7777-4777-8777-777777777701',
    'b4444444-4444-4444-8444-444444444401',
    1,
    true,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Postgres is a relational database. This lesson covers rows, tables, and basic SQL."}]}]}'::jsonb,
    'Postgres is a relational database. This lesson covers rows, tables, and basic SQL.',
    now(),
    null
  ),
  (
    'b7777777-7777-4777-8777-777777777702',
    'b4444444-4444-4444-8444-444444444402',
    1,
    true,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"JavaScript runs in the browser and on the server. Variables, functions, and async patterns matter for agent tooling."}]}]}'::jsonb,
    'JavaScript runs in the browser and on the server. Variables, functions, and async patterns matter for agent tooling.',
    now(),
    null
  ),
  (
    'b7777777-7777-4777-8777-777777777703',
    'b4444444-4444-4444-8444-444444444403',
    1,
    true,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Building a product means connecting UI, APIs, and persistence. You will apply both agent workflows and database design."}]}]}'::jsonb,
    'Building a product means connecting UI, APIs, and persistence. You will apply both agent workflows and database design.',
    now(),
    null
  );

update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777701' where id = 'b4444444-4444-4444-8444-444444444401';
update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777702' where id = 'b4444444-4444-4444-8444-444444444402';
update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777703' where id = 'b4444444-4444-4444-8444-444444444403';

insert into public.lesson_plan (id, domain_id, title, description, sort_order) values
  (
    'b5555555-5555-4555-8555-555555555501',
    'b1111111-1111-4111-8111-111111111101',
    'Full-stack literacy path',
    'Database fundamentals, JS for agents, then a bridge exercise.',
    1
  );

insert into public.lesson_plan_version (id, lesson_plan_id, version_number, source_timestamp, is_active) values
  ('b6666666-6666-4666-8666-666666666601', 'b5555555-5555-4555-8555-555555555501', 1, now(), true);

insert into public.lesson_plan_item (id, lesson_plan_version_id, sequence, content_item_id, effective_content_version_id, requires_quiz) values
  ('b8888888-8888-4888-8888-888888888801', 'b6666666-6666-4666-8666-666666666601', 1, 'b4444444-4444-4444-8444-444444444401', 'b7777777-7777-4777-8777-777777777701', true),
  ('b8888888-8888-4888-8888-888888888802', 'b6666666-6666-4666-8666-666666666601', 2, 'b4444444-4444-4444-8444-444444444402', 'b7777777-7777-4777-8777-777777777702', true),
  ('b8888888-8888-4888-8888-888888888803', 'b6666666-6666-4666-8666-666666666601', 3, 'b4444444-4444-4444-8444-444444444403', 'b7777777-7777-4777-8777-777777777703', true);

insert into public.quiz_question (id, lesson_plan_item_id, question_index, question_text, choices, correct_choice_id, max_points) values
  (
    'ca111111-1111-4111-8111-111111111101',
    'b8888888-8888-4888-8888-888888888801',
    1,
    'Postgres is best described as which kind of database?',
    '[{"id":"a","label":"Relational (tables, rows, SQL)"},{"id":"b","label":"Document-only with no schema"},{"id":"c","label":"Pure time-series column store"},{"id":"d","label":"In-memory cache with no disk"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111111102',
    'b8888888-8888-4888-8888-888888888801',
    2,
    'In a relational table, what is the usual name for a single stored record?',
    '[{"id":"a","label":"A row"},{"id":"b","label":"A paragraph"},{"id":"c","label":"A branch"},{"id":"d","label":"A replica set"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111111103',
    'b8888888-8888-4888-8888-888888888801',
    3,
    'SQL is primarily used to…',
    '[{"id":"a","label":"Query and manipulate structured relational data"},{"id":"b","label":"Compile JavaScript to bytecode"},{"id":"c","label":"Render HTML in the browser"},{"id":"d","label":"Encrypt network traffic only"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111112101',
    'b8888888-8888-4888-8888-888888888802',
    1,
    'JavaScript can run in which environments (typical for builders)?',
    '[{"id":"a","label":"Browser and server (e.g. Node)"},{"id":"b","label":"Browser only, never on servers"},{"id":"c","label":"Only inside Postgres"},{"id":"d","label":"Only on GPUs"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111112102',
    'b8888888-8888-4888-8888-888888888802',
    2,
    'Which keyword declares a block-scoped variable in modern JS?',
    '[{"id":"a","label":"let (or const)"},{"id":"b","label":"goto"},{"id":"c","label":"def"},{"id":"d","label":"dim"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111112103',
    'b8888888-8888-4888-8888-888888888802',
    3,
    'Agent tooling often relies on async patterns; a common primitive is…',
    '[{"id":"a","label":"Promises / async-await"},{"id":"b","label":"Exclusive use of blocking sleep()"},{"id":"c","label":"Manual CPU polling only"},{"id":"d","label":"printf debugging only"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111113101',
    'b8888888-8888-4888-8888-888888888803',
    1,
    'Building a full product usually connects which layers?',
    '[{"id":"a","label":"UI, APIs, and persistence"},{"id":"b","label":"Only static HTML, no data"},{"id":"c","label":"Only spreadsheets"},{"id":"d","label":"Only DNS records"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111113102',
    'b8888888-8888-4888-8888-888888888803',
    2,
    'Durable agent workflows typically need…',
    '[{"id":"a","label":"Persistence (database or storage) for state"},{"id":"b","label":"No storage at all"},{"id":"c","label":"Only client RAM"},{"id":"d","label":"Random in-memory maps only"}]'::jsonb,
    'a',
    1
  ),
  (
    'ca111111-1111-4111-8111-111111113103',
    'b8888888-8888-4888-8888-888888888803',
    3,
    'This lesson path combines…',
    '[{"id":"a","label":"Agent-style workflows with database fundamentals"},{"id":"b","label":"Only print design"},{"id":"c","label":"Only operating system kernels"},{"id":"d","label":"Only spreadsheet formulas"}]'::jsonb,
    'a',
    1
  );
