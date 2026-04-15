import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { SqliteJournalMode } from './db.js'

/**
 * SQLite WAL uses separate -wal/-shm files and mmap; it is not reliable on network
 * filesystems (SMB, NFS, many NAS mounts). DELETE journal mode is slower but safe.
 * See: https://www.sqlite.org/howtocorrupt.html — item 6 (concurrent access / network fs)
 */

function pathLooksLikeCloudSyncFolder(normalizedLower: string): boolean {
  return (
    normalizedLower.includes('onedrive') ||
    normalizedLower.includes('dropbox') ||
    normalizedLower.includes('icloud drive') ||
    normalizedLower.includes('google drive')
  )
}

/** Windows UNC: \\server\share\... */
function pathLooksLikeUnc(normalized: string): boolean {
  return normalized.startsWith('\\\\')
}

/**
 * Drive letter paths on Windows: ask the OS if the volume is a network (SMB) drive.
 * Catches “Z:” mapped to \\NAS\share where WAL would still be unsafe.
 */
function isWindowsNetworkMappedDrive(normalizedPath: string): boolean {
  if (process.platform !== 'win32') return false
  const m = /^([a-z]):\\/i.exec(normalizedPath)
  if (!m) return false
  const letter = m[1].toUpperCase()
  try {
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='${letter}:'").DriveType`,
      ],
      { encoding: 'utf8', timeout: 8000, windowsHide: true },
    ).trim()
    const driveType = parseInt(out, 10)
    // Win32_LogicalDisk.DriveType: 4 = Network Drive
    return driveType === 4
  } catch {
    return false
  }
}

/** When unset, pick a journal mode that won’t misbehave on SMB/NAS or cloud folders. */
export function suggestedSqliteJournalMode(dbFilePath: string): SqliteJournalMode {
  const normalized = path.normalize(dbFilePath)
  const lower = normalized.toLowerCase()

  if (pathLooksLikeCloudSyncFolder(lower)) return 'DELETE'
  if (pathLooksLikeUnc(normalized)) return 'DELETE'
  if (isWindowsNetworkMappedDrive(normalized)) return 'DELETE'

  return 'WAL'
}
