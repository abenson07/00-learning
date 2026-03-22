/**
 * When true, the app allows starting lesson plans and marking readings complete
 * without Supabase Auth while running `next dev`. The server pairs an httpOnly
 * cookie with SUPABASE_SERVICE_ROLE_KEY (see `learner-db-context.ts`).
 */
export const localLearnerProgressWithoutAuthClient =
  process.env.NODE_ENV === "development";
