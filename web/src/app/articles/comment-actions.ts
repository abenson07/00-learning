"use server";

import { revalidatePath } from "next/cache";

import { generateArticleAssistantReply } from "@/lib/ai/article-assistant";
import { getAuthUser, getUserProfileForUser } from "@/lib/auth/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type CommentWithAi = {
  id: string;
  body: string;
  highlight_id: string | null;
  created_at: string;
  ai: { body: string; model: string | null } | null;
};

export async function listCommentsForVersionAction(
  contentVersionId: string,
): Promise<CommentWithAi[]> {
  const auth = await getAuthUser();
  if (!auth) {
    return [];
  }
  const supabase = await createSupabaseUserServerClient();

  const { data: comments, error } = await supabase
    .from("comment")
    .select("id, body, highlight_id, created_at")
    .eq("content_version_id", contentVersionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = comments ?? [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((r) => r.id);
  const { data: ais, error: aiErr } = await supabase
    .from("comment_ai_response")
    .select("comment_id, body, model")
    .in("comment_id", ids);

  if (aiErr) {
    throw new Error(aiErr.message);
  }

  const byComment = new Map(
    (ais ?? []).map((a) => [
      a.comment_id as string,
      { body: a.body as string, model: (a.model as string | null) ?? null },
    ]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    body: r.body as string,
    highlight_id: (r.highlight_id as string | null) ?? null,
    created_at: r.created_at as string,
    ai: byComment.get(r.id as string) ?? null,
  }));
}

async function insertAiReply(commentId: string, body: string) {
  const admin = getSupabaseServiceRoleClient();
  const { error } = await admin.from("comment_ai_response").insert({
    comment_id: commentId,
    provider: "openai",
    body,
    model: "gpt-4o-mini",
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function addCommentOnHighlightAction(input: {
  contentItemId: string;
  contentVersionId: string;
  highlightId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = input.body.trim();
  if (text.length < 1) {
    return { ok: false, message: "Comment cannot be empty." };
  }

  const auth = await getAuthUser();
  if (!auth) {
    return { ok: false, message: "You must be signed in." };
  }
  const { userId } = auth;

  const supabase = await createSupabaseUserServerClient();

  const { data: hi, error: hErr } = await supabase
    .from("highlight")
    .select("id, content_version_id, plain_text_start, plain_text_end")
    .eq("id", input.highlightId)
    .maybeSingle();

  if (hErr) {
    return { ok: false, message: hErr.message };
  }
  if (!hi || hi.content_version_id !== input.contentVersionId) {
    return { ok: false, message: "Invalid highlight for this article version." };
  }

  const { data: ver, error: vErr } = await supabase
    .from("content_version")
    .select("plain_text, content_item_id")
    .eq("id", input.contentVersionId)
    .maybeSingle();

  if (vErr || !ver || ver.content_item_id !== input.contentItemId) {
    return { ok: false, message: "Unknown article version." };
  }

  const { data: itemRow } = await supabase
    .from("content_item")
    .select("title")
    .eq("id", input.contentItemId)
    .maybeSingle();
  const articleTitle =
    typeof itemRow?.title === "string" ? itemRow.title : "Article";

  const plain = ver.plain_text as string;
  const excerpt = plain.slice(
    hi.plain_text_start as number,
    hi.plain_text_end as number,
  );

  const { data: inserted, error: insErr } = await supabase
    .from("comment")
    .insert({
      content_version_id: input.contentVersionId,
      highlight_id: input.highlightId,
      created_by_user_id: userId,
      body: text,
    })
    .select("id")
    .single();

  if (insErr) {
    return { ok: false, message: insErr.message };
  }

  try {
    const profile = await getUserProfileForUser(userId);
    const reply = await generateArticleAssistantReply({
      profile,
      articleTitle,
      articlePlainText: plain,
      highlightExcerpt: excerpt,
      userMessage: text,
    });
    await insertAiReply(inserted.id, reply);
  } catch {
    // Comment persists; AI is optional for prototype
  }

  revalidatePath(`/articles/${input.contentItemId}`);
  return { ok: true };
}

export async function addArticleCommentAction(input: {
  contentItemId: string;
  contentVersionId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = input.body.trim();
  if (text.length < 1) {
    return { ok: false, message: "Comment cannot be empty." };
  }

  const auth = await getAuthUser();
  if (!auth) {
    return { ok: false, message: "You must be signed in." };
  }
  const { userId } = auth;

  const supabase = await createSupabaseUserServerClient();

  const { data: ver, error: vErr } = await supabase
    .from("content_version")
    .select("plain_text, content_item_id")
    .eq("id", input.contentVersionId)
    .maybeSingle();

  if (vErr || !ver || ver.content_item_id !== input.contentItemId) {
    return { ok: false, message: "Unknown article version." };
  }

  const { data: itemRow } = await supabase
    .from("content_item")
    .select("title")
    .eq("id", input.contentItemId)
    .maybeSingle();
  const articleTitle =
    typeof itemRow?.title === "string" ? itemRow.title : "Article";

  const plain = ver.plain_text as string;

  const { data: inserted, error: insErr } = await supabase
    .from("comment")
    .insert({
      content_version_id: input.contentVersionId,
      highlight_id: null,
      created_by_user_id: userId,
      body: text,
    })
    .select("id")
    .single();

  if (insErr) {
    return { ok: false, message: insErr.message };
  }

  try {
    const profile = await getUserProfileForUser(userId);
    const reply = await generateArticleAssistantReply({
      profile,
      articleTitle,
      articlePlainText: plain,
      highlightExcerpt: null,
      userMessage: text,
    });
    await insertAiReply(inserted.id, reply);
  } catch {
    // Comment persists without AI
  }

  revalidatePath(`/articles/${input.contentItemId}`);
  return { ok: true };
}
