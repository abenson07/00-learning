-- =============================================================================
-- Demo seed: lesson curriculum UI (always fills plan goal, tools, lessons, readings)
-- =============================================================================
-- Prerequisites: all migrations through 20260322100000_lesson_reading_curriculum.sql.
-- Supabase → SQL Editor → paste entire file → Run.
--
-- This script DELETEs only rows keyed to the fixed UUIDs below, then INSERTs the
-- full demo again. Re-run anytime to reset the demo plan + articles (not your auth users).
-- =============================================================================

-- --- Demo primary keys (do not reuse these IDs for production data you care about) ---
-- lesson_plan:        b5555555-5555-4555-8555-555555555501
-- lesson_plan_version: b6666666-6666-4666-8666-666666666601
-- lesson_plan_items:  b8888888-8888-4888-8888-888888888801–803
-- lesson_readings:    b9999999-9999-4999-8999-999999999801–803

-- 1) Clear learner + quiz progress tied to this plan version
delete from public.lesson_reading_progress
where lesson_reading_id in (
  select lr.id
  from public.lesson_reading lr
  join public.lesson_plan_item lpi on lpi.id = lr.lesson_plan_item_id
  where lpi.lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
);

delete from public.quiz_attempt
where lesson_item_progress_id in (
  select lip.id
  from public.lesson_item_progress lip
  join public.lesson_plan_item lpi on lpi.id = lip.lesson_plan_item_id
  where lpi.lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
);

delete from public.lesson_item_progress
where lesson_plan_item_id in (
  select id from public.lesson_plan_item
  where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
);

delete from public.learner_progress
where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601';

-- 2) Clear quiz + curriculum rows for this plan version
delete from public.quiz_question
where lesson_plan_item_id in (
  select id from public.lesson_plan_item
  where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
);

delete from public.lesson_reading
where lesson_plan_item_id in (
  select id from public.lesson_plan_item
  where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
);

delete from public.lesson_plan_item
where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601';

delete from public.lesson_plan_version
where id = 'b6666666-6666-4666-8666-666666666601';

delete from public.lesson_plan
where id = 'b5555555-5555-4555-8555-555555555501';

-- 3) Clear reader artifacts + content for demo article versions
delete from public.comment_ai_response
where comment_id in (
  select id from public.comment
  where content_version_id in (
    'b7777777-7777-4777-8777-777777777701',
    'b7777777-7777-4777-8777-777777777711',
    'b7777777-7777-4777-8777-777777777702',
    'b7777777-7777-4777-8777-777777777703'
  )
);

delete from public.comment
where content_version_id in (
  'b7777777-7777-4777-8777-777777777701',
  'b7777777-7777-4777-8777-777777777711',
  'b7777777-7777-4777-8777-777777777702',
  'b7777777-7777-4777-8777-777777777703'
);

delete from public.highlight
where content_version_id in (
  'b7777777-7777-4777-8777-777777777701',
  'b7777777-7777-4777-8777-777777777711',
  'b7777777-7777-4777-8777-777777777702',
  'b7777777-7777-4777-8777-777777777703'
);

update public.content_item
set current_version_id = null
where id in (
  'b4444444-4444-4444-8444-444444444401',
  'b4444444-4444-4444-8444-444444444402',
  'b4444444-4444-4444-8444-444444444403'
);

delete from public.content_version
where id in (
  'b7777777-7777-4777-8777-777777777701',
  'b7777777-7777-4777-8777-777777777711',
  'b7777777-7777-4777-8777-777777777702',
  'b7777777-7777-4777-8777-777777777703'
);

delete from public.content_item
where id in (
  'b4444444-4444-4444-8444-444444444401',
  'b4444444-4444-4444-8444-444444444402',
  'b4444444-4444-4444-8444-444444444403'
);

delete from public.topic
where id in (
  'b3333333-3333-4333-8333-333333333301',
  'b3333333-3333-4333-8333-333333333302'
);

delete from public.category
where id in (
  'b2222222-2222-4222-8222-222222222201',
  'b2222222-2222-4222-8222-222222222202'
);

delete from public.domain
where id in (
  'b1111111-1111-4111-8111-111111111101',
  'b1111111-1111-4111-8111-111111111102'
);

-- 4) Insert full demo (plan goal + tools, lesson goals + tools, readings, quiz bank)

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

insert into public.content_version (id, content_item_id, version_number, is_latest, content_rich_json, plain_text, published_at, addendum_markdown, supersedes_version_id) values
  (
    'b7777777-7777-4777-8777-777777777701',
    'b4444444-4444-4444-8444-444444444401',
    1,
    false,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Postgres is a relational database. This lesson covers rows, tables, and basic SQL."}]}]}'::jsonb,
    'Postgres is a relational database. This lesson covers rows, tables, and basic SQL.',
    now(),
    null,
    null
  ),
  (
    'b7777777-7777-4777-8777-777777777711',
    'b4444444-4444-4444-8444-444444444401',
    2,
    true,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Postgres is a relational database. This lesson covers rows, tables, basic SQL, and why ACID transactions matter for real apps."}]}]}'::jsonb,
    'Postgres is a relational database. This lesson covers rows, tables, basic SQL, and why ACID transactions matter for real apps.',
    now(),
    '**Update:** We added coverage of **ACID transactions** (atomicity, consistency, isolation, durability). If you completed this article before this change, read this addendum and use “Regenerate lesson plan” when you want the full latest article body and fresh quizzes.',
    'b7777777-7777-4777-8777-777777777701'
  ),
  (
    'b7777777-7777-4777-8777-777777777702',
    'b4444444-4444-4444-8444-444444444402',
    1,
    true,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"JavaScript runs in the browser and on the server. Variables, functions, and async patterns matter for agent tooling."}]}]}'::jsonb,
    'JavaScript runs in the browser and on the server. Variables, functions, and async patterns matter for agent tooling.',
    now(),
    null,
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
    null,
    null
  );

update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777711' where id = 'b4444444-4444-4444-8444-444444444401';
update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777702' where id = 'b4444444-4444-4444-8444-444444444402';
update public.content_item set current_version_id = 'b7777777-7777-4777-8777-777777777703' where id = 'b4444444-4444-4444-8444-444444444403';

insert into public.lesson_plan (id, domain_id, title, description, sort_order, learning_goal, tools) values
  (
    'b5555555-5555-4555-8555-555555555501',
    'b1111111-1111-4111-8111-111111111101',
    'Full-stack literacy path',
    'Database fundamentals, JS for agents, then a bridge exercise.',
    1,
    'After this plan you can explain how relational data, JavaScript, and product persistence fit together when shipping agent-assisted software.',
    '["Code editor","Supabase project (optional)","Modern browser"]'::jsonb
  );

insert into public.lesson_plan_version (id, lesson_plan_id, version_number, source_timestamp, is_active) values
  ('b6666666-6666-4666-8666-666666666601', 'b5555555-5555-4555-8555-555555555501', 1, now(), true);

insert into public.lesson_plan_item (id, lesson_plan_version_id, sequence, requires_quiz, title, learning_goal, tools) values
  (
    'b8888888-8888-4888-8888-888888888801',
    'b6666666-6666-4666-8666-666666666601',
    1,
    false,
    'Postgres concepts for builders',
    'Describe tables, rows, and basic SQL for application data.',
    '["psql or any SQL client","ERD scratchpad (optional)"]'::jsonb
  ),
  (
    'b8888888-8888-4888-8888-888888888802',
    'b6666666-6666-4666-8666-666666666601',
    2,
    false,
    'JavaScript basics for agent tooling',
    'Recognize where JS runs and how async patterns support tooling.',
    '["Node.js LTS","Browser devtools"]'::jsonb
  ),
  (
    'b8888888-8888-4888-8888-888888888803',
    'b6666666-6666-4666-8666-666666666601',
    3,
    false,
    'Build a product: agents + persistence',
    'Connect UI, APIs, and durable storage in one mental model.',
    '["Git","API client (curl or similar)"]'::jsonb
  );

insert into public.lesson_reading (id, lesson_plan_item_id, reading_sequence, content_item_id, effective_content_version_id) values
  ('b9999999-9999-4999-8999-999999999801', 'b8888888-8888-4888-8888-888888888801', 1, 'b4444444-4444-4444-8444-444444444401', 'b7777777-7777-4777-8777-777777777701'),
  ('b9999999-9999-4999-8999-999999999802', 'b8888888-8888-4888-8888-888888888802', 1, 'b4444444-4444-4444-8444-444444444402', 'b7777777-7777-4777-8777-777777777702'),
  ('b9999999-9999-4999-8999-999999999803', 'b8888888-8888-4888-8888-888888888803', 1, 'b4444444-4444-4444-8444-444444444403', 'b7777777-7777-4777-8777-777777777703');

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

-- 5) Verification (expect: plan_goal_filled true, lessons 3, readings 3, tools_json not null)
select
  lp.title as plan_title,
  lp.learning_goal is not null and length(trim(lp.learning_goal)) > 0 as plan_goal_filled,
  lp.tools is not null as plan_tools_json_set
from public.lesson_plan lp
where lp.id = 'b5555555-5555-4555-8555-555555555501';

select count(*)::int as lesson_count
from public.lesson_plan_item
where lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601';
-- Expected: 3

select count(*)::int as reading_count from public.lesson_reading;
-- Expected: 3

select lpi.sequence, lpi.title, lpi.learning_goal is not null as lesson_has_goal
from public.lesson_plan_item lpi
where lpi.lesson_plan_version_id = 'b6666666-6666-4666-8666-666666666601'
order by lpi.sequence;
-- Expected: 3 rows, lesson_has_goal true each

-- Open this version in the app: /lessons/b6666666-6666-4666-8666-666666666601
