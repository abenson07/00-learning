-- Quiz rows only (learn-005). Use when:
--   - `quiz_question` table exists (migration 20260320140000_quiz_question.sql applied), and
--   - You already ran the rest of `seed.sql` (lesson_plan_item ids match below), but
--   - `quiz_question` is empty (e.g. seed failed after lesson inserts, or you added the table later).
--
-- Safe to re-run: skips rows that already exist for the same (lesson_plan_item_id, question_index).
-- If your lesson_plan_item ids differ from the standard seed, this file will not apply — use SQL Editor
-- to insert rows with your actual `lesson_plan_item_id` values.

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
  )
on conflict (lesson_plan_item_id, question_index) do nothing;
