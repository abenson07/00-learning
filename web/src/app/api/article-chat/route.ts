import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";

import { buildArticleAssistantInstructions } from "@/lib/ai/article-assistant";
import { getUserProfileForUser } from "@/lib/auth/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseUserServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: {
    messages?: ChatMessage[];
    contentItemId?: string;
    contentVersionId?: string;
    articleTitle?: string;
    articlePlainText?: string;
    highlightPlainStart?: number | null;
    highlightPlainEnd?: number | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return NextResponse.json({ error: "Missing user message" }, { status: 400 });
  }

  const title = body.articleTitle ?? "Article";
  const plain = body.articlePlainText ?? "";
  const start = body.highlightPlainStart;
  const end = body.highlightPlainEnd;
  const highlightExcerpt =
    typeof start === "number" &&
    typeof end === "number" &&
    end > start &&
    start >= 0 &&
    end <= plain.length
      ? plain.slice(start, end)
      : null;

  const profile = user
    ? await getUserProfileForUser(user.id)
    : null;

  const selectionBlock =
    highlightExcerpt && highlightExcerpt.trim().length > 0
      ? `The learner has selected this excerpt:\n"""${highlightExcerpt.trim()}"""\nPrioritize answering in relation to this selection.\n`
      : "No excerpt is selected; answer in the context of the whole article.\n";

  const prior = messages
    .slice(0, -1)
    .map(
      (m) =>
        `${m.role === "user" ? "Learner" : "Assistant"}: ${m.content}`,
    )
    .join("\n");

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildArticleAssistantInstructions(profile),
    prompt: `Article title: ${title}

Article plain text:
"""${plain.slice(0, 24_000)}"""

${selectionBlock}
${prior ? `Conversation so far:\n${prior}\n` : ""}
Latest learner message:
"""${lastUser.content}"""`,
  });

  return result.toTextStreamResponse();
}
