import { describe, expect, it } from 'vitest'
import { applyMarkdownListEnter } from './markdownListEnter'

function applyAtEnd(text: string): ReturnType<typeof applyMarkdownListEnter> {
  const pos = text.length
  return applyMarkdownListEnter(text, pos, pos)
}

describe('applyMarkdownListEnter', () => {
  it('continues unordered list with new marker', () => {
    const r = applyAtEnd('- one')
    expect(r).not.toBeNull()
    expect(r!.value).toBe('- one\n- ')
    expect(r!.selectionStart).toBe(r!.value.length)
  })

  it('continues ordered list with incremented number', () => {
    const r = applyAtEnd('1. first')
    expect(r).not.toBeNull()
    expect(r!.value).toBe('1. first\n2. ')
  })

  it('removes empty unordered item (exit list)', () => {
    const r = applyAtEnd('- ')
    expect(r).not.toBeNull()
    expect(r!.value).toBe('')
    expect(r!.selectionStart).toBe(0)
  })

  it('removes empty ordered item', () => {
    const r = applyAtEnd('2. ')
    expect(r).not.toBeNull()
    expect(r!.value).toBe('')
  })

  it('does not run when caret is not at end of line', () => {
    const text = '- one'
    const r = applyMarkdownListEnter(text, 1, 1)
    expect(r).toBeNull()
  })

  it('preserves indent for unordered', () => {
    const r = applyAtEnd('  - item')
    expect(r!.value).toBe('  - item\n  - ')
  })
})
