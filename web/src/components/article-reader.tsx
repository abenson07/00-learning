"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { Highlighter, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addArticleCommentAction,
  addCommentOnHighlightAction,
  listCommentsForVersionAction,
  type CommentWithAi,
} from "@/app/articles/comment-actions";
import {
  createHighlightAction,
  deleteHighlightAction,
  listHighlightsForVersionAction,
  type HighlightRow,
} from "@/app/articles/highlight-actions";
import ArticleChatPanel from "@/components/article-chat-panel";
import {
  ARTICLE_HIGHLIGHT_RANGES_META,
  ArticleHighlightDecorations,
} from "@/lib/tiptap-article-highlight-extension";
import {
  docRangeToPlainOffsets,
  normalizePlainText,
  plainRangeToDocRange,
  pmDocPlainText,
  TIPTAP_PLAIN_BLOCK_SEPARATOR,
} from "@/lib/tiptap-plain-text";
import { useAuthUser } from "@/lib/use-auth-user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type RelatedArticleInGraph = { id: string; title: string };

function isUsableRichDoc(value: unknown): value is JSONContent {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { type?: string }).type === "doc"
  );
}

export type ArticleReaderProps = {
  contentItemId: string;
  contentVersionId: string;
  /** Used for chat / AI context */
  articleTitle: string;
  canonicalPlainText: string;
  contentRichJson: unknown;
  /** Sidebar: current taxonomy topic */
  topicName?: string;
  /** Concept graph: related articles (linked to reader routes) */
  relatedArticles?: RelatedArticleInGraph[];
};

type HighlightOffer =
  | { kind: "none" }
  | { kind: "needs_user" }
  | {
      kind: "duplicate";
      plainStart: number;
      plainEnd: number;
    }
  | {
      kind: "saveable";
      plainStart: number;
      plainEnd: number;
    };

type HighlightToolbarUi = {
  centerX: number;
  topY: number;
  offer: Exclude<HighlightOffer, { kind: "none" }>;
};

function getDomSelectionRectInRoot(root: HTMLElement): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount < 1 || sel.isCollapsed) {
    return null;
  }
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range.getBoundingClientRect();
}

function pmSelectionViewportRect(
  view: EditorView,
  from: number,
  to: number,
): DOMRect | null {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  try {
    const s = view.coordsAtPos(a);
    const e = view.coordsAtPos(b);
    const left = Math.min(s.left, e.left, s.right, e.right);
    const right = Math.max(s.left, e.left, s.right, e.right);
    const top = Math.min(s.top, e.top, s.bottom, e.bottom);
    const bottom = Math.max(s.top, e.top, s.bottom, e.bottom);
    if (right <= left || bottom <= top) {
      return null;
    }
    return new DOMRect(left, top, right - left, bottom - top);
  } catch {
    return null;
  }
}

function analyzeHighlightOffer(
  ed: Editor,
  userId: string,
  canonicalPlainText: string,
  highlights: HighlightRow[],
): HighlightOffer {
  const { from, to } = ed.state.selection;
  if (from === to) {
    return { kind: "none" };
  }
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  const offsets = docRangeToPlainOffsets(
    ed.state.doc,
    a,
    b,
    TIPTAP_PLAIN_BLOCK_SEPARATOR,
  );
  if (!offsets || offsets.end - offsets.start < 1) {
    return { kind: "none" };
  }

  const docSlice = ed.state.doc.textBetween(
    a,
    b,
    TIPTAP_PLAIN_BLOCK_SEPARATOR,
  );
  const canonicalSlice = canonicalPlainText.slice(
    offsets.start,
    offsets.end,
  );
  if (normalizePlainText(docSlice) !== normalizePlainText(canonicalSlice)) {
    return { kind: "none" };
  }

  const roundTrip = plainRangeToDocRange(
    ed.state.doc,
    offsets.start,
    offsets.end,
    TIPTAP_PLAIN_BLOCK_SEPARATOR,
  );
  if (!roundTrip) {
    return { kind: "none" };
  }

  if (!userId.trim()) {
    return { kind: "needs_user" };
  }

  const duplicate = highlights.some(
    (h) =>
      h.plain_text_start === offsets.start &&
      h.plain_text_end === offsets.end,
  );
  if (duplicate) {
    return {
      kind: "duplicate",
      plainStart: offsets.start,
      plainEnd: offsets.end,
    };
  }

  return {
    kind: "saveable",
    plainStart: offsets.start,
    plainEnd: offsets.end,
  };
}

export default function ArticleReader({
  contentItemId,
  contentVersionId,
  articleTitle,
  canonicalPlainText,
  contentRichJson,
  topicName,
  relatedArticles = [],
}: ArticleReaderProps) {
  const { user, ready: userReady } = useAuthUser();
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [comments, setComments] = useState<CommentWithAi[]>([]);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(
    null,
  );
  const [highlightCommentDraft, setHighlightCommentDraft] = useState("");
  const [articleCommentDraft, setArticleCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentErr, setCommentErr] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightToolbar, setHighlightToolbar] =
    useState<HighlightToolbarUi | null>(null);
  const highlightToolbarRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarDebounceRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const richDoc = useMemo(() => {
    if (isUsableRichDoc(contentRichJson)) {
      return contentRichJson;
    }
    return null;
  }, [contentRichJson]);

  const editorJsonKey = useMemo(() => {
    try {
      return JSON.stringify(richDoc ?? {});
    } catch {
      return "";
    }
  }, [richDoc]);

  const loadHighlights = useCallback(async () => {
    if (!userReady || !user) {
      setHighlights([]);
      return;
    }
    setLoadError(null);
    try {
      const rows = await listHighlightsForVersionAction(contentVersionId);
      setHighlights(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load highlights");
    }
  }, [user, userReady, contentVersionId]);

  const loadComments = useCallback(async () => {
    if (!userReady || !user) {
      setComments([]);
      return;
    }
    try {
      const rows = await listCommentsForVersionAction(contentVersionId);
      setComments(rows);
    } catch {
      setComments([]);
    }
  }, [user, userReady, contentVersionId]);

  useEffect(() => {
    if (!userReady) {
      return;
    }
    const id = window.setTimeout(() => {
      void loadHighlights();
      void loadComments();
    }, 0);
    return () => clearTimeout(id);
  }, [userReady, loadHighlights, loadComments]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editable: false,
      extensions: [StarterKit, ArticleHighlightDecorations],
      content: richDoc ?? { type: "doc", content: [] },
      editorProps: {
        attributes: {
          class:
            "article-body max-w-none text-[0.975rem] leading-relaxed outline-none [&_p]:mb-3 [&_p:last-child]:mb-0",
        },
      },
    },
    [contentVersionId, editorJsonKey],
  );

  const plainMismatch = useMemo(() => {
    if (!editor) {
      return false;
    }
    const fromEditor = normalizePlainText(
      pmDocPlainText(editor.state.doc, TIPTAP_PLAIN_BLOCK_SEPARATOR),
    );
    const fromDb = normalizePlainText(canonicalPlainText);
    return fromEditor !== fromDb;
  }, [editor, canonicalPlainText]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const ranges = highlights.map((h) => ({
      start: h.plain_text_start,
      end: h.plain_text_end,
    }));
    const tr = editor.state.tr.setMeta(ARTICLE_HIGHLIGHT_RANGES_META, ranges);
    editor.view.dispatch(tr);
  }, [editor, highlights]);

  const saveHighlightFromRange = useCallback(
    async (plainStart: number, plainEnd: number) => {
      setHighlightToolbar(null);
      setSaving(true);
      setSaveError(null);
      try {
        const result = await createHighlightAction({
          contentItemId,
          contentVersionId,
          plainTextStart: plainStart,
          plainTextEnd: plainEnd,
        });
        if (!result.ok) {
          setSaveError(result.message);
          return;
        }
        await loadHighlights();
      } finally {
        setSaving(false);
      }
    },
    [contentItemId, contentVersionId, loadHighlights],
  );

  const removeHighlight = useCallback(
    async (highlightId: string) => {
      setDeleteError(null);
      setDeletingId(highlightId);
      try {
        const result = await deleteHighlightAction({
          contentItemId,
          contentVersionId,
          highlightId,
        });
        if (!result.ok) {
          setDeleteError(result.message);
          return;
        }
        await loadHighlights();
      } finally {
        setDeletingId(null);
      }
    },
    [contentItemId, contentVersionId, loadHighlights],
  );

  useEffect(() => {
    if (!editor || !richDoc || plainMismatch || !userReady) {
      setHighlightToolbar(null);
      return;
    }
    const ed = editor;
    const root = ed.view.dom as HTMLElement;

    function viewportSelectionRect(): DOMRect | null {
      const domRect = getDomSelectionRectInRoot(root);
      if (domRect && domRect.width >= 1 && domRect.height >= 1) {
        return domRect;
      }
      const { from, to } = ed.state.selection;
      return pmSelectionViewportRect(ed.view, from, to);
    }

    function updateHighlightToolbar() {
      const offer = analyzeHighlightOffer(
        ed,
        user?.id ?? "",
        canonicalPlainText,
        highlights,
      );
      if (offer.kind === "none") {
        setHighlightToolbar(null);
        return;
      }
      const rect = viewportSelectionRect();
      if (!rect || (rect.width < 1 && rect.height < 1)) {
        setHighlightToolbar(null);
        return;
      }
      setHighlightToolbar({
        centerX: rect.left + rect.width / 2,
        topY: rect.top,
        offer,
      });
    }

    function onRootPointerUp() {
      requestAnimationFrame(updateHighlightToolbar);
    }

    function onSelectionChange() {
      if (selectionToolbarDebounceRef.current) {
        clearTimeout(selectionToolbarDebounceRef.current);
      }
      selectionToolbarDebounceRef.current = setTimeout(() => {
        const sel = window.getSelection();
        const anchor = sel?.anchorNode;
        if (!anchor || !root.contains(anchor)) {
          return;
        }
        requestAnimationFrame(updateHighlightToolbar);
      }, 90);
    }

    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) {
        return;
      }
      if (highlightToolbarRef.current?.contains(t)) {
        return;
      }
      setHighlightToolbar(null);
    }

    function onScroll() {
      setHighlightToolbar(null);
    }

    root.addEventListener("pointerup", onRootPointerUp);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      root.removeEventListener("pointerup", onRootPointerUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      if (selectionToolbarDebounceRef.current) {
        clearTimeout(selectionToolbarDebounceRef.current);
      }
    };
  }, [
    editor,
    richDoc,
    plainMismatch,
    userReady,
    user?.id,
    canonicalPlainText,
    highlights,
  ]);

  const selectedHl = useMemo(
    () => highlights.find((h) => h.id === selectedHighlightId) ?? null,
    [highlights, selectedHighlightId],
  );

  async function submitHighlightComment() {
    if (!selectedHl || !highlightCommentDraft.trim()) {
      return;
    }
    setCommentErr(null);
    setCommentBusy(true);
    try {
      const r = await addCommentOnHighlightAction({
        contentItemId,
        contentVersionId,
        highlightId: selectedHl.id,
        body: highlightCommentDraft,
      });
      if (!r.ok) {
        setCommentErr(r.message);
        return;
      }
      setHighlightCommentDraft("");
      await loadComments();
    } finally {
      setCommentBusy(false);
    }
  }

  async function submitArticleComment() {
    if (!articleCommentDraft.trim()) {
      return;
    }
    setCommentErr(null);
    setCommentBusy(true);
    try {
      const r = await addArticleCommentAction({
        contentItemId,
        contentVersionId,
        body: articleCommentDraft,
      });
      if (!r.ok) {
        setCommentErr(r.message);
        return;
      }
      setArticleCommentDraft("");
      await loadComments();
    } finally {
      setCommentBusy(false);
    }
  }

  const chatDisabled = !userReady || !user;
  const hlStart = selectedHl?.plain_text_start ?? null;
  const hlEnd = selectedHl?.plain_text_end ?? null;

  if (!richDoc) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(15rem,18rem)_1fr] xl:items-start">
        <ArticleChatPanel
          articleTitle={articleTitle}
          articlePlainText={canonicalPlainText}
          highlightPlainStart={hlStart}
          highlightPlainEnd={hlEnd}
          disabled={chatDisabled}
        />
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            This article has no structured rich text yet, so highlights are
            disabled. Plain text is shown below.
          </p>
          <p className="text-muted-foreground whitespace-pre-wrap text-[0.975rem] leading-relaxed">
            {canonicalPlainText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(15rem,18rem)_1fr_minmax(14rem,17rem)] xl:items-start">
      <ArticleChatPanel
        articleTitle={articleTitle}
        articlePlainText={canonicalPlainText}
        highlightPlainStart={hlStart}
        highlightPlainEnd={hlEnd}
        disabled={chatDisabled || plainMismatch}
      />
      <div className="flex min-w-0 flex-col gap-2">
        {plainMismatch ? (
          <p className="text-destructive text-sm">
            TipTap text does not match stored plain text; highlighting is
            disabled until content is fixed.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Select text — a small toolbar appears above your selection to save a
            highlight (signed in as{" "}
            <span className="text-foreground font-medium">
              {user?.email ?? user?.id ?? "—"}
            </span>
            ).
            {saving ? " Saving…" : ""}
          </p>
        )}
        {saveError ? (
          <p className="text-destructive text-sm">{saveError}</p>
        ) : null}
        <div
          className={
            plainMismatch
              ? "pointer-events-none opacity-60"
              : "cursor-text select-text"
          }
        >
          {editor ? <EditorContent editor={editor} /> : null}
        </div>

        {highlightToolbar ? (
          <div
            ref={highlightToolbarRef}
            role="toolbar"
            aria-label="Highlight selection"
            className="border-border bg-popover text-popover-foreground animate-in fade-in zoom-in-95 fixed z-50 flex max-w-[min(100vw-1.5rem,20rem)] items-center gap-1.5 rounded-lg border px-2 py-1.5 shadow-md duration-150"
            style={{
              left: highlightToolbar.centerX,
              top: highlightToolbar.topY,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {highlightToolbar.offer.kind === "saveable" ? (
              <>
                <Highlighter
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden
                />
                <span className="text-muted-foreground text-xs">
                  Save this highlight?
                </span>
                <Button
                  size="sm"
                  variant="default"
                  disabled={saving}
                  onClick={() => {
                    const o = highlightToolbar.offer;
                    if (o.kind !== "saveable") {
                      return;
                    }
                    void saveHighlightFromRange(o.plainStart, o.plainEnd);
                  }}
                >
                  Highlight
                </Button>
              </>
            ) : null}
            {highlightToolbar.offer.kind === "duplicate" ? (
              <span className="text-muted-foreground text-xs">
                Already highlighted
              </span>
            ) : null}
            {highlightToolbar.offer.kind === "needs_user" ? (
              <span className="text-muted-foreground text-xs">
                Highlights can&apos;t be saved in this mode
              </span>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="shrink-0"
              aria-label="Dismiss"
              onClick={() => setHighlightToolbar(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium">Highlights</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {highlights.length === 0
              ? "None yet for this version."
              : `${highlights.length} saved in this version`}
          </p>
          {loadError ? (
            <p className="text-destructive mt-2 text-xs">{loadError}</p>
          ) : null}
          {deleteError ? (
            <p className="text-destructive mt-2 text-xs">{deleteError}</p>
          ) : null}
          {highlights.length > 0 ? (
            <ul className="mt-3 flex max-h-[min(40vh,24rem)] flex-col gap-2 overflow-y-auto text-xs">
              {highlights.map((h) => {
                const excerpt = canonicalPlainText.slice(
                  h.plain_text_start,
                  h.plain_text_end,
                );
                const label =
                  excerpt.length > 120
                    ? `${excerpt.slice(0, 117)}…`
                    : excerpt;
                return (
                  <li
                    key={h.id}
                    className={`border-border flex cursor-pointer gap-1 rounded-md border py-1.5 pr-1 pl-2 ${
                      selectedHighlightId === h.id
                        ? "bg-primary/15 ring-2 ring-primary/30"
                        : "bg-muted/40"
                    }`}
                    onClick={() =>
                      setSelectedHighlightId((cur) =>
                        cur === h.id ? null : h.id,
                      )
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground text-[0.65rem] uppercase tracking-wide">
                        {h.plain_text_start}–{h.plain_text_end}
                      </span>
                      <p className="mt-0.5 text-[0.8rem] leading-snug text-foreground">
                        {label || "·"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive shrink-0 self-start"
                      aria-label="Remove highlight"
                      disabled={deletingId !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeHighlight(h.id);
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium">Notes &amp; questions</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Comments are saved per article version. AI replies appear under each
            note when configured.
          </p>
          {commentErr ? (
            <p className="text-destructive mt-2 text-xs">{commentErr}</p>
          ) : null}

          {selectedHl ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-medium">Comment on selected highlight</p>
              <textarea
                className="border-border min-h-[4rem] w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="Add a note about this selection…"
                value={highlightCommentDraft}
                disabled={commentBusy || chatDisabled}
                onChange={(e) => setHighlightCommentDraft(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={
                  commentBusy || chatDisabled || !highlightCommentDraft.trim()
                }
                onClick={() => void submitHighlightComment()}
              >
                {commentBusy ? "Saving…" : "Save comment + AI reply"}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 border-t border-border pt-3 text-xs">
              Select a highlight in the list to attach a comment to it.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-xs font-medium">Ask about the article</p>
            <textarea
              className="border-border min-h-[4rem] w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Question without a specific highlight…"
              value={articleCommentDraft}
              disabled={commentBusy || chatDisabled}
              onChange={(e) => setArticleCommentDraft(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                commentBusy || chatDisabled || !articleCommentDraft.trim()
              }
              onClick={() => void submitArticleComment()}
            >
              {commentBusy ? "Saving…" : "Post question + AI reply"}
            </Button>
          </div>

          {comments.length > 0 ? (
            <ul className="mt-4 flex max-h-[min(36vh,22rem)] flex-col gap-3 overflow-y-auto border-t border-border pt-3 text-xs">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="border-border rounded-md border bg-muted/30 p-2"
                >
                  <p className="text-muted-foreground text-[0.65rem]">
                    {c.highlight_id ? "On highlight" : "Article"} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {c.body}
                  </p>
                  {c.ai ? (
                    <div className="mt-2 rounded-md bg-background/80 p-2">
                      <p className="text-muted-foreground text-[0.65rem] font-medium">
                        AI
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap">{c.ai.body}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium">Concept graph</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Placeholder for a future knowledge graph.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            {topicName ? (
              <li>
                <span className="text-muted-foreground">Topic: </span>
                <span className="font-medium text-foreground">{topicName}</span>
              </li>
            ) : null}
            <li>
              <span className="text-muted-foreground">Highlights: </span>
              <span className="font-medium text-foreground">
                {highlights.length}
              </span>
            </li>
            {relatedArticles.length > 0 ? (
              <li className="mt-2">
                <span className="text-muted-foreground">Related: </span>
                <ul className="mt-1 flex list-none flex-col gap-1 pl-0">
                  {relatedArticles.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/articles/${item.id}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
