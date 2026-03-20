# learn-001 — Supabase schema + seed data

## Goal

Create the database schema required to support:

- Library taxonomy: domain → category → topic → articles/videos
- Content versioning: store immutable article versions + addenda metadata
- Lesson plan: curriculum snapshot (ordered content references)
- Learner progress: enrollments, quiz attempts, completion state
- Reader features: highlights + comments scoped to article version and character ranges

Auth/roles are mocked in the app for now; this phase focuses on correctness of tables/relationships.

## Supabase project wiring

**Fastest path (hosted only):** paste `supabase/paste-in-supabase-sql-editor.sql` into the Supabase **SQL Editor** and run once. That file is the full learn-001 schema + seed (same as `migrations/` + `seed.sql` combined).

Optional CLI layout in `supabase/` (for teams that use `supabase link` / `db push` later):

- `supabase init` (already done in this repo)
- Remote: `supabase link` then `supabase db push` if you prefer migrations over paste

## Database design (required tables)

Use UUID primary keys, `created_at timestamptz default now()`, and `updated_at timestamptz` where appropriate.

### Taxonomy

1. `domain`
   - `id uuid pk`
   - `name text` (e.g. `technical`, `agent`)
   - `slug text unique`
   - `sort_order int`

2. `category`
   - `id uuid pk`
   - `domain_id uuid fk -> domain(id)`
   - `name text`, `slug text`, `sort_order int`

3. `topic`
   - `id uuid pk`
   - `category_id uuid fk -> category(id)`
   - `name text`, `slug text`, `sort_order int`

### Content (articles/videos)

4. `content_item`
   - `id uuid pk`
   - `topic_id uuid fk -> topic(id)`
   - `content_type text` (e.g. `article`, `video`)
   - `title text`
   - `slug text`
   - `current_version_id uuid` (points at the latest version)
   - `sort_order int`

5. `content_version`
   - `id uuid pk`
   - `content_item_id uuid fk`
   - `version_number int`
   - `is_latest boolean`
   - `content_rich_json jsonb` (TipTap/ProseMirror doc JSON for the version)
   - `plain_text text` (must match what the editor produces for highlight offsets)
   - `published_at timestamptz`
   - `addendum_markdown text null` (new-version-only addendum to show to completed learners)

   Required constraints:
   - unique `(content_item_id, version_number)`

### Lesson plans

6. `lesson_plan`
   - `id uuid pk`
   - `domain_id uuid fk`
   - `title text`
   - `description text null`
   - `sort_order int`

7. `lesson_plan_version`
   - `id uuid pk`
   - `lesson_plan_id uuid fk`
   - `version_number int`
   - `source_timestamp timestamptz`
   - `is_active boolean`

8. `lesson_plan_item`
   - `id uuid pk`
   - `lesson_plan_version_id uuid fk`
   - `sequence int`
   - `content_item_id uuid fk`
   - `effective_content_version_id uuid` (the version snapshot used for this lesson plan run)
   - `requires_quiz boolean default true`

### Learner progress (mock user id will be used by the app)

9. `learner_progress`
   - `id uuid pk`
   - `user_id uuid/text` (for now: store mock user id as `text`; later we map to `auth.users`)
   - `lesson_plan_version_id uuid fk`
   - `status text` (`active`, `completed`)
   - `started_at timestamptz`
   - `completed_at timestamptz null`

10. `lesson_item_progress`
   - `id uuid pk`
   - `learner_progress_id uuid fk`
   - `lesson_plan_item_id uuid fk`
   - `article_status text` (`pending`, `in_progress`, `completed`)
   - `completed_at timestamptz null`
   - `completed_content_version_id uuid null` (the specific content version the learner completed)

### Quiz + completion

11. `quiz_attempt`
   - `id uuid pk`
   - `lesson_item_progress_id uuid fk`
   - `score int`
   - `max_score int`
   - `status text` (`in_progress`, `submitted`, `passed`, `failed`)
   - `submitted_at timestamptz null`
   - `answers jsonb null`

### Highlights + comments

12. `highlight`
   - `id uuid pk`
   - `content_version_id uuid fk`
   - `plain_text_start int`
   - `plain_text_end int` (exclusive)
   - `created_by_user_id text` (mock user id)
   - `created_at timestamptz default now()`

13. `comment`
   - `id uuid pk`
   - `content_version_id uuid fk`
   - `highlight_id uuid null fk`
   - `created_by_user_id text`
   - `body text`
   - `parent_comment_id uuid null fk` (threading)
   - `created_at timestamptz default now()`

14. `comment_ai_response`
   - `id uuid pk`
   - `comment_id uuid fk`
   - `provider text`
   - `body text`
   - `created_at timestamptz default now()`
   - `model text null`

## RLS strategy for early phases

To keep early prototype fast:

- The agent may initially disable RLS for these tables in migrations OR set permissive policies for service-role usage.
- In `learn-008`, the agent will enable RLS and lock policies down to `auth.uid()`.

## Seed data requirements (minimum)

Seed enough to demo the full flow later:

1. Domain/category/topic taxonomy:
   - `technical` → `databases` → `postgres_basics`
   - `agent` → `prompting` → `LLM_reasoning`

2. 3 content items (articles):
   - JS basics (agent)
   - Postgres concepts (technical)
   - “Build a product” (agent/technical bridge)

3. Each content item needs:
   - at least 1 `content_version`
   - set `current_version_id`

4. A single `lesson_plan` with:
   - one `lesson_plan_version`
   - 3 `lesson_plan_items` referencing the seeded content versions

## Agent verification

The agent will:

1. Run migrations and confirm tables exist:
   - `cd supabase && supabase db reset` (or `supabase migration up` if you prefer)
2. Verify seed succeeded:
   - a simple `select count(*)` per key table (or a seed verification script)
3. Confirm `content_version.plain_text` is non-empty for all seeded versions.
4. Provide a small “DB smoke endpoint” in Next that fetches:
   - taxonomy tree (domains/categories/topics)
   - library list for one topic
   - lesson plan item order

## Human acceptance criteria

1. In Supabase dashboard, tables `domain`, `category`, `topic`, `content_item`, `content_version`, `lesson_plan`, `lesson_plan_version`, `lesson_plan_item`, and progress tables exist.
2. Seed data is present (you can search for seeded content titles).
3. `content_item.current_version_id` points to a valid `content_version`.
4. `content_version.plain_text` is populated and consistent (it should be suitable for highlight offsets later).

