# learn-000 — Next.js bootstrap + UI shell

## Goal

Create the brand-new Next.js app foundation (App Router, TypeScript, Tailwind) using `shadcn/ui`, with a basic layout that supports:

- Library side (browse domains/categories/topics/articles)
- Lesson plan side (progress header + lesson content area)
- Article reader page (placeholder content for now)
- “Mock roles” (teacher/student) for early DB testing (real Supabase Auth comes later)

Rich text + highlighting will be added in `learn-004`.

## Target workspace layout

Repo root:

- `tasks/` (this is where these docs live)
- `web/` (Next.js app)
- `supabase/` (Supabase CLI project, created in `learn-001`)

## Prerequisites (you do once)

Make sure you have:

- Node.js 20+
- `pnpm`

Then the agent will scaffold and install the app dependencies in this phase.

## Dependencies (installed by the agent in this phase)

- Next.js (via `pnpm create next-app`)
- TypeScript, Tailwind, ESLint (Next template defaults)
- `shadcn/ui` + Radix UI components
- `@supabase/supabase-js`
- `tiptap` (dependency included; full integration in `learn-004`)

## Implementation steps (agent will execute these)

### 1) Scaffold Next.js (in `web/`)

From repo root:

- `mkdir -p web`
- `cd web`
- `pnpm create next-app@latest .`
  - Use App Router (`app/`)
  - Enable TypeScript
  - Enable Tailwind + ESLint

### 2) shadcn/ui + base theme

- Initialize `shadcn/ui` and configure it to use Tailwind styles already present in the Next app.
- Add a minimal set of shared UI components:
  - `Button`, `Card`, `ScrollArea`, `Tabs`, `Textarea`, `Dialog`/`Popover` (for highlight UX; comments/chat later)

### 3) Global app shell (layout + routing)

Implement:

- `web/src/app/layout.tsx`: wraps the app with Tailwind + theme provider (per shadcn template).
- `web/src/app/page.tsx`: redirect or show a landing page with a link to:
  - `/library`
  - `/lessons`
- Create empty/placeholder pages:
  - `/library` (renders “Library shell”)
  - `/lessons` (renders “Lesson plan shell”)
  - `/articles/[id]` (renders “Article reader placeholder”)

### 4) Mock roles + mock user identity (no Supabase Auth yet)

Add a simple mock auth system:

- `MockUser`: `{ id: string; role: 'teacher' | 'student'; email?: string }`
- For early phases, store mock user in `localStorage` or a cookie.
- Provide a tiny UI on the `/lessons` page:
  - “Switch role” (teacher/student)
  - “Switch user id” (optional text input for testing)

Important: no real authentication in this phase; it only unblocks DB write flows later.

### 5) Supabase wiring placeholder

Add `web/src/lib/supabase/client.ts` with:

- `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)`

But do not enforce security yet; early phases use either:

- service-role on server (recommended for prototype speed), or
- permissive RLS (only if you explicitly want that).

In `learn-001` and later, the agent will decide the exact approach based on your local Supabase config.

### 6) Environment templates

Create:

- `web/.env.example` with placeholders for:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only use)

Also create `web/.env.local` (without committing secrets) so local dev can start:

- The agent will prefill:
  - `NEXT_PUBLIC_SUPABASE_URL` with your `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` with your `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` as an empty placeholder
- You will add the actual `SUPABASE_SERVICE_ROLE_KEY` after `.env.local` exists.

## Agent verification

The agent will confirm:

1. `cd web && pnpm lint` passes.
2. `cd web && pnpm build` succeeds.
3. `cd web && pnpm dev` loads and:
   - `/library` renders without runtime errors
   - `/lessons` renders and allows switching mock role without crashing
   - `/articles/[id]` renders placeholder content
4. No client bundle contains `SUPABASE_SERVICE_ROLE_KEY` (the agent will verify env usage paths).

## Human acceptance criteria

1. You can start the dev server (`web/`) and reach:
   - `/library`
   - `/lessons`
2. UI looks reasonable with shadcn styling (buttons/cards match shadcn defaults).
3. The mock role switch works and changes the displayed role label.
4. `web/.env.example` exists and contains the expected variables (no real secrets committed).

