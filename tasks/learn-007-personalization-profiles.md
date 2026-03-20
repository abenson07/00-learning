# learn-007 — Personalization profiles + comments/chat AI

## Goal

Implement personalization and then use it for the next major reader features:

- Store a learner profile (occupation/context).
- Add comments + AI responses attached to saved highlights.
- Add a chat UI scoped to the current article (and optionally the selected highlight).
- Ensure the AI prompt instructs the model to use framing/examples that match the learner profile.

Auth/real roles are not required yet; this phase uses mock user id.

## Data model extension (agent will implement migrations)

Add table `learner_profile`:

- `user_id text pk` (mock user id)
- `occupation text null` (e.g. `waiter`)
- `context text null` (optional freeform)
- `learning_style text null` (optional: `hands_on`, `theory_first`, etc.)
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## UI

Add a settings route:

- `/settings`
  - form fields:
    - occupation
    - context (optional)
  - save button
  - show “saved” state

Also show current profile summary on the lessons page (small badge) so it’s obvious it’s being applied.

## Reader features (comments + chat)

Update the article reader (from `learn-004`) to support:

1. Commenting
   - When a highlight is selected:
     - show “Add comment” UI
     - create a `comment` row tied to the selected highlight
     - trigger generation of an AI reply stored in `comment_ai_response`
   - When no highlight is selected:
     - allow “Ask about the article” which creates a `comment` without `highlight_id`

2. Sidebar “notes/questions”
   - list highlights
   - list comments (and replies) associated with the opened article/version

3. Chat (left panel)
   - Chat messages are scoped to:
     - the current article/version
     - and optionally the selected highlight range
   - Use the AI provider via Vercel AI SDK.

## AI prompt shaping (Vercel AI SDK)

In the AI generation functions used by `comment_ai_response` generation and the chat endpoint:

Agent should:

1. Load profile for the current mock user id.
2. Add a profile section into the prompt, e.g.:
   - occupation: `${occupation}`
   - context: `${context}`
3. In the prompt instructions, require:
   - use at least 1 example framed to the occupation/context (if provided)
   - avoid assuming prior knowledge beyond the curriculum level
   - keep output structured (short explanation + one example + one “next step” question)

## Prototype behavior expectations

Example (waiter):

- When discussing database concepts:
  - analogize “schema/tables/rows/keys” to restaurant systems (menus/orders/inventory)
  - use short, practical comparisons

We’re not guaranteeing exact phrasing from the model; acceptance criteria should focus on “profile is loaded and included in prompt + observable change.”

## Agent verification

1. `cd web && pnpm lint` and `pnpm build` pass.
2. Manual checks:
   - update `/settings` with occupation “waiter”
   - on an article, create a highlight (from `learn-004`)
   - add a comment on that highlight
   - verify:
     - `comment` row is created
     - an AI response is generated and shown (from `comment_ai_response`)
   - send a chat question while a highlight is selected
   - verify the answer is scoped to the selection and uses waiter-style framing (manual observation)
3. DB checks:
   - `learner_profile` row exists for the mock user id you tested.

## Human acceptance criteria

1. Profile form:
   - save persists after refresh.
2. Reader comments:
   - adding a comment to a saved highlight persists and reappears on refresh.
   - an AI response is displayed for the comment.
3. Chat scoping:
   - chat answers clearly relate to the selected highlight (when one is selected).
4. AI behavior:
   - after setting occupation/context, AI responses change to use that framing (restaurant/occupation examples) in an obvious way.

