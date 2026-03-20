# learn-002 — Library UI (domains → articles)

## Goal

Implement the “open library” side of the product:

- Browse taxonomy: technical/agent domain → categories → topics
- View an article “reader shell” page for any content item
- Show article metadata and related content (optional for prototype)
- No character-level highlighting yet (that comes in `learn-004`)

## Implementation steps (agent will execute these)

### 1) Data fetching layer

In `web/src/lib/` add helpers to query Supabase using server components/actions.

Required reads:

- `listDomains()`
- `listCategoriesByDomain(domainId)`
- `listTopicsByCategory(categoryId)`
- `listContentItemsByTopic(topicId)`
- `getContentItemDetails(contentItemId)` returning:
  - article title
  - current `content_version` (or requested version)
  - `content_version.content_rich_json` and `plain_text`

### 2) Routes + UI

Create pages:

- `/library`  
  - left sidebar or top nav:
    - domain selector
    - category selector
    - topic selector
  - main panel: list of content items as cards/rows

- `/articles/[contentItemId]`
  - reader shell with:
    - title + breadcrumb
    - rich text content rendered from `content_version.content_rich_json`
    - “Ask a question” entry point (disabled/placeholder until `learn-004`)

### 3) Use mock role (no real auth yet)

If the UI depends on user state, keep it minimal for this phase:

- The page should still load without a mock user set.
- If needed, display “Signed in as: student/teacher (mock)”.

### 4) Related content (optional)

If you can do it quickly:

- On the article page, show 3 “related articles” from the same `topic` or sibling topics.

## Agent verification

1. `cd web && pnpm lint` passes.
2. `cd web && pnpm build` passes.
3. Manual smoke checks:
   - `/library` renders and shows at least the seeded taxonomy.
   - clicking a content item opens `/articles/[id]`.
   - article page renders rich text (even if highlight/comment UI is absent).
4. Supabase reads succeed using the configured env vars:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or service-role via server).

## Human acceptance criteria

1. You can open `/library` and see:
   - at least one domain
   - at least one category per domain
   - at least one topic per category
2. Clicking a topic shows a list of seeded articles.
3. Opening an article shows:
   - title
   - rich content rendered (not blank)
4. No client-side errors in browser console when loading the article page.

