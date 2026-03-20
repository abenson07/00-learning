import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { UserProfileRow } from "@/lib/auth/server";

function profileBlock(profile: UserProfileRow | null): string {
  if (!profile) {
    return "Learner profile: (not available)";
  }
  return `Learner profile:
- Occupation: ${profile.occupation ?? "(not set)"}
- Context: ${profile.context ?? "(not set)"}
- Learning style preference: ${profile.learning_style ?? "(not set)"}`;
}

export function buildArticleAssistantInstructions(
  profile: UserProfileRow | null,
): string {
  const p = profileBlock(profile);
  return `You are a patient tutor for a structured learning platform.

${p}

Rules:
- If occupation or context is provided, include at least one short example or analogy framed to that world (e.g. restaurant service for a waiter).
- Do not assume prior knowledge beyond introductory curriculum level unless the article clearly goes deeper.
- Structure every answer as: (1) a short explanation, (2) one concrete example, (3) one "next step" question for the learner.
- Stay grounded in the article excerpt and any highlighted selection provided; if information is missing, say so briefly.
- Be concise; avoid long essays.`;
}

export async function generateArticleAssistantReply(input: {
  profile: UserProfileRow | null;
  articleTitle: string;
  articlePlainText: string;
  highlightExcerpt: string | null;
  userMessage: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const selection =
    input.highlightExcerpt && input.highlightExcerpt.trim().length > 0
      ? `Selected highlight excerpt:\n"""${input.highlightExcerpt.trim()}"""\n`
      : "No highlight is selected; answer in the context of the whole article.\n";

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: buildArticleAssistantInstructions(input.profile),
    prompt: `Article title: ${input.articleTitle}

Full article plain text:
"""${input.articlePlainText.slice(0, 24_000)}"""

${selection}
Learner question or comment:
"""${input.userMessage}"""`,
  });

  return text.trim();
}
