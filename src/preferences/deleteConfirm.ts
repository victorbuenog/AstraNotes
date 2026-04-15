/** Per signed-in user: skip the permanent-delete confirmation dialog. */

const STORAGE_PREFIX = 'astranotes.skipDeleteConfirm'

function storageKey(username: string | undefined): string {
  const u = username?.trim() || '_'
  return `${STORAGE_PREFIX}:${u}`
}

export function shouldSkipDeleteConfirm(username: string | undefined): boolean {
  try {
    return localStorage.getItem(storageKey(username)) === '1'
  } catch {
    return false
  }
}

export function setSkipDeleteConfirm(username: string | undefined, skip: boolean): void {
  try {
    const key = storageKey(username)
    if (skip) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* ignore quota / private mode */
  }
}
