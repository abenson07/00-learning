-- learn-001 seed ONLY (requires schema already applied — empty tables).
-- Supabase → SQL Editor: paste this whole file and Run.
-- After: domain should have 2 rows; content_item 3; content_version 3; lesson_plan 1.
-- If you get duplicate-key errors, run clear-learn001-data.sql first, then this file again.

-- Taxonomy (technical → databases → postgres_basics; agent → prompting → LLM_reasoning)
insert into public.domain (id, name, slug, sort_order) values
  ('b1111111-1111-4111-8111-111111111101', 'technical', 'technical', 1),
  ('b1111111-1111-4111-8111-111111111102', 'agent', 'agent', 2);

insert into public.category (id, domain_id, name, slug, sort_order) values
  ('b2222222-2222-4222-8222-222222222201', 'b1111111-1111-4111-8111-111111111101', 'databases', 'databases', 1),
  ('b2222222-2222-4222-8222-222222222202', 'b1111111-1111-4111-8111-111111111102', 'prompting', 'prompting', 1);

insert into public.topic (id, category_id, name, slug, sort_order) values
  ('b3333333-3333-4333-8333-333333333301', 'b2222222-2222-4222-8222-222222222201', 'postgres_basics', 'postgres_basics', 1),
  ('b3333333-3333-4333-8333-333333333302', 'b2222222-2222-4222-8222-222222222202', 'LLM_reasoning', 'LLM_reasoning', 1);

-- Content items (articles)
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

-- One lesson plan (active version) spanning the three seeded articles: Postgres → JS → Build
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
