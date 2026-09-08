/**
 * Browser-only HistoryRepository backed by IndexedDB.
 *
 * Uses the `idb` wrapper for a typed, promise-based API.
 * No Next.js server imports — this module is safe to use in client-only code.
 */

import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'

import type {
  HistoryChat,
  HistoryRepository,
  ListChatsOptions,
  ListChatsResult
} from './types'

export const HISTORY_DB_NAME = 'morphic-history'
const DB_VERSION = 1

/** Shape of what is persisted in IDB (dates stored as ISO strings). */
interface StoredChat {
  id: string
  title: string
  createdAt: string
  pinnedAt?: string
}

interface MorphicHistoryDB extends DBSchema {
  chats: {
    key: string
    value: StoredChat
  }
}

function openHistoryDB(
  name: string = HISTORY_DB_NAME
): Promise<IDBPDatabase<MorphicHistoryDB>> {
  return openDB<MorphicHistoryDB>(name, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('chats', { keyPath: 'id' })
    }
  })
}

function toStored(chat: HistoryChat): StoredChat {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    ...(chat.pinnedAt != null ? { pinnedAt: chat.pinnedAt.toISOString() } : {})
  }
}

function fromStored(stored: StoredChat): HistoryChat {
  return {
    id: stored.id,
    title: stored.title,
    createdAt: new Date(stored.createdAt),
    ...(stored.pinnedAt != null ? { pinnedAt: new Date(stored.pinnedAt) } : {})
  }
}

/**
 * Sort comparator: pinned chats first (by pinnedAt ascending), then by
 * createdAt descending — mirroring the DB repository's ordering.
 */
function sortChats(a: HistoryChat, b: HistoryChat): number {
  const aPinned = a.pinnedAt != null
  const bPinned = b.pinnedAt != null

  if (aPinned !== bPinned) {
    return aPinned ? -1 : 1
  }
  if (aPinned && bPinned) {
    // Both pinned: earliest pinnedAt first
    return a.pinnedAt!.getTime() - b.pinnedAt!.getTime()
  }
  // Both unpinned: newest createdAt first
  return b.createdAt.getTime() - a.createdAt.getTime()
}

/**
 * HistoryRepository implementation backed by IndexedDB.
 *
 * This is a browser-only implementation — do not import from server code.
 * User identity is not required; the store is inherently per-browser-profile.
 *
 * @param dbName Override the IndexedDB database name (used in tests for isolation).
 */
export class IdbHistoryRepository implements HistoryRepository {
  private readonly dbName: string

  constructor(dbName: string = HISTORY_DB_NAME) {
    this.dbName = dbName
  }

  private db(): Promise<IDBPDatabase<MorphicHistoryDB>> {
    return openHistoryDB(this.dbName)
  }

  async listChats(options: ListChatsOptions = {}): Promise<ListChatsResult> {
    const { limit = 20, offset = 0, query } = options
    const db = await this.db()

    const all = await db.getAll('chats')
    let chats = all.map(fromStored)

    if (query) {
      const q = query.toLowerCase()
      chats = chats.filter(c => c.title.toLowerCase().includes(q))
    }

    chats.sort(sortChats)

    const page = chats.slice(offset, offset + limit)
    const nextOffset =
      offset + limit < chats.length ? offset + limit : null

    return { chats: page, nextOffset }
  }

  async getChat(id: string): Promise<HistoryChat | null> {
    const db = await this.db()
    const stored = await db.get('chats', id)
    if (!stored) return null
    return fromStored(stored)
  }

  async saveChat(chat: HistoryChat): Promise<HistoryChat> {
    const db = await this.db()
    await db.put('chats', toStored(chat))
    return chat
  }

  async deleteChat(id: string): Promise<void> {
    const db = await this.db()
    await db.delete('chats', id)
  }

  async clearAll(): Promise<void> {
    const db = await this.db()
    await db.clear('chats')
  }

  async pinChat(id: string, pinned: boolean): Promise<void> {
    const db = await this.db()
    const stored = await db.get('chats', id)
    if (!stored) return

    if (pinned) {
      stored.pinnedAt = new Date().toISOString()
    } else {
      delete stored.pinnedAt
    }

    await db.put('chats', stored)
  }
}
