import { describe, expect, it } from 'vitest'
import { MAX_TAGS_PER_NOTE, normalizeTags, parseTagsFromInput } from './tags'

describe('tags', () => {
  it('normalizes case and dedupes', () => {
    expect(normalizeTags(['Work', 'work', ' Ideas '])).toEqual(['work', 'ideas'])
  })

  it('caps tag count', () => {
    const many = Array.from({ length: MAX_TAGS_PER_NOTE + 5 }, (_, i) => `t${i}`)
    expect(normalizeTags(many).length).toBe(MAX_TAGS_PER_NOTE)
  })

  it('parses comma-separated input', () => {
    expect(parseTagsFromInput('a, B , a')).toEqual(['a', 'b'])
  })
})
