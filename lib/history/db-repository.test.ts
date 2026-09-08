import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import * as dbActions from '@/lib/db/actions'
import type { Chat } from '@/lib/db/schema'

import { DbHistoryRepository } from './db-repository'
import type { HistoryChat } from './types'

vi.mock('@/lib/auth/get-current-user')
vi.mock('@/lib/db/actions')

const USER_ID = 'user-test-1'

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'chat-1',
    title: 'Test Chat',
    userId: USER_ID,
    visibility: 'private',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    pinnedAt: null,
    ...overrides
  }
}

describe('DbHistoryRepository', () => {
  let repo: DbHistoryRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new DbHistoryRepository()
    vi.mocked(getCurrentUserId).mockResolvedValue(USER_ID)
  })

  describe('listChats', () => {
    it('returns mapped chats when user is authenticated', async () => {
      const dbChats = [makeChat({ id: 'c1', title: 'A' })]
      vi.mocked(dbActions.listHistoryChats).mockResolvedValue({
        chats: dbChats,
        nextOffset: null
      })

      const result = await repo.listChats({ limit: 10, offset: 0 })

      expect(dbActions.listHistoryChats).toHaveBeenCalledWith(USER_ID, {
        limit: 10,
        offset: 0,
        query: undefined
      })
      expect(result.chats).toHaveLength(1)
      expect(result.chats[0].id).toBe('c1')
      expect(result.nextOffset).toBeNull()
    })

    it('forwards pagination and query options', async () => {
      vi.mocked(dbActions.listHistoryChats).mockResolvedValue({
        chats: [],
        nextOffset: null
      })

      await repo.listChats({ limit: 5, offset: 10, query: 'hello' })

      expect(dbActions.listHistoryChats).toHaveBeenCalledWith(USER_ID, {
        limit: 5,
        offset: 10,
        query: 'hello'
      })
    })

    it('returns empty result when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      const result = await repo.listChats()

      expect(result).toEqual({ chats: [], nextOffset: null })
      expect(dbActions.listHistoryChats).not.toHaveBeenCalled()
    })

    it('maps pinnedAt from DB chat to HistoryChat', async () => {
      const pinnedAt = new Date('2024-06-01T00:00:00Z')
      vi.mocked(dbActions.listHistoryChats).mockResolvedValue({
        chats: [makeChat({ pinnedAt })],
        nextOffset: null
      })

      const result = await repo.listChats()

      expect(result.chats[0].pinnedAt).toEqual(pinnedAt)
    })

    it('omits pinnedAt when DB value is null', async () => {
      vi.mocked(dbActions.listHistoryChats).mockResolvedValue({
        chats: [makeChat({ pinnedAt: null })],
        nextOffset: null
      })

      const result = await repo.listChats()

      expect(result.chats[0].pinnedAt).toBeUndefined()
    })
  })

  describe('getChat', () => {
    it('returns mapped chat when found', async () => {
      const dbChat = makeChat()
      vi.mocked(dbActions.getChat).mockResolvedValue(dbChat)

      const result = await repo.getChat('chat-1')

      expect(dbActions.getChat).toHaveBeenCalledWith('chat-1', USER_ID)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('chat-1')
    })

    it('returns null when chat does not exist', async () => {
      vi.mocked(dbActions.getChat).mockResolvedValue(null)

      const result = await repo.getChat('missing')

      expect(result).toBeNull()
    })

    it('returns null when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      const result = await repo.getChat('chat-1')

      expect(result).toBeNull()
      expect(dbActions.getChat).not.toHaveBeenCalled()
    })
  })

  describe('saveChat', () => {
    it('calls upsertHistoryChat and returns mapped chat', async () => {
      const chat: HistoryChat = {
        id: 'chat-1',
        title: 'Saved',
        createdAt: new Date('2024-01-01T00:00:00Z')
      }
      const saved = makeChat({ title: 'Saved' })
      vi.mocked(dbActions.upsertHistoryChat).mockResolvedValue(saved)

      const result = await repo.saveChat(chat)

      expect(dbActions.upsertHistoryChat).toHaveBeenCalledWith(USER_ID, {
        id: 'chat-1',
        title: 'Saved',
        createdAt: chat.createdAt,
        pinnedAt: null
      })
      expect(result.id).toBe('chat-1')
    })

    it('throws when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      const chat: HistoryChat = {
        id: 'chat-1',
        title: 'X',
        createdAt: new Date()
      }

      await expect(repo.saveChat(chat)).rejects.toThrow('User not authenticated')
    })
  })

  describe('deleteChat', () => {
    it('calls deleteChat action', async () => {
      vi.mocked(dbActions.deleteChat).mockResolvedValue({ success: true })

      await repo.deleteChat('chat-1')

      expect(dbActions.deleteChat).toHaveBeenCalledWith('chat-1', USER_ID)
    })

    it('is a no-op when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      await repo.deleteChat('chat-1')

      expect(dbActions.deleteChat).not.toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('calls deleteUserChats action', async () => {
      vi.mocked(dbActions.deleteUserChats).mockResolvedValue({ success: true })

      await repo.clearAll()

      expect(dbActions.deleteUserChats).toHaveBeenCalledWith(USER_ID)
    })

    it('is a no-op when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      await repo.clearAll()

      expect(dbActions.deleteUserChats).not.toHaveBeenCalled()
    })
  })

  describe('pinChat', () => {
    it('pins a chat by passing a Date to pinHistoryChat', async () => {
      vi.mocked(dbActions.pinHistoryChat).mockResolvedValue(undefined)

      await repo.pinChat('chat-1', true)

      expect(dbActions.pinHistoryChat).toHaveBeenCalledWith(
        'chat-1',
        USER_ID,
        expect.any(Date)
      )
    })

    it('unpins a chat by passing null to pinHistoryChat', async () => {
      vi.mocked(dbActions.pinHistoryChat).mockResolvedValue(undefined)

      await repo.pinChat('chat-1', false)

      expect(dbActions.pinHistoryChat).toHaveBeenCalledWith(
        'chat-1',
        USER_ID,
        null
      )
    })

    it('is a no-op when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined)

      await repo.pinChat('chat-1', true)

      expect(dbActions.pinHistoryChat).not.toHaveBeenCalled()
    })
  })
})
