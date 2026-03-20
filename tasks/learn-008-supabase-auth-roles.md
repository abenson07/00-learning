# learn-008 — Supabase Auth + teacher/student roles + RLS

## Goal

Replace mock roles/identity with Supabase Auth:

- Users sign up / log in via Supabase Auth.
- Role (`teacher` vs `student`) is derived from DB profile (not from mock).
- Row-level security (RLS) enforces:
  - highlights/comments/progress are only readable/writable by the owning user
  - public content remains readable as intended

After this phase, the prototype should behave correctly for multiple real users.

## Data model changes (agent will implement migrations)

### 1) Create `user_profile` (or extend existing)

Add a table:

- `user_profile`
  - `user_id uuid pk` (references `auth.users(id)`)
  - `role text` (`teacher` | `student`)
  - `occupation text null` (can reuse from `learner_profile` if already added)
  - `context text null`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

Consolidation note:

- If `learner_profile` already exists from `learn-007`, agent can either:
  - reuse it as `user_profile` (rename + adjust columns), or
  - keep both but prefer one as source of truth.

### 2) Update ownership columns to `uuid`

For tables created in `learn-001`, update:

- `created_by_user_id` / `user_id` types from `text` to `uuid` where possible

Tables affected:

- `learner_progress`
- `lesson_item_progress` (indirectly via learner_progress)
- `highlight`
- `comment`

## Implementation steps (agent will execute)

### 1) Supabase Auth in the web app

Add:

- login/logout UI (route: `/login`)
- a simple auth guard for `/lessons` and reader pages

Session integration:

- Use `@supabase/supabase-js` with `SUPABASE_ANON_KEY` in the browser.
- On protected pages:
  - fetch current user session
  - load `user_profile.role`

### 2) Role-based UI gating

Prototype gating:

- `teacher` can see a “Teacher mode” badge and (optional) an admin shortcut.
- `student` gets the learning flow UI.

If you want to keep teacher features minimal for MVP:

- only change UI labels/badges; lesson creation stays out of scope until later.

### 3) RLS policies (required)

Enable RLS for user-owned tables:

- `learner_progress`
- `lesson_item_progress`
- `highlight`
- `comment`
- `comment_ai_response`
- `quiz_attempt`

Policy intent (exact SQL will be implemented by the agent):

- `learner_progress`:
  - `select/insert/update` only where `learner_progress.user_id = auth.uid()`
- `highlight`:
  - `select/insert/update` only where `highlight.created_by_user_id = auth.uid()`
- `comment`:
  - `select/insert/update` only where `comment.created_by_user_id = auth.uid()`
- `comment_ai_response`:
  - can be readable if parent comment is readable
  - inserts only from server (service role) or via a restricted RPC
- quiz/progress similarly.

Public content tables:

- `domain`, `category`, `topic`, `content_item`, `content_version`, `lesson_plan`, etc.
- Decide which are public vs protected (prototype likely public read for library browsing).

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual multi-user smoke test:
   - Create two accounts (User A and User B).
   - User A creates a highlight/comment and completes part of a lesson.
   - User B:
     - can browse library/content
     - cannot see User A’s highlights/comments/progress (hard block or empty results)
3. Teacher/student role test:
   - Ensure role is loaded from `user_profile.role`.
   - Ensure teacher/student UI differences appear correctly.

## Human acceptance criteria

1. Authentication:
   - user can log in and log out successfully.
2. Isolation:
   - user-owned data (highlights/comments/progress/quiz attempts) does not leak across users.
3. Roles:
   - teacher/student role is correct and visible in the UI.
4. No secrets exposure:
   - verify `SUPABASE_SERVICE_ROLE_KEY` is never present in client code bundles.

