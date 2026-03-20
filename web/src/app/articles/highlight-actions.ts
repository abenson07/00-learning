"use server";

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

export type HighlightRow = {
  id: string;
  plain_text_start: number;
  plain_text_end: number;
  created_at: string;
};

export async function listHighlightsForVersionAction(
  contentVersionId: string,
): Promise<HighlightRow[]> {
  const auth = await getAuthUser();
  if (!auth) {
    return [];
  }
  const { userId } = auth;
  const supabase = await createSupabaseUserServerClient();
  const { data, error } = await supabase
    .from("highlight")
    .select("id, plain_text_start, plain_text_end, created_at")
    .eq("content_version_id", contentVersionId)
    .eq("created_by_user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HighlightRow[];
}

export async function createHighlightAction(input: {
  contentItemId: string;
  contentVersionId: string;
  plainTextStart: number;
  plainTextEnd: number;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const auth = await getAuthUser();
  if (!auth) {
    return { ok: false, message: "You must be signed in to save highlights." };
  }
  const { userId } = auth;

  const start = Math.floor(input.plainTextStart);
  const end = Math.floor(input.plainTextEnd);

  if (start < 0 || end < 0 || start >= end || end - start < 1) {
    return { ok: false, message: "Selection is too short to highlight." };
  }

  const supabase = await createSupabaseUserServerClient();

  const { data: version, error: verErr } = await supabase
    .from("content_version")
    .select("id, content_item_id, plain_text")
    .eq("id", input.contentVersionId)
    .maybeSingle();

  if (verErr) {
    return { ok: false, message: verErr.message };
  }
  if (!version || version.content_item_id !== input.contentItemId) {
    return { ok: false, message: "Unknown article version." };
  }

  if (end > version.plain_text.length) {
    return { ok: false, message: "Selection is outside this article’s text." };
  }

  const slice = version.plain_text.slice(start, end);
  if (slice.length !== end - start) {
    return { ok: false, message: "Invalid highlight range." };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("highlight")
    .insert({
      content_version_id: input.contentVersionId,
      plain_text_start: start,
      plain_text_end: end,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (insErr) {
    return { ok: false, message: insErr.message };
  }

  revalidatePath(`/articles/${input.contentItemId}`);
  return { ok: true, id: inserted.id };
}

export async function deleteHighlightAction(input: {
  contentItemId: string;
  contentVersionId: string;
  highlightId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await getAuthUser();
  if (!auth) {
    return { ok: false, message: "You must be signed in." };
  }
  const { userId } = auth;

  const highlightId = input.highlightId.trim();
  if (!highlightId) {
    return { ok: false, message: "Missing highlight." };
  }

  const supabase = await createSupabaseUserServerClient();

  const { data: row, error: fetchErr } = await supabase
    .from("highlight")
    .select("id, content_version_id, created_by_user_id")
    .eq("id", highlightId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, message: fetchErr.message };
  }
  if (!row) {
    return { ok: false, message: "Highlight not found." };
  }
  if (row.created_by_user_id !== userId) {
    return { ok: false, message: "You can only remove your own highlights." };
  }
  if (row.content_version_id !== input.contentVersionId) {
    return { ok: false, message: "Highlight does not belong to this article version." };
  }

  const { data: version, error: verErr } = await supabase
    .from("content_version")
    .select("content_item_id")
    .eq("id", row.content_version_id)
    .maybeSingle();

  if (verErr) {
    return { ok: false, message: verErr.message };
  }
  if (!version || version.content_item_id !== input.contentItemId) {
    return { ok: false, message: "Unknown article version." };
  }

  const { error: delErr } = await supabase
    .from("highlight")
    .delete()
    .eq("id", highlightId)
    .eq("created_by_user_id", userId);

  if (delErr) {
    return { ok: false, message: delErr.message };
  }

  revalidatePath(`/articles/${input.contentItemId}`);
  return { ok: true };
}
