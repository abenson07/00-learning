# learn-005 — Quizzes + lesson completion

## Goal

Add quizzes to each lesson plan item and link quiz completion to:

- marking each article step as completed
- marking the overall lesson plan as completed

This is where the “Completed lesson plan” state becomes real (previous phases used stubs).

## Data model changes (agent will implement migrations here)

Add quiz templates/questions.

Recommended MVP schema additions:

1. `quiz_question`
   - `id uuid pk`
   - `lesson_plan_item_id uuid fk`
   - `question_index int`
   - `question_text text`
   - `choices jsonb` (array of `{ id, label }`)
   - `correct_choice_id text` (or array for multi-correct later)
   - `max_points int default 1`

The existing table `quiz_attempt` (from `learn-001`) stores:

- `answers jsonb` (map from `question_id -> selected_choice_id`)
- `score`, `max_score`
- `status` passed/failed

## Implementation steps (agent will execute these)

### 1) Seed quizzes (required for demo)

Update seed logic in `learn-001` or add a migration + seed step in this phase to create:

- at least 3 multiple-choice questions for each seeded `lesson_plan_item`

### 2) Quiz UI

On the active lesson item page (`/lessons/[lessonPlanVersionId]`):

- show a “Quiz” panel (collapsible is fine)
- support:
  - start attempt (creates `quiz_attempt` status `in_progress`)
  - select answers
  - submit attempt

### 3) Scoring and state transitions

On submit:

1. Load quiz questions
2. Score:
   - `score = sum(question.max_points for correct answers)`
   - `max_score = sum(max_points)`
3. Determine passed/failed:
   - define a pass threshold (for MVP: `score == max_score` or `score/max_score >= 0.7`)
4. Update DB:
   - set `quiz_attempt.status` to `passed` or `failed`
   - if passed:
     - set `lesson_item_progress.article_status = completed`
     - set `completed_at = now()`
     - set `completed_content_version_id = effective_content_version_id`
   - if not passed:
     - leave article status as `in_progress` (or pending retry)

5. If all lesson items are completed:
   - set `learner_progress.status = completed`
   - set `completed_at = now()`

### 4) Replace the stub from `learn-003`

Remove or hide the “Mark article completed” stub button once quizzes are functional.

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual smoke checks:
   - start a lesson
   - open active item
   - quiz panel loads seeded questions
   - submit answers:
     - successful submission marks the step completed
     - lesson completion occurs after all items completed
3. DB spot-check:
   - `quiz_question` rows exist for each seeded lesson item
   - `quiz_attempt` created for attempt
   - `lesson_item_progress` transitions to completed on pass

## Human acceptance criteria

1. On the lesson page, there is a visible quiz for each step.
2. Submitting the seeded quiz correctly:
   - marks the step as completed
   - moves the active step forward
3. After completing all steps:
   - the lesson header shows completed state.

