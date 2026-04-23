import { describe, expect, it } from 'vitest'
import { readEditorAppearance, writeEditorAppearance } from './editorAppearance'

describe('editorAppearance preferences', () => {
  it('returns defaults when storage is empty', () => {
    localStorage.clear()
    expect(readEditorAppearance()).toEqual({
      noteFontFamily: 'mono',
      noteFontSizePx: 14,
    })
  })

  it('persists and clamps values', () => {
    localStorage.clear()
    writeEditorAppearance({ noteFontFamily: 'serif', noteFontSizePx: 999 })
    expect(readEditorAppearance()).toEqual({
      noteFontFamily: 'serif',
      noteFontSizePx: 22,
    })
  })
})
