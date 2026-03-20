"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ensureLearnerProgressAction } from "@/app/lessons/actions";
import { Button } from "@/components/ui/button";
import { useMockUserFromStorage } from "@/lib/use-mock-user-from-storage";

export default function StartLessonButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const { user, ready } = useMockUserFromStorage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    const uid = user.id.trim();
    if (!ready || !uid) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      await ensureLearnerProgressAction(uid, versionId);
      router.push(`/lessons/${versionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={!ready || pending || !user.id.trim()}
        onClick={onStart}
      >
        {pending ? "Starting…" : "Start lesson"}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
