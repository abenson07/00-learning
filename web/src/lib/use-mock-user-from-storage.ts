"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_MOCK_USER,
  MOCK_USER_CHANGED_EVENT,
  MOCK_USER_STORAGE_KEY,
  type MockUser,
  type MockUserRole,
} from "@/lib/mock-user";

function isMockUserRole(value: string): value is MockUserRole {
  return value === "teacher" || value === "student";
}

function readMockUser(): MockUser {
  try {
    const raw = localStorage.getItem(MOCK_USER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MOCK_USER;
    }
    const parsed = JSON.parse(raw) as Partial<MockUser>;
    if (typeof parsed.id === "string" && typeof parsed.role === "string") {
      if (isMockUserRole(parsed.role)) {
        return { id: parsed.id, role: parsed.role };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_MOCK_USER;
}

export function useMockUserFromStorage() {
  const [user, setUser] = useState<MockUser>(DEFAULT_MOCK_USER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setUser(readMockUser());
      setReady(true);
    }

    sync();
    window.addEventListener(MOCK_USER_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MOCK_USER_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user, ready };
}
