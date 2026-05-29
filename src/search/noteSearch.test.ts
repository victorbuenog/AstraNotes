import { describe, expect, it } from 'vitest'
import { newNote, setPrimaryMarkdown } from '../types/note'
import { MAX_SEARCH_QUERY_LENGTH, clampSearchQuery, noteMatchesSearch, collectAllTags } from './noteSearch'

describe('clampSearchQuery', () => {
  it('returns string as-is when within limit', () => {
    expect(clampSearchQuery('hello')).toBe('hello')
  })

  it('truncates string longer than MAX_SEARCH_QUERY_LENGTH', () => {
    const long = 'a'.repeat(MAX_SEARCH_QUERY_LENGTH + 10)
    expect(clampSearchQuery(long)).toHaveLength(MAX_SEARCH_QUERY_LENGTH)
  })
})

describe('noteMatchesSearch', () => {
  function makeNote(title: string, body?: string) {
    let n = newNote({ title })
    if (body) n = setPrimaryMarkdown(n, body)
    return n
  }

  it('matches all notes on empty query', () => {
    expect(noteMatchesSearch(makeNote('Anything'), '')).toBe(true)
  })

  it('matches all notes on whitespace-only query', () => {
    expect(noteMatchesSearch(makeNote('Anything'), '   ')).toBe(true)
  })

  it('matches case-insensitive on title', () => {
    expect(noteMatchesSearch(makeNote('Hello World'), 'hello')).toBe(true)
    expect(noteMatchesSearch(makeNote('Hello World'), 'WORLD')).toBe(true)
  })

  it('matches case-insensitive on body', () => {
    expect(noteMatchesSearch(makeNote('Title', 'Body text here'), 'body')).toBe(true)
    expect(noteMatchesSearch(makeNote('Title', 'Body text here'), 'HERE')).toBe(true)
  })

  it('returns false when query matches nothing', () => {
    expect(noteMatchesSearch(makeNote('Hello'), 'zzzz')).toBe(false)
  })

  it('handles unicode characters in query', () => {
    expect(noteMatchesSearch(makeNote('Café'), 'café')).toBe(true)
    expect(noteMatchesSearch(makeNote('Café'), 'CAFÉ')).toBe(true)
  })

  it('handles punctuation and special characters', () => {
    const n = makeNote('Foo bar', 'hello-world test_fn(x)')
    expect(noteMatchesSearch(n, 'hello-world')).toBe(true)
    expect(noteMatchesSearch(n, 'test_fn')).toBe(true)
  })

  it('clamps long query before matching', () => {
    const n = makeNote('Short')
    const longQuery = 'a'.repeat(MAX_SEARCH_QUERY_LENGTH + 5)
    expect(noteMatchesSearch(n, longQuery)).toBe(false)
  })

  it('matches when query equals the entire title', () => {
    expect(noteMatchesSearch(makeNote('Exact'), 'exact')).toBe(true)
  })

  it('matches on body when title does not match', () => {
    expect(noteMatchesSearch(makeNote('Title here', 'Unique body text'), 'unique')).toBe(true)
  })
})

describe('collectAllTags', () => {
  it('dedupes and sorts tags alphabetically', () => {
    const a = newNote({ title: 'A', tags: ['work', 'urgent'] })
    const b = newNote({ title: 'B', tags: ['urgent', 'personal'] })
    expect(collectAllTags([a, b])).toEqual(['personal', 'urgent', 'work'])
  })

  it('returns empty array for notes without tags', () => {
    const a = newNote({ title: 'A' })
    const b = newNote({ title: 'B' })
    expect(collectAllTags([a, b])).toEqual([])
  })

  it('returns empty array for empty notes array', () => {
    expect(collectAllTags([])).toEqual([])
  })
})
