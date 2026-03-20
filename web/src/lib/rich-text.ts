import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

export function richJsonToHtml(richJson: unknown): string {
  if (!richJson || typeof richJson !== "object") {
    return "";
  }
  try {
    return generateHTML(richJson as JSONContent, [StarterKit]);
  } catch {
    return "";
  }
}
