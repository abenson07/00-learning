"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type AcceptanceCriteriaListProps = {
  lessonId: string;
  items: string[];
};

export function AcceptanceCriteriaList({ lessonId, items }: AcceptanceCriteriaListProps) {
  const [checked, setChecked] = React.useState<Record<number, boolean>>({});

  return (
    <ul className="space-y-3">
      {items.map((line, i) => {
        const isChecked = Boolean(checked[i]);
        const id = `${lessonId}-acceptance-${i}`;
        return (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
            <Checkbox
              id={id}
              checked={isChecked}
              onCheckedChange={(v) =>
                setChecked((prev) => ({ ...prev, [i]: v === true }))
              }
              className="mt-0.5"
            />
            <label
              htmlFor={id}
              className={cn(
                "cursor-pointer text-pretty",
                isChecked &&
                  "text-muted-foreground line-through decoration-foreground/35 [text-decoration-thickness:1px]"
              )}
            >
              {line}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
