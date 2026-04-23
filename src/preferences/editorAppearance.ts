export type NoteFontFamily = 'mono' | 'sans' | 'serif'

export type EditorAppearance = {
  noteFontFamily: NoteFontFamily
  noteFontSizePx: number
}

const STORAGE_KEY = 'astranotes.editorAppearance.v1'
const DEFAULTS: EditorAppearance = {
  noteFontFamily: 'mono',
  noteFontSizePx: 14,
}
const NOTE_FONT_SIZE_MIN = 12
const NOTE_FONT_SIZE_MAX = 22

function clampNoteFontSize(size: number): number {
  return Math.min(NOTE_FONT_SIZE_MAX, Math.max(NOTE_FONT_SIZE_MIN, Math.round(size)))
}

export function readEditorAppearance(): EditorAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<EditorAppearance>
    const noteFontFamily =
      parsed.noteFontFamily === 'sans' || parsed.noteFontFamily === 'serif' || parsed.noteFontFamily === 'mono'
        ? parsed.noteFontFamily
        : DEFAULTS.noteFontFamily
    const noteFontSizePx =
      typeof parsed.noteFontSizePx === 'number'
        ? clampNoteFontSize(parsed.noteFontSizePx)
        : DEFAULTS.noteFontSizePx
    return { noteFontFamily, noteFontSizePx }
  } catch {
    return DEFAULTS
  }
}

export function writeEditorAppearance(next: EditorAppearance): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        noteFontFamily: next.noteFontFamily,
        noteFontSizePx: clampNoteFontSize(next.noteFontSizePx),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function noteFontFamilyToCssValue(font: NoteFontFamily): string {
  if (font === 'sans') return 'var(--font)'
  if (font === 'serif') return 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif'
  return 'var(--mono)'
}
