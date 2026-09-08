/**
 * History repository factory.
 *
 * Detects which storage backend is available and returns the appropriate
 * HistoryRepository implementation.
 *
 * Mode resolution:
 *   - Server side: reads `DATABASE_URL` directly.
 *   - Client side: reads `NEXT_PUBLIC_HISTORY_MODE`, which next.config.mjs
 *     derives from `DATABASE_URL` at server-start time and injects into
 *     client bundles.
 *
 * Usage:
 *   const repo = getHistoryRepository()
 */

import { DbHistoryRepository } from './db-repository'
import { IdbHistoryRepository } from './idb-repository'
import type { HistoryRepository } from './types'

/** The two supported storage backends for chat history. */
export type HistoryMode = 'db' | 'idb'

/**
 * Return the active history mode.
 *
 * Server: checks `process.env.DATABASE_URL`.
 * Client: reads `process.env.NEXT_PUBLIC_HISTORY_MODE` (baked in by next.config.mjs).
 */
export function getHistoryMode(): HistoryMode {
  if (typeof window === 'undefined') {
    // Server-side: authoritative check
    return process.env.DATABASE_URL ? 'db' : 'idb'
  }
  // Client-side: rely on the public env var set in next.config.mjs
  return process.env.NEXT_PUBLIC_HISTORY_MODE === 'idb' ? 'idb' : 'db'
}

/**
 * Return a HistoryRepository for the current storage mode.
 *
 * - `"db"` → DbHistoryRepository (server-side DB; user-scoped via auth session)
 * - `"idb"` → IdbHistoryRepository (browser IndexedDB; no auth required)
 */
export function getHistoryRepository(): HistoryRepository {
  if (getHistoryMode() === 'db') {
    return new DbHistoryRepository()
  }
  return new IdbHistoryRepository()
}
