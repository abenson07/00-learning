# Lesson plan curriculum model — implementation plan

## Context

Lesson plans are ordered **syllabi**: each **lesson** (`lesson_plan_item`) has one or more **readings** (`lesson_reading`) pointing at library **articles** (`content_item` / `content_version`). Plan- and lesson-level goals and tools are stored on `lesson_plan` and `lesson_plan_item`. Per-reading progress lives in `lesson_reading_progress`. Legacy per-step quiz UI is replaced by placeholders; quiz server actions and `quiz_question` regeneration remain for a future lesson quiz feature.

## What was implemented

- **Migration** [`supabase/migrations/20260322100000_lesson_reading_curriculum.sql`](../../../supabase/migrations/20260322100000_lesson_reading_curriculum.sql): single **new** timestamped file for this feature (older migrations in `supabase/migrations/` were not rewritten). Adds `lesson_reading`, `lesson_reading_progress`, plan/lesson metadata columns; backfill; drops `content_item_id` / `effective_content_version_id` from `lesson_plan_item`. **No new RLS** on these tables. **Dashboard paste bundles:** [`supabase/paste-curriculum-only-supabase-editor.sql`](../../../supabase/paste-curriculum-only-supabase-editor.sql) (existing DB) and [`supabase/paste-full-schema-supabase-editor.sql`](../../../supabase/paste-full-schema-supabase-editor.sql) (empty DB).
- **Data layer** [`web/src/lib/lesson-data.ts`](../../../web/src/lib/lesson-data.ts) and **client-safe model** [`web/src/lib/lesson-learner-model.ts`](../../../web/src/lib/lesson-learner-model.ts): nested lessons + readings, canonical “next reading”, prerequisite banner helpers.
- **Actions** [`web/src/app/lessons/actions.ts`](../../../web/src/app/lessons/actions.ts): `ensureLearnerProgressAction` seeds `lesson_reading_progress`; `markReadingCompletedAction` enforces global reading order; `regenerateLessonPlanWithLatestAction` clones readings and remaps or resets progress; `submitQuizAttemptAction` updated for readings when quiz returns.
- **UI** [`web/src/app/lessons/[lessonPlanVersionId]/lesson-plan-experience.tsx`](../../../web/src/app/lessons/[lessonPlanVersionId]/lesson-plan-experience.tsx): syllabus, plan goal, tools (plan + aggregated), free navigation with **out-of-order banner**, **GSAP** banner animation, quiz/homework placeholder cards.
- **Seed** [`supabase/seed.sql`](../../../supabase/seed.sql): insert-only demo for empty DBs. **Reset + full demo for QA:** [`supabase/seed-demo-lesson-curriculum-ui.sql`](../../../supabase/seed-demo-lesson-curriculum-ui.sql) (delete demo UUIDs, reinsert plan/lesson goals, tools, readings, quiz rows; ends with verification `SELECT`s).

## Tests to run

| When | Command | Expected |
|------|---------|----------|
| After code changes | `cd web && npm run lint` | Exit code `0` |
| Before merge | `cd web && npm run build` | Build succeeds |

## Human setup and manual verification

Prerequisites and manual checks live in **[human-dependencies.md](./human-dependencies.md)** (human dependencies and acceptance criteria). Apply the new Supabase migration and refresh seed data before verifying the lesson UI against a real project.
