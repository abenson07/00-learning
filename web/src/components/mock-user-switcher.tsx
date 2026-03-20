"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_MOCK_USER,
  MOCK_USER_STORAGE_KEY,
  type MockUser,
  type MockUserRole,
} from "@/lib/mock-user";

function isMockUserRole(value: string): value is MockUserRole {
  return value === "teacher" || value === "student";
}

export default function MockUserSwitcher() {
  const [user, setUser] = useState<MockUser>(DEFAULT_MOCK_USER);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MOCK_USER_STORAGE_KEY);
      if (!raw) {
        setIsLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<MockUser>;
      if (typeof parsed.id === "string" && typeof parsed.role === "string") {
        if (isMockUserRole(parsed.role)) {
          setUser({ id: parsed.id, role: parsed.role });
        }
      }
    } catch {
      // ignore localStorage parsing failures; prototype fallback is fine
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore storage failures in prototype mode
    }
  }, [isLoaded, user]);

  const roleLabel = useMemo(() => {
    return user.role === "teacher" ? "Teacher" : "Student";
  }, [user.role]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">Mock user (prototype mode)</div>
        <div className="text-muted-foreground">
          Used to write/read `learner_progress` keyed by `user_id` in early
          phases.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Role</div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={user.role === "student" ? "default" : "ghost"}
            onClick={() => setUser((u) => ({ ...u, role: "student" }))}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={user.role === "teacher" ? "default" : "ghost"}
            onClick={() => setUser((u) => ({ ...u, role: "teacher" }))}
          >
            Teacher
          </Button>
        </div>
        <div className="text-muted-foreground text-xs">
          Current role: {roleLabel}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">User ID</div>
        <input
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          value={user.id}
          onChange={(e) => setUser((u) => ({ ...u, id: e.target.value }))}
          placeholder="e.g. student-1"
        />
        <div className="text-muted-foreground text-xs">
          This becomes `learner_progress.user_id` (mock `text` id).
        </div>
      </div>
    </div>
  );
}

