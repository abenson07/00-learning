# Human AC — learn-007 + learn-008 (single checklist)

Use this file as the **one source of truth** for testing personalization, reader AI, Supabase Auth, roles, and RLS. Work **top to bottom**. When something fails, stop, note the **step id** (e.g. **B2**), and fix env / DB / code before continuing.

**Original specs (background):** [learn-007-personalization-profiles.md](learn-007-personalization-profiles.md) · [learn-008-supabase-auth-roles.md](learn-008-supabase-auth-roles.md)

**Note:** The shipped app uses **`public.user_profile`** (linked to `auth.users`) for occupation/context/learning_style/role — not a separate `learner_profile` table.

---

## How to use this checklist

- Each step has **Status** (update when satisfied: e.g. `Not started`, `In progress`, `Done`, `N/A`, `Blocked — note`).
- Each step has **Action**, **Expected**, and often **If fail**.
- Optional **DB** steps run in Supabase → SQL Editor.
- **Links** point at files in this repo (paths relative to `learning-platform/`).

---

## A. Prerequisites (before any UI test)

### A1 — Environment variables (local)

**Status:** Done — Supabase vars confirmed; `OPENAI_API_KEY` intentionally deferred (skip / expect gaps on D2, D3, E* until added).

**Reference:** values live in [web/.env.local](web/.env.local) (do not commit real keys).

| Variable | Required for | If missing |
|----------|----------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase usage | App errors on load |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or your project’s anon/publishable key name) | Browser + server user client | Auth / queries fail |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: AI rows on comments, lesson plan regeneration | Comment AI + regen fail; **never** put in client code |
| `OPENAI_API_KEY` | Article chat + comment AI | Chat errors or no AI block under comments |

**Action:** Confirm those keys exist for the Supabase project you’re testing against.

**Expected:** `web` dev server starts without throwing missing-env for URL + publishable key.

---

### A2 — App build (quick sanity)

**Status:** Done — `npm run lint` + `npm run build` in `web` (exit 0); routes include `/login`, `/settings`, `/api/article-chat`.

**Action:**

```bash
cd web && pnpm lint && pnpm build
```

**Expected:** Exit code **0**; build lists routes including `/login`, `/settings`, `/api/article-chat`.

**If fail:** Fix lint/TS errors first; no point running browser AC.

---

### A3 — Database shape (optional but recommended)

**Status:** Done — `true` / `uuid` / `true` (matches repo migrations after repair).

**Repair used (if needed):** [supabase/paste-repair-160000-when-user-profile-exists.sql](supabase/paste-repair-160000-when-user-profile-exists.sql) — only when DB was previously `text` / missing `learner_progress_select_own`. Do **not** paste raw [20260320160000_user_profile_uuid_rls.sql](supabase/migrations/20260320160000_user_profile_uuid_rls.sql) if `user_profile` already exists (duplicate `CREATE TABLE`).

Run in **Supabase → SQL → New query**:

```sql
select
  to_regclass('public.user_profile') is not null as has_user_profile,
  (
    select data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'learner_progress'
      and column_name = 'user_id'
  ) as learner_progress_user_id_type,
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'learner_progress'
      and policyname = 'learner_progress_select_own'
  ) as has_learner_progress_select_own;
```

**Expected for “matches current repo migrations”:**

| Column | Expected |
|--------|----------|
| `has_user_profile` | `true` |
| `learner_progress_user_id_type` | `uuid` |
| `has_learner_progress_select_own` | `true` |

**If any differ:** Your database may be **partially** migrated. Do **not** blindly re-run [20260320160000_user_profile_uuid_rls.sql](supabase/migrations/20260320160000_user_profile_uuid_rls.sql) (it truncates data and can conflict if objects already exist). Pause at this step and plan a **repair** with the team.

**Migration order in repo (reference only):**

1. [supabase/migrations/20260320120000_initial_schema.sql](supabase/migrations/20260320120000_initial_schema.sql)  
2. [supabase/migrations/20260320140000_quiz_question.sql](supabase/migrations/20260320140000_quiz_question.sql)  
3. [supabase/migrations/20260320150000_content_version_supersedes.sql](supabase/migrations/20260320150000_content_version_supersedes.sql)  
4. [supabase/migrations/20260320160000_user_profile_uuid_rls.sql](supabase/migrations/20260320160000_user_profile_uuid_rls.sql)  

**Seed (optional):** [supabase/seed.sql](supabase/seed.sql)

---

## B. learn-008 — Authentication & guards

### B1 — Protected routes redirect when logged out

**Status:** Paused — auth gate removed for local UX; `/lessons` and `/settings` load without login (no `proxy.ts`). Re-introduce gate before shipping learn-008 AC.

**Action:** Open `/lessons` in a private window (or after **Log out**).

**Expected (when auth enforced):** Browser goes to `/login?next=/lessons` (or equivalent with `next=`).

**Implements (when re-enabled):** root `proxy.ts` or `middleware.ts` + `getAuthUser()` / login redirect pattern.

---

### B2 — Sign up / sign in

**Status:** Not started

**Action:** On `/login`, create an account or sign in (follow your project’s email confirmation rules).

**Expected:** After success, you land on the `next` path (default flow → lessons). Header shows **Log in** replaced by email + **Settings** + **Log out**.

**Implements:** [web/src/app/login/login-form.tsx](web/src/app/login/login-form.tsx), [web/src/components/auth-nav.tsx](web/src/components/auth-nav.tsx)

---

### B3 — Log out

**Status:** Not started

**Action:** Click **Log out**.

**Expected:** Redirect to home (or similar); `/lessons` again requires login (**B1**).

---

### B4 — `user_profile` row exists for your user

**Status:** Not started

**Action:** In SQL Editor (same project as the app):

```sql
select user_id, role, occupation, context
from public.user_profile
where user_id = auth.uid();
```

Run while **logged into Supabase dashboard** as yourself, **or** replace `auth.uid()` with your user UUID from **Authentication → Users**.

**Expected:** **One row**; `role` is `student` (unless you changed it later).

**Implements:** trigger + table in [supabase/migrations/20260320160000_user_profile_uuid_rls.sql](supabase/migrations/20260320160000_user_profile_uuid_rls.sql)

---

## C. learn-007 — Profile & Lessons UI

### C1 — Settings save + persist

**Status:** Not started

**Action:** Go to `/settings`. Set **Occupation** (e.g. `waiter`), **Context** (any sentence), optionally **Learning style**. Click **Save**. Hard refresh the page.

**Expected:** **Saved** appears after save; after refresh, fields still show the same values.

**Implements:** [web/src/app/settings/settings-form.tsx](web/src/app/settings/settings-form.tsx), [web/src/app/settings/actions.ts](web/src/app/settings/actions.ts)

---

### C2 — Lessons page shows profile summary

**Status:** Not started

**Action:** Open `/lessons` after **C1**.

**Expected:** A small summary (chip/text) reflecting occupation/context; if empty, a hint to fill Settings.

**Implements:** [web/src/app/lessons/page.tsx](web/src/app/lessons/page.tsx)

---

## D. learn-007 — Article reader: highlights, notes, AI comments

**Action:** Open any article, e.g. `/articles/<content_item_uuid>` (use an id from Library if needed).

### D1 — Highlight

**Status:** Not started

**Action:** Select text in the article body → confirm **Highlight** in the floating toolbar.

**Expected:** New item appears in the **Highlights** list in the sidebar.

**Implements:** [web/src/components/article-reader.tsx](web/src/components/article-reader.tsx), [web/src/app/articles/highlight-actions.ts](web/src/app/articles/highlight-actions.ts)

---

### D2 — Comment on highlight + optional AI reply

**Status:** Not started

**Action:** Click a highlight in the list so it’s **selected** (visually distinct). In **Notes & questions**, use **Comment on selected highlight**, submit.

**Expected:** New entry in the list; if `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are set, an **AI** subsection appears under your comment.

**Implements:** [web/src/app/articles/comment-actions.ts](web/src/app/articles/comment-actions.ts)

**If fail (comment saves, no AI):** Check server logs; typical causes: missing `OPENAI_API_KEY`, missing service role on server, or RLS blocking `comment_ai_response` read (should be allowed for your own comment).

---

### D3 — “Ask about the article” (no highlight)

**Status:** Not started

**Action:** Clear highlight selection (click same highlight again if toggles, or select none per UI). Use **Ask about the article**, submit.

**Expected:** New comment thread without “On highlight”; optional AI block as in **D2**.

---

### D4 — Persistence after refresh

**Status:** Not started

**Action:** Reload the article page.

**Expected:** Same highlights and comments (and AI text if it was there) still visible.

---

## E. learn-007 — Article chat (left panel)

### E1 — Chat without highlight

**Status:** Not started

**Action:** No highlight selected (or ignore selection). In **Article chat**, send a short question.

**Expected:** Assistant message streams in; no hard error in the panel.

**Implements:** [web/src/components/article-chat-panel.tsx](web/src/components/article-chat-panel.tsx), [web/src/app/api/article-chat/route.ts](web/src/app/api/article-chat/route.ts), [web/src/lib/ai/article-assistant.ts](web/src/lib/ai/article-assistant.ts)

---

### E2 — Chat with highlight selected

**Status:** Not started

**Action:** Select a highlight. Send a question that only makes sense for that excerpt.

**Expected:** Answer clearly ties to the excerpt (manual judgment). Panel subtitle indicates highlight-scoped mode.

---

### E3 — Profile affects tone (manual)

**Status:** Not started

**Action:** With occupation **waiter** in Settings, ask something that could use a concrete analogy (e.g. a database concept).

**Expected:** Reply includes at least one analogy or example that plausibly fits that occupation (wording not fixed; behavior should be **obviously** different from a generic answer).

---

## F. learn-008 — Multi-user isolation

### F1 — Second user does not see first user’s data

**Status:** Not started

**Action:** As **User A**, add a highlight + comment on an article and start or complete a lesson step so `learner_progress` exists. **Log out**. Sign in as **User B** (different email). Open the **same** article and `/lessons`.

**Expected:** User B sees **no** User A highlights/comments; lesson progress for B is separate (not A’s completed steps).

**Implements:** RLS in [supabase/migrations/20260320160000_user_profile_uuid_rls.sql](supabase/migrations/20260320160000_user_profile_uuid_rls.sql); app uses session user in [web/src/lib/auth/server.ts](web/src/lib/auth/server.ts)

---

## G. learn-008 — Teacher role in UI

### G1 — Promote to teacher in DB

**Status:** Not started

**Action:** In SQL (replace UUID):

```sql
update public.user_profile
set role = 'teacher'
where user_id = '<your-auth-user-uuid>';
```

**Expected:** `UPDATE 1`.

---

### G2 — Teacher mode visible

**Status:** Not started

**Action:** Reload `/settings` and `/lessons`.

**Expected:** **Teacher mode** badge (or label) appears on both.

**Implements:** [web/src/app/settings/settings-form.tsx](web/src/app/settings/settings-form.tsx), [web/src/app/lessons/page.tsx](web/src/app/lessons/page.tsx)

---

## H. learn-008 — Service role not in client bundle

### H1 — Grep production client chunks

**Status:** Not started

**Action:** After `pnpm build`, search under `web/.next` for the literal string `SUPABASE_SERVICE_ROLE_KEY`.

**Expected:** **No matches** in files that are clearly browser bundles (if your tool matches server chunks too, ignore paths under `server/` or verify only `static/chunks`).

**Implements:** service client only in [web/src/lib/supabase/server.ts](web/src/lib/supabase/server.ts) (server-only usage)

---

## Quick file index (implementation map)

| Area | Files |
|------|--------|
| Auth session (server) | [web/src/lib/auth/server.ts](web/src/lib/auth/server.ts), [web/src/lib/supabase/server-user.ts](web/src/lib/supabase/server-user.ts) |
| Auth session (browser) | [web/src/lib/supabase/browser.ts](web/src/lib/supabase/browser.ts), [web/src/lib/use-auth-user.ts](web/src/lib/use-auth-user.ts) |
| Auth gate (optional) | *(none in repo — add `proxy.ts` when enforcing B1)* |
| Lessons (server actions) | [web/src/app/lessons/actions.ts](web/src/app/lessons/actions.ts) |
| Lesson data + RLS via user client | [web/src/lib/lesson-data.ts](web/src/lib/lesson-data.ts) |
| Reader + chat UI | [web/src/components/article-reader.tsx](web/src/components/article-reader.tsx) |
| AI prompts | [web/src/lib/ai/article-assistant.ts](web/src/lib/ai/article-assistant.ts) |

---

## Done when

You can check all of the following:

- [x] **A2** lint + build green  
- [x] **A3** DB shape (`user_profile`, `learner_progress.user_id` uuid, `learner_progress_select_own`)  
- [ ] **B1–B3** login / logout / guard  
- [ ] **B4** `user_profile` row exists  
- [ ] **C1–C2** settings + lessons badge  
- [ ] **D1–D4** highlights + comments + refresh  
- [ ] **E1–E3** chat + highlight scope + profile-aware tone  
- [ ] **F1** two users isolated  
- [ ] **G2** teacher badge after SQL  
- [ ] **H1** no service role key in client bundles  

If **A3** fails, treat DB as **out of spec** until repaired — don’t force through the rest.
