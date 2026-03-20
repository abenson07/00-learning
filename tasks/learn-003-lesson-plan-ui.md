# learn-003 — Lesson plan UI (progress + ordered articles)

## Goal

Implement the “lesson plan side” shell:

- Show lesson plan progression (where the learner is)
- Show lesson content in order (article list/steps)
- For now, quizzes and completion logic can be stubbed; real quiz mechanics come in `learn-005`
- Use mock user identity/role (real Supabase Auth deferred)

## Implementation steps (agent will execute these)

### 1) Routes

Create:

- `/lessons`
  - shows available lesson plans for the current role/domain (for now: just the seeded lesson plan)
  - button to “Start lesson” (creates/loads `learner_progress`)

- `/lessons/[lessonPlanVersionId]`
  - top section: progress header
    - current step index
    - list of steps with states (completed/in progress/pending)
  - bottom section: the lesson content area
    - shows the active article (link or embedded reader shell)
    - shows “Related articles” if available

### 2) Mock “learner_progress” handling

Even without real auth, we need a stable user id:

- Use mock user id from `MockUser` (created/selected on `/lessons`)
- Server reads/writes use:
  - `learner_progress.user_id` = mock user id

Prototype behavior:

- First time user clicks Start:
  - create `learner_progress` for the active `lesson_plan_version`
  - create `lesson_item_progress` rows for each `lesson_plan_item` in that version (state `pending`)
- Determine “active step”:
  - first `lesson_item_progress` with `article_status != completed`

### 3) Completion UI stub

In this phase:

- Provide a button on the active article view to “Mark article completed” (stub)
- It should set:
  - `lesson_item_progress.article_status = completed`
  - `completed_at = now()`
  - `completed_content_version_id` = currently effective version
- When all items are completed, set:
  - `learner_progress.status = completed`
  - `completed_at = now()`

Real quiz completion rules come in `learn-005`.

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual smoke checks:
   - `/lessons` loads and starts a lesson without errors.
   - lesson progression UI reflects DB state.
   - “Mark article completed” updates DB and the step state changes.
3. DB spot-check:
   - `learner_progress` has a row for the selected mock user id.
   - `lesson_item_progress` rows exist and update as you click the stub button.

## Human acceptance criteria

1. Clicking “Start lesson”:
   - creates a lesson progress record in Supabase.
   - shows step 1 as active.
2. Marking an article completed:
   - the completed step shows as completed in the UI.
   - the next step becomes active.
3. After completing all seeded steps:
   - the lesson header shows “Completed” (or equivalent state).

