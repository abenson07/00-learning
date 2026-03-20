import type { Node } from "@tiptap/pm/model";

/** Must match TipTap / ProseMirror `textBetween` when serializing the full document. */
export const TIPTAP_PLAIN_BLOCK_SEPARATOR = "\n\n";

export function normalizePlainText(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

export function pmDocPlainText(
  doc: Node,
  blockSeparator = TIPTAP_PLAIN_BLOCK_SEPARATOR,
): string {
  return doc.textBetween(0, doc.content.size, blockSeparator);
}

export function docRangeToPlainOffsets(
  doc: Node,
  from: number,
  to: number,
  blockSeparator = TIPTAP_PLAIN_BLOCK_SEPARATOR,
): { start: number; end: number } | null {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  if (a === b) {
    return null;
  }
  return {
    start: doc.textBetween(0, a, blockSeparator).length,
    end: doc.textBetween(0, b, blockSeparator).length,
  };
}

/**
 * Map plain-text offsets (same indexing as `content_version.plain_text`) to the
 * smallest ProseMirror span whose `textBetween(from, to)` equals
 * `plain_text.slice(start, end)`.
 *
 * Some substrings are not representable as a single contiguous PM range (e.g. a
 * single "\n" inside the block separator). Those return `null`; decorations and
 * creates that rely on this should skip or reject.
 */
export function plainRangeToDocRange(
  doc: Node,
  start: number,
  end: number,
  blockSeparator = TIPTAP_PLAIN_BLOCK_SEPARATOR,
): { from: number; to: number } | null {
  const full = pmDocPlainText(doc, blockSeparator);
  if (start < 0 || end > full.length || start >= end) {
    return null;
  }
  const target = full.slice(start, end);
  const n = doc.content.size;
  let best: { from: number; to: number; width: number } | null = null;

  for (let from = 0; from <= n; from++) {
    for (let to = from; to <= n; to++) {
      if (doc.textBetween(from, to, blockSeparator) !== target) {
        continue;
      }
      const width = to - from;
      if (
        !best ||
        width < best.width ||
        (width === best.width && from < best.from)
      ) {
        best = { from, to, width };
      }
    }
  }

  return best ? { from: best.from, to: best.to } : null;
}
