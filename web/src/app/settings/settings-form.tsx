"use client";

import { useState } from "react";

import { saveUserProfileSettingsAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  initialOccupation: string;
  initialContext: string;
  initialLearningStyle: string;
  role: "teacher" | "student";
};

export default function SettingsForm({
  initialOccupation,
  initialContext,
  initialLearningStyle,
  role,
}: Props) {
  const [occupation, setOccupation] = useState(initialOccupation);
  const [context, setContext] = useState(initialContext);
  const [learningStyle, setLearningStyle] = useState(initialLearningStyle);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    setBusy(true);
    try {
      const r = await saveUserProfileSettingsAction({
        occupation,
        context,
        learningStyle,
      });
      if (!r.ok) {
        setErr(r.message);
        return;
      }
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Learning profile</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Used to tailor AI explanations in articles and chat.
        </p>
        <p className="text-muted-foreground text-xs">
          Role:{" "}
          <span className="text-foreground font-medium">
            {role === "teacher" ? "Teacher" : "Student"}
          </span>
          {role === "teacher" ? (
            <span className="ml-2 rounded-md border border-black/10 bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
              Teacher mode
            </span>
          ) : null}
        </p>
      </div>
      <form className="mt-6 flex flex-col gap-4" onSubmit={onSave}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="occupation">
            Occupation
          </label>
          <input
            id="occupation"
            className="border-border h-11 rounded-md border bg-background px-3 text-sm shadow-sm ring-1 ring-black/8 outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="e.g. waiter, nurse, engineer"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="context">
            Context (optional)
          </label>
          <textarea
            id="context"
            className="border-border min-h-[5rem] rounded-md border bg-background px-3 py-2 text-sm shadow-sm ring-1 ring-black/8 outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="What should the tutor know about your goals or background?"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="learningStyle">
            Learning style (optional)
          </label>
          <select
            id="learningStyle"
            className="border-border h-11 rounded-md border bg-background px-3 text-sm shadow-sm ring-1 ring-black/8 outline-none focus:ring-2 focus:ring-ring/40"
            value={learningStyle}
            onChange={(e) => setLearningStyle(e.target.value)}
          >
            <option value="">—</option>
            <option value="hands_on">Hands-on</option>
            <option value="theory_first">Theory first</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          ) : null}
        </div>
        {err ? <p className="text-destructive text-sm">{err}</p> : null}
      </form>
    </Card>
  );
}
