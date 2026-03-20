# Learning Platform Human Tasks (Setup & Ownership)

This checklist is for the things you do on your end before we build the prototype locally.

## 1) Supabase project (required)

1. Create a new Supabase project (remote).
2. Confirm you have these values available (these are the ones you already sent):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (used as the anon/publishable key for the browser)
3. We will need the service role key later:
   - You will add `SUPABASE_SERVICE_ROLE_KEY` after the agent creates `web/.env.local`.

## 2) Supabase Storage bucket name (optional for this prototype)

At this point we can keep the prototype fully DB-driven (no uploads required).

If you do want to create a bucket now for future video/assets, use:
- `learning-platform-media`

## 3) LLM credentials

Chat/comments + AI responses are deferred to a later phase.

So: do NOT add any `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` now.
You will add them when we reach the phase that implements comments/chat.

## 4) Security + “secrets hygiene” rules (do not skip)

1. Never commit `.env.local`, `.env`, or service-role keys.
2. The agent should ensure:
   - Any LLM API keys added later are only used in server code.
   - Supabase service-role key only used server-side.

## Human go/no-go checklist

Go ahead and confirm the agent can start when ALL are true:

1. You have a Supabase project created and you have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` available.
2. You are OK NOT deploying to Vercel yet (we validate locally first).
3. You are OK skipping n8n for now.
4. You will not commit secrets into git (service role key must not be committed).

## Agent verification (what I will do in code later)

For each `learn-*` file, the agent will:
1. Provide commands to run locally (migrations, lint/build).
2. Provide manual smoke tests you can reproduce.
3. Provide acceptance criteria tied to your specific UI expectations.

