import { describe, expect, it } from 'vitest'
import {
  MAX_TAGS_PER_NOTE,
  MAX_TAG_LENGTH,
  normalizeTags,
  parseTagsFromInput,
} from './tags'

describe('tags', () => {
  describe('normalizeTags', () => {
    it('normalizes case and dedupes', () => {
      expect(normalizeTags(['Work', 'work', ' Ideas '])).toEqual(['work', 'ideas'])
    })

    it('caps tag count at MAX_TAGS_PER_NOTE', () => {
      const many = Array.from({ length: MAX_TAGS_PER_NOTE + 5 }, (_, i) => `t${i}`)
      expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_NOTE)
    })

    it('preserves order of first occurrence', () => {
      expect(normalizeTags(['z', 'y', 'z', 'x'])).toEqual(['z', 'y', 'x'])
    })

    it('drops empty and whitespace-only tags', () => {
      expect(normalizeTags(['', '  ', 'a', ''])).toEqual(['a'])
    })

    it('truncates tags longer than MAX_TAG_LENGTH', () => {
      const long = 'a'.repeat(MAX_TAG_LENGTH + 10)
      expect(normalizeTags([long])[0]).toHaveLength(MAX_TAG_LENGTH)
    })

    it('handles empty array', () => {
      expect(normalizeTags([])).toEqual([])
    })
  })

  describe('parseTagsFromInput', () => {
    it('parses comma-separated input', () => {
      expect(parseTagsFromInput('a, B , a')).toEqual(['a', 'b'])
    })

    it('parses semicolon-separated input', () => {
      expect(parseTagsFromInput('alpha; beta; Alpha')).toEqual(['alpha', 'beta'])
    })

    it('parses newline-separated input', () => {
      expect(parseTagsFromInput('x\ny\nx')).toEqual(['x', 'y'])
    })

    it('returns empty array for empty string', () => {
      expect(parseTagsFromInput('')).toEqual([])
    })

    it('returns empty array for whitespace-only string', () => {
      expect(parseTagsFromInput('   ')).toEqual([])
    })
  })
})
