/**
 * Markdown list continuation on Enter (textarea).
 * - Non-empty list line → newline + same list prefix (ordered lists increment).
 * - Empty list item → exit list (remove marker; second Enter from continued empty item).
 */

/** Unordered list line: indent, bullet, optional content after mandatory space(s). */
const UNORDERED = /^(\s*)([-*+])(?:\s+(.*))?$/
const ORDERED = /^(\s*)(\d+)\.(?:\s+(.*))?$/

function lineBounds(text: string, caret: number): { start: number; end: number; line: string } {
  const before = text.lastIndexOf('\n', caret - 1)
  const start = before === -1 ? 0 : before + 1
  const after = text.indexOf('\n', caret)
  const end = after === -1 ? text.length : after
  return { start, end, line: text.slice(start, end) }
}

export function applyMarkdownListEnter(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; selectionStart: number; selectionEnd: number } | null {
  if (selectionStart !== selectionEnd) return null

  const { start, end, line } = lineBounds(value, selectionStart)
  const offsetInLine = selectionStart - start

  // Only act when caret is at end of line (standard editor behavior for "new line")
  if (offsetInLine !== line.length) return null

  let m = line.match(UNORDERED)
  if (m) {
    const indent = m[1]
    const bullet = m[2]
    const rest = m[3] ?? ''
    if (rest.trim() === '') {
      const newValue = value.slice(0, start) + value.slice(end)
      const pos = start
      return { value: newValue, selectionStart: pos, selectionEnd: pos }
    }
    const insert = `\n${indent}${bullet} `
    const newValue = value.slice(0, selectionStart) + insert + value.slice(selectionStart)
    const pos = selectionStart + insert.length
    return { value: newValue, selectionStart: pos, selectionEnd: pos }
  }

  m = line.match(ORDERED)
  if (m) {
    const indent = m[1]
    const num = parseInt(m[2], 10)
    const rest = m[3] ?? ''
    if (Number.isNaN(num)) return null
    if (rest.trim() === '') {
      const newValue = value.slice(0, start) + value.slice(end)
      const pos = start
      return { value: newValue, selectionStart: pos, selectionEnd: pos }
    }
    const insert = `\n${indent}${num + 1}. `
    const newValue = value.slice(0, selectionStart) + insert + value.slice(selectionStart)
    const pos = selectionStart + insert.length
    return { value: newValue, selectionStart: pos, selectionEnd: pos }
  }

  return null
}
