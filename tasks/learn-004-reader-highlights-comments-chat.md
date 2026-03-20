# learn-004 — Article reader: highlights (comments/chat later)

## Goal

Implement the core interactive “reader” experience (MVP):

- Render rich text content via TipTap.
- Allow the learner to highlight any character-range (selection) inside the article.
- Persist and re-render highlights when reloading.

Comments + chat are deferred to a later phase, so we only implement highlight UX/storage in this step.

This phase is the biggest UI/data-flow requirement in the prototype.

## Rich text + character offset approach (prototype constraint)

Character-level highlighting requires a stable mapping between:

- TipTap editor selection positions, and
- DB highlight offsets (`plain_text_start`, `plain_text_end`).

For the prototype, the agent will enforce this constraint:

1. `content_version.plain_text` is the canonical string for offsets.
2. The TipTap editor will display the same text content (no reformatting that changes characters).
3. Highlight offsets refer to indices in `plain_text`:
   - start is inclusive
   - end is exclusive

If an exact 1:1 mapping is not feasible for TipTap doc JSON, the agent will switch to storing content as HTML/Markdown and computing offsets from a deterministic renderer (still keeping `plain_text` canonical).

## Implementation steps (agent will execute these)

### 1) TipTap read-only renderer + selection capture

On `/articles/[contentItemId]` and/or embedded reader in the lesson page:

- Render `content_version.content_rich_json` with TipTap.
- Enable text selection for read-only highlighting.
- On selection end:
  - compute `plain_text_start` and `plain_text_end`
  - normalize whitespace so offsets match `plain_text`

### 2) Highlights CRUD

Implement:

- Create highlight from selection:
  - POST/Server action: insert into `highlight`
  - fields:
    - `content_version_id`
    - `plain_text_start`, `plain_text_end`
    - `created_by_user_id` = mock user id

- Render existing highlights:
  - query `highlight` rows for the content version
  - visually mark ranges in the TipTap view
### 3) Sidebar (highlights only)

Add a sidebar that lists:

- The highlights for the opened article (grouped by range)
- Counts (e.g. total highlights in this version)

No comments/chat UI in this phase.

### 4) Optional “concept graph” stub

Your notes mention adding a graph. For prototype:

- implement a “Concept graph” placeholder panel that lists:
  - related topics
  - and counts of highlights

No real graph algorithm required yet.

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual smoke checks (must work end-to-end):
   - Open an article and select a text range.
   - The highlight is created in Supabase (row appears in `highlight`).
   - The sidebar shows the highlight.
   - Reload the page and confirm the highlight re-renders in the correct range.
3. Edge cases:
   - empty/short selection should be disabled or ignored
   - highlight offsets stored as valid integers (start < end)

## Human acceptance criteria

1. Highlighting:
   - selecting text in the article produces a visible highlight overlay when reloaded.
2. Sidebar:
   - highlights sidebar lists the saved highlights for the opened article.

