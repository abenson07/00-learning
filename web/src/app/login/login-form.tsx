"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = { nextPath: string };

export default function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage(
          "Check your email to confirm, or sign in if confirmations are disabled.",
        );
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/lessons");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Use your Supabase Auth account. New here? Switch to sign up.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="border-border h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={6}
            className="border-border h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "secondary"}
            onClick={() => setMode("signin")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "secondary"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </Button>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : mode === "signup" ? "Create account" : "Continue"}
        </Button>
        {message ? (
          <p className="text-muted-foreground text-sm">{message}</p>
        ) : null}
      </form>
      <p className="text-muted-foreground mt-6 text-center text-xs">
        <Link href="/library" className="text-primary hover:underline">
          Browse library without an account
        </Link>
      </p>
    </Card>
  );
}
