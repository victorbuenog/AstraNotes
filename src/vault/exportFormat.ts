/**
 * Vault export/import (refined FR7). Plaintext JSON after client decrypt —
 * anyone with the file can read notes; export shows a confirmation in the UI.
 */
import type { Note } from '../types/note'
import { migrateNoteShape } from '../types/note'

export const VAULT_EXPORT_FORMAT_VERSION = 1 as const

export type VaultExportV1 = {
  formatVersion: typeof VAULT_EXPORT_FORMAT_VERSION
  exportedAt: string
  app: 'astranotes'
  notes: Note[]
}

export function buildVaultExport(notes: Note[]): VaultExportV1 {
  return {
    formatVersion: VAULT_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'astranotes',
    notes: notes.map((n) => migrateNoteShape({ ...n })),
  }
}

export function serializeVaultExport(data: VaultExportV1): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

export type ParseVaultResult =
  | { ok: true; data: VaultExportV1 }
  | { ok: false; error: string }

function isNoteish(x: unknown): x is Note {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.archived === 'boolean' &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number' &&
    o.document !== undefined
  )
}

export function parseVaultImportJson(text: string): ParseVaultResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Export root must be a JSON object.' }
  }
  const root = parsed as Record<string, unknown>
  if (root.formatVersion !== VAULT_EXPORT_FORMAT_VERSION) {
    return {
      ok: false,
      error: `Unsupported or missing formatVersion (expected ${VAULT_EXPORT_FORMAT_VERSION}).`,
    }
  }
  if (root.app !== 'astranotes') {
    return { ok: false, error: 'Missing or unknown app field.' }
  }
  if (!Array.isArray(root.notes)) {
    return { ok: false, error: 'Export must include a "notes" array.' }
  }
  const notes: Note[] = []
  for (let i = 0; i < root.notes.length; i++) {
    const row = root.notes[i]
    if (!isNoteish(row)) {
      return { ok: false, error: `Invalid note at index ${i} (missing id, title, or document).` }
    }
    notes.push(migrateNoteShape(row))
  }
  return {
    ok: true,
    data: {
      formatVersion: VAULT_EXPORT_FORMAT_VERSION,
      exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : '',
      app: 'astranotes',
      notes,
    },
  }
}
