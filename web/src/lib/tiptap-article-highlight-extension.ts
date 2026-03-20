import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

import {
  plainRangeToDocRange,
  TIPTAP_PLAIN_BLOCK_SEPARATOR,
} from "@/lib/tiptap-plain-text";

export type PlainHighlightRange = { start: number; end: number };

type HighlightPluginState = {
  ranges: PlainHighlightRange[];
  decos: DecorationSet;
};

export const articleHighlightPluginKey = new PluginKey<HighlightPluginState>(
  "articleHighlightPlugin",
);

/** Dispatch `tr.setMeta(ARTICLE_HIGHLIGHT_RANGES_META, ranges)` to update highlights. */
export const ARTICLE_HIGHLIGHT_RANGES_META = "articleHighlightRanges";

function buildDecorationSet(
  doc: Node,
  ranges: PlainHighlightRange[],
): DecorationSet {
  const decos: Decoration[] = [];
  for (const r of ranges) {
    const mapped = plainRangeToDocRange(
      doc,
      r.start,
      r.end,
      TIPTAP_PLAIN_BLOCK_SEPARATOR,
    );
    if (mapped && mapped.from < mapped.to) {
      decos.push(
        Decoration.inline(mapped.from, mapped.to, {
          class: "article-highlight-deco",
        }),
      );
    }
  }
  return DecorationSet.create(doc, decos);
}

export const ArticleHighlightDecorations = Extension.create({
  name: "articleHighlightDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin<HighlightPluginState>({
        key: articleHighlightPluginKey,
        state: {
          init: (_, state) => {
            const ranges: PlainHighlightRange[] = [];
            return {
              ranges,
              decos: buildDecorationSet(state.doc, ranges),
            };
          },
          apply: (tr, value, _, newState) => {
            const meta = tr.getMeta(ARTICLE_HIGHLIGHT_RANGES_META) as
              | PlainHighlightRange[]
              | undefined;
            const ranges =
              meta !== undefined ? meta : value.ranges;
            return {
              ranges,
              decos: buildDecorationSet(newState.doc, ranges),
            };
          },
        },
        props: {
          decorations(state) {
            return articleHighlightPluginKey.getState(state)?.decos ?? null;
          },
        },
      }),
    ];
  },
});
