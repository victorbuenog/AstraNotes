/** Tag rules aligned with refined FR2b (dedupe, case-fold, limits). */

export const MAX_TAGS_PER_NOTE = 32
export const MAX_TAG_LENGTH = 40

/** Lowercase, trim, drop empties, dedupe while preserving first-seen order. */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of raw) {
    const s = t.trim().toLowerCase().slice(0, MAX_TAG_LENGTH)
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= MAX_TAGS_PER_NOTE) break
  }
  return out
}

/** Parse comma/semicolon/newline–separated tags (multi-word segments stay one tag). */
export function parseTagsFromInput(input: string): string[] {
  const parts = input.split(/[,;\n]+/).map((p) => p.trim())
  return normalizeTags(parts)
}
