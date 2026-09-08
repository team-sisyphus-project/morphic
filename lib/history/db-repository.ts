import { getCurrentUserId } from '@/lib/auth/get-current-user'
import * as dbActions from '@/lib/db/actions'
import type { Chat } from '@/lib/db/schema'

import type {
  HistoryChat,
  HistoryRepository,
  ListChatsOptions,
  ListChatsResult
} from './types'

function toHistoryChat(chat: Chat): HistoryChat {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    ...(chat.pinnedAt != null ? { pinnedAt: chat.pinnedAt } : {})
  }
}

/**
 * HistoryRepository implementation backed by the PostgreSQL database.
 *
 * User identity is resolved internally via getCurrentUserId() on every call.
 * When no authenticated user is present, read operations return empty results
 * and write operations are no-ops (or throw for saveChat).
 */
export class DbHistoryRepository implements HistoryRepository {
  async listChats(options: ListChatsOptions = {}): Promise<ListChatsResult> {
    const userId = await getCurrentUserId()
    if (!userId) return { chats: [], nextOffset: null }

    const { limit = 20, offset = 0, query } = options
    const result = await dbActions.listHistoryChats(userId, {
      limit,
      offset,
      query
    })

    return {
      chats: result.chats.map(toHistoryChat),
      nextOffset: result.nextOffset
    }
  }

  async getChat(id: string): Promise<HistoryChat | null> {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const chat = await dbActions.getChat(id, userId)
    if (!chat) return null
    return toHistoryChat(chat)
  }

  async saveChat(chat: HistoryChat): Promise<HistoryChat> {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('User not authenticated')

    const saved = await dbActions.upsertHistoryChat(userId, {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      pinnedAt: chat.pinnedAt ?? null
    })
    return toHistoryChat(saved)
  }

  async deleteChat(id: string): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) return

    await dbActions.deleteChat(id, userId)
  }

  async clearAll(): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) return

    await dbActions.deleteUserChats(userId)
  }

  async pinChat(id: string, pinned: boolean): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) return

    const pinnedAt = pinned ? new Date() : null
    await dbActions.pinHistoryChat(id, userId, pinnedAt)
  }
}
