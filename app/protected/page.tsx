import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <pre className="max-h-48 overflow-auto rounded border p-3 text-xs font-mono">
      {JSON.stringify(data.claims, null, 2)}
    </pre>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Protected</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed-in area. Session claims below.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading session…</p>
        }
      >
        <UserDetails />
      </Suspense>
    </div>
  );
}
