# Human dependencies

## Before you start

The app expects Supabase schema at least through `20260322100000_lesson_reading_curriculum.sql`. New tables (`lesson_reading`, `lesson_reading_progress`) intentionally have **no Row Level Security** in this phase—use a private project or accept that API keys can read/write broadly until you add RLS for production.

---

# Supabase schema and seed

## Apply migrations

### What actually shipped for the curriculum feature

- **One new migration file** was added: [`supabase/migrations/20260322100000_lesson_reading_curriculum.sql`](../../../supabase/migrations/20260322100000_lesson_reading_curriculum.sql). That is the only SQL that *introduces* `lesson_reading`, `lesson_reading_progress`, plan/lesson goals/tools, and the drop of `content_item_id` / `effective_content_version_id` on `lesson_plan_item`.
- **Older files in `supabase/migrations/` were not rewritten** for this feature. In normal development you **append** a new timestamped migration; you do **not** replace the whole chain with “brand new” files every time—that would break every existing database and lose migration history. The list below is the **full chain** this repo expects, in order.

### Paste-only paths (Supabase Dashboard → SQL Editor)

Pick **one**:

| Your database | Open this file in the repo → copy **everything** → paste → Run once |
|---------------|------------------------------------------------------------------------|
| **Empty / new hosted project** (no tables yet) | [`supabase/paste-full-schema-supabase-editor.sql`](../../../supabase/paste-full-schema-supabase-editor.sql) — concatenation of all five migrations in order. |
| **Already ran learn-001 … learn-008** (`lesson_plan_item` still has `content_item_id` and `effective_content_version_id`) | [`supabase/paste-curriculum-only-supabase-editor.sql`](../../../supabase/paste-curriculum-only-supabase-editor.sql) — same SQL as the curriculum migration, with a header. **Do not** re-paste if those two columns are already gone. |

**Expected output:** Success in SQL Editor; no `ERROR:` lines. After curriculum SQL, `public.lesson_reading` and `public.lesson_reading_progress` exist; `lesson_plan_item` no longer has `content_item_id` / `effective_content_version_id`.

**If curriculum paste fails with `column "content_item_id" does not exist`:** It already ran. Stop.

**If full paste fails with `already exists`:** Your project is not empty; use the curriculum-only file instead, or only run the migration files you have not applied yet (see table below).

### Per-file order (if you refuse concatenated paste)

Same content as the big paste file, split for debugging. Paste **each file entirely**, run, then the next:

| Order | File |
|------:|------|
| 1 | [`supabase/migrations/20260320120000_initial_schema.sql`](../../../supabase/migrations/20260320120000_initial_schema.sql) |
| 2 | [`supabase/migrations/20260320140000_quiz_question.sql`](../../../supabase/migrations/20260320140000_quiz_question.sql) |
| 3 | [`supabase/migrations/20260320150000_content_version_supersedes.sql`](../../../supabase/migrations/20260320150000_content_version_supersedes.sql) |
| 4 | [`supabase/migrations/20260320160000_user_profile_uuid_rls.sql`](../../../supabase/migrations/20260320160000_user_profile_uuid_rls.sql) |
| 5 | [`supabase/migrations/20260322100000_lesson_reading_curriculum.sql`](../../../supabase/migrations/20260322100000_lesson_reading_curriculum.sql) |

### Supabase CLI (optional)

From repo root, linked project:

```bash
cd "/Users/alexbenson/Personal Builder Day/learning-platform" && npx supabase@latest db push
```

**Expected output:** Exit code `0`; pending migrations apply once each.

### Step 3: Confirm curriculum objects exist (SQL Editor)

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('lesson_reading', 'lesson_reading_progress')
order by table_name;
```

**Expected output:** Two rows: `lesson_reading`, `lesson_reading_progress`.

**If this fails:** File 5 did not apply; repeat Step 2 file 5 only on a database that still has `content_item_id` on `lesson_plan_item`.

### Step 4: Load demo data for lesson UI (required for manual QA)

Open Supabase **SQL Editor**, paste the entire file **[`supabase/seed-demo-lesson-curriculum-ui.sql`](../../../supabase/seed-demo-lesson-curriculum-ui.sql)**, and run **once**.

**What it does:** Deletes only rows tied to the fixed demo UUIDs in that file, then inserts **everything** the curriculum UI expects: domains → articles + versions → **lesson plan with non-null `learning_goal` and `tools` JSON** → three **lessons** each with **title**, **learning_goal**, **tools** → **three `lesson_reading` rows** → nine **`quiz_question` rows** (for when you turn quizzes back on). The script ends with `SELECT`s you can read for pass/fail.

**Expected output:** No `ERROR:` lines. Final verification queries show `plan_goal_filled = true`, `plan_tools_json_set = true`, `lesson_count = 3`, `reading_count = 3`, and three lessons with `lesson_has_goal = true`.

**Lesson URL to open:** `/lessons/b6666666-6666-4666-8666-666666666601` (active version id is printed at the bottom of the seed file as a comment).

**If this fails:** Foreign-key errors usually mean migrations are missing or out of order. Duplicate-key errors on insert after a partial run: run the **whole** file again from the top (it deletes demo rows first).

**Alternate (older):** [`supabase/seed.sql`](../../../supabase/seed.sql) is the same content shape but **insert-only**; use it only on an empty DB, not for reset.

---

# Local app

## Environment

### Step 1: Env vars + install + dev (always `web/`)

Dependencies for the Next app live in **`web/package.json`**, not the repo root. Run **`npm install` in `web/`** (first time or after pulling dependency changes). The root `package.json` has no app dependencies; installing only at the root will not populate what Next needs.

Ensure `web/.env.local` contains valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and any existing service role vars your app already uses for regeneration).

```bash
cd "/Users/alexbenson/Personal Builder Day/learning-platform/web"
npm install
npm run dev
```

**Expected output:** `npm install` exits `0`; `npm run dev` starts the dev server with no immediate crash.

**If `npm: command not found`:** Node/npm is missing or not on your `PATH` (reinstall Node LTS, or fix `nvm`/`fnm`, then open a new terminal). Check with `which node` and `which npm`.

**If the app crashes after boot:** Compare with a prior working `web/.env.local`; confirm keys match the Supabase project where migrations ran.

**Optional (repo root):** `cd …/learning-platform && npm run dev` runs the same `web` dev script via [`scripts/dev-from-root.mjs`](../../../scripts/dev-from-root.mjs), but you still need `web/node_modules` from **`npm install` inside `web/`**.

---

# Human acceptance criteria

Use this after migrations, **Step 4** (`seed-demo-lesson-curriculum-ui.sql`), and `cd web && npm run build` succeed. Log in as a learner (or the test user you already use).

---

# Syllabus and curriculum

## Lesson plan page

### Step 1: Open the demo lesson plan

**Action:** After running **`seed-demo-lesson-curriculum-ui.sql`**, open **`/lessons/b6666666-6666-4666-8666-666666666601`** (or use **Lessons** in the nav and choose **Full-stack literacy path**).

**Expected result:** **Plan goal** paragraph is visible (starts with “After this plan you can…”). **Tools** line lists merged plan + lesson tools. **Syllabus** shows three lessons: **Postgres concepts for builders**, **JavaScript basics for agent tooling**, **Build a product: agents + persistence**; expanding the active lesson shows three **readings** (one per lesson).

**Pass if:** Each lesson card shows its **lesson goal** text under the title; first reading titles match the three article titles above.

**Fail if:** Missing plan goal, missing tools line, fewer than three lessons, or no readings under a lesson.

### Step 2: Start the plan and complete readings in order

**Action:** Click **Start lesson plan**, read the first reading, click **Mark reading complete**; repeat for the next reading in sequence.

**Expected result:** Progress updates; after the last reading of a lesson, the lesson shows complete; after all lessons, completion message appears.

**Pass if:** You cannot mark a reading complete while the amber **Out of order** banner is shown for a future reading; the first incomplete reading never shows that banner when selected.

**Fail if:** You can mark a future reading complete without completing prior readings (server should reject; if it succeeds, file a bug).

### Step 3: Navigate ahead without completing

**Action:** Without finishing the current reading, click a later lesson/reading in the syllabus.

**Expected result:** Content still loads; an **Out of order** banner explains what to finish first; **Mark reading complete** is disabled for that reading until you catch up.

**Pass if:** Banner copy names the blocking reading and lesson.

**Fail if:** Navigation is blocked entirely or the banner never appears when skipping ahead.

---

# Placeholders and library

## Quiz and homework

### Step 1: Placeholder cards

**Action:** On an active reading, scroll below the article body.

**Expected result:** Two dashed cards: **Quiz** and **Homework**, each stating they are coming soon.

**Pass if:** No interactive quiz UI is shown on the article step.

**Fail if:** Legacy `LessonQuizPanel` is visible in the default flow.

## Article library unchanged

### Step 1: Library still works

**Action:** Open **Library** and an article `/articles/[id]`.

**Expected result:** Article reads as before; no requirement to attach quizzes at article level.

**Pass if:** No regression in library navigation.

**Fail if:** 500s or missing content tied to schema changes.

---

# Security note (RLS deferred)

### Step 1: Acknowledge exposure

**Action:** In Supabase **Table Editor**, confirm `lesson_reading` and `lesson_reading_progress` exist.

**Expected result:** Tables are readable/writable according to your existing project defaults (no new restrictive RLS on these tables from this feature).

**Pass if:** You understand this is acceptable only for private / single-user testing.

**Fail if:** You need multi-tenant isolation—add RLS in a follow-up before shipping to customers.
