# learn-006 — Content versioning + addenda + plan regeneration

## Goal

Support content updates without breaking learner progress:

1. If a learner has already completed an article:
   - they should continue to view the version they completed
   - and see an “Addendum” (the new info) at the top
   - they should NOT be forced to retake quizzes
2. If a learner has NOT completed an article:
   - they should automatically view the latest article version
3. If the learner chooses “Regenerate lesson plan with latest updates”:
   - lesson plan advances to a new snapshot using latest content versions
   - quizzes for affected items are reset and re-taken

## Data model extensions (agent will implement)

### 1) Track superseding chain (recommended)

Add to `content_version` (migration):

- `supersedes_version_id uuid null`

When creating a new version for a `content_item`, set:

- `supersedes_version_id = previous_current_version_id` (if exists)

### 2) Determine addendum source (MVP)

For this prototype, keep the rule simple:

- If learner completed at version `V_completed` and `V_completed != content_item.current_version_id`:
  - show `addendum_markdown` from the *current latest version* (or the newest version with non-null `addendum_markdown`)

### 3) Regeneration behavior

MVP regeneration algorithm:

- Create a new `lesson_plan_version` snapshot:
  - same `lesson_plan_id`
  - recompute each `lesson_plan_item.effective_content_version_id` using `content_item.current_version_id`
- Update the learner’s active `learner_progress.lesson_plan_version_id` to the new snapshot.
- For regeneration, reset:
  - `lesson_item_progress.article_status` back to `pending` for lesson items whose effective content version changed
  - delete or mark old `quiz_attempt` rows for reset items (agent decides based on schema convenience)

## Implementation steps (agent will execute)

### 1) Addendum UI in the reader

In the article reader (the view in `learn-004`):

- When rendering for a lesson item, determine:
  - `completed_content_version_id` from `lesson_item_progress` (if completed)
  - `latest_version_id` from `content_item.current_version_id`

Render logic:

1. If `lesson_item_progress.article_status` != `completed`:
   - render `latest_version_id` content.
   - do not show addendum banner.
2. If completed:
   - render the completed version’s rich content.
   - if `latest_version_id` differs:
     - show an “Addendum” section at the top containing:
       - `content_version.addendum_markdown` from the latest version (or newest addendum)

### 2) “Regenerate lesson plan” button

On the lesson header page (`/lessons/[lessonPlanVersionId]`):

- Show a button only when at least one completed item has a newer addendum version available.
- On click:
  - call a server action to:
    1. create a new `lesson_plan_version`
    2. update learner_progress snapshot
    3. reset quiz/items where effective content version changed
  - navigate user back to the regenerated active lesson view.

### 3) Seed an example update

Update seeds so you can demo behavior:

- For one of the seeded `content_item`s, insert:
  - `content_version` v1 (without/with minimal addendum)
  - `content_version` v2 with non-null `addendum_markdown`
- Set `content_item.current_version_id` to v2.

Now the agent will be able to show:

- If the user completed the article “before update”, they see v1 + addendum.
- If they haven’t completed, they see v2 automatically.

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual scenario test (must be reproducible):
   - Start lesson
   - Complete a step (quiz pass) for an article that has content v2 with addendum
   - Verify the reader shows the version the user completed (v1) AND shows the addendum banner text
   - Navigate away and reload: behavior must persist after refresh
3. Regeneration test:
   - Click “Regenerate lesson plan with latest updates”
   - Verify:
     - the affected step(s) reset to quiz/pending state
     - the reader now renders the latest content version
4. DB spot-check:
   - `content_item.current_version_id` points to v2
   - `lesson_item_progress.completed_content_version_id` remains v1 after completion

## Human acceptance criteria

1. Completed articles:
   - still show the content the learner completed (not silently replaced)
   - show an addendum at the top reflecting the new update
2. Incomplete articles:
   - automatically show the latest version
3. Regenerate action:
   - resets only the quiz/steps affected by content version changes
   - allows the learner to retake quizzes and complete again

