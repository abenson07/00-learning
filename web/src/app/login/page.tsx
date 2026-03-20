import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Login UI disabled. Restore: render `LoginForm` with `next` from searchParams (see git history). */
export default async function LoginPage() {
  redirect("/");
}
