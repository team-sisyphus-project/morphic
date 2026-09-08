import { beforeEach, describe, expect, it } from 'vitest'

import 'fake-indexeddb/auto'

import { IdbHistoryRepository } from './idb-repository'
import type { HistoryChat } from './types'

// fake-indexeddb/auto patches globalThis with a fake IndexedDB implementation.
// We give each test its own database name so tests are fully isolated without
// needing to reset the IDBFactory global between runs.

let testCounter = 0

function makeRepo(): IdbHistoryRepository {
  testCounter++
  return new IdbHistoryRepository(`morphic-history-test-${testCounter}`)
}

function makeChat(overrides: Partial<HistoryChat> = {}): HistoryChat {
  return {
    id: 'chat-1',
    title: 'Test Chat',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides
  }
}

describe('IdbHistoryRepository', () => {
  let repo: IdbHistoryRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  // ---------------------------------------------------------------------------
  // listChats
  // ---------------------------------------------------------------------------

  describe('listChats', () => {
    it('returns empty result when store is empty', async () => {
      const result = await repo.listChats()
      expect(result.chats).toHaveLength(0)
      expect(result.nextOffset).toBeNull()
    })

    it('returns saved chats newest-first', async () => {
      await repo.saveChat(makeChat({ id: 'a', createdAt: new Date('2024-01-01') }))
      await repo.saveChat(makeChat({ id: 'b', createdAt: new Date('2024-02-01') }))
      await repo.saveChat(makeChat({ id: 'c', createdAt: new Date('2024-03-01') }))

      const result = await repo.listChats()

      expect(result.chats.map(c => c.id)).toEqual(['c', 'b', 'a'])
    })

    it('places pinned chats before unpinned chats', async () => {
      await repo.saveChat(makeChat({ id: 'unpinned', createdAt: new Date('2024-03-01') }))
      await repo.saveChat(makeChat({
        id: 'pinned',
        createdAt: new Date('2024-01-01'),
        pinnedAt: new Date('2024-04-01')
      }))

      const result = await repo.listChats()

      expect(result.chats[0].id).toBe('pinned')
      expect(result.chats[1].id).toBe('unpinned')
    })

    it('sorts multiple pinned chats by pinnedAt ascending', async () => {
      await repo.saveChat(makeChat({
        id: 'pin-later',
        createdAt: new Date('2024-01-01'),
        pinnedAt: new Date('2024-05-01')
      }))
      await repo.saveChat(makeChat({
        id: 'pin-earlier',
        createdAt: new Date('2024-02-01'),
        pinnedAt: new Date('2024-04-01')
      }))

      const result = await repo.listChats()

      expect(result.chats[0].id).toBe('pin-earlier')
      expect(result.chats[1].id).toBe('pin-later')
    })

    it('filters by query (case-insensitive)', async () => {
      await repo.saveChat(makeChat({ id: 'a', title: 'Hello World' }))
      await repo.saveChat(makeChat({ id: 'b', title: 'Goodbye' }))

      const result = await repo.listChats({ query: 'hello' })

      expect(result.chats).toHaveLength(1)
      expect(result.chats[0].id).toBe('a')
    })

    it('applies limit and returns nextOffset when more results exist', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.saveChat(makeChat({
          id: `chat-${i}`,
          createdAt: new Date(`2024-0${i}-01`)
        }))
      }

      const result = await repo.listChats({ limit: 2, offset: 0 })

      expect(result.chats).toHaveLength(2)
      expect(result.nextOffset).toBe(2)
    })

    it('returns null nextOffset on the last page', async () => {
      await repo.saveChat(makeChat({ id: 'a' }))
      await repo.saveChat(makeChat({ id: 'b', createdAt: new Date('2024-02-01') }))

      const result = await repo.listChats({ limit: 10, offset: 0 })

      expect(result.chats).toHaveLength(2)
      expect(result.nextOffset).toBeNull()
    })

    it('respects offset for pagination', async () => {
      for (let i = 1; i <= 4; i++) {
        await repo.saveChat(makeChat({
          id: `chat-${i}`,
          createdAt: new Date(`2024-0${i}-01`)
        }))
      }

      const page1 = await repo.listChats({ limit: 2, offset: 0 })
      const page2 = await repo.listChats({ limit: 2, offset: 2 })

      expect(page1.chats).toHaveLength(2)
      expect(page2.chats).toHaveLength(2)
      // Pages should not overlap
      const page1Ids = page1.chats.map(c => c.id)
      const page2Ids = page2.chats.map(c => c.id)
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // getChat
  // ---------------------------------------------------------------------------

  describe('getChat', () => {
    it('returns null when chat does not exist', async () => {
      const result = await repo.getChat('nonexistent')
      expect(result).toBeNull()
    })

    it('returns the saved chat by id', async () => {
      const chat = makeChat({ id: 'found', title: 'Found Chat' })
      await repo.saveChat(chat)

      const result = await repo.getChat('found')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('found')
      expect(result!.title).toBe('Found Chat')
    })

    it('preserves createdAt as a Date', async () => {
      const chat = makeChat({ createdAt: new Date('2024-06-15T12:00:00Z') })
      await repo.saveChat(chat)

      const result = await repo.getChat(chat.id)

      expect(result!.createdAt).toBeInstanceOf(Date)
      expect(result!.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z')
    })

    it('preserves pinnedAt when set', async () => {
      const pinnedAt = new Date('2024-07-01T09:00:00Z')
      const chat = makeChat({ pinnedAt })
      await repo.saveChat(chat)

      const result = await repo.getChat(chat.id)

      expect(result!.pinnedAt).toBeInstanceOf(Date)
      expect(result!.pinnedAt!.toISOString()).toBe('2024-07-01T09:00:00.000Z')
    })

    it('returns undefined pinnedAt when not set', async () => {
      await repo.saveChat(makeChat({ id: 'unpinned' }))
      const result = await repo.getChat('unpinned')
      expect(result!.pinnedAt).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // saveChat
  // ---------------------------------------------------------------------------

  describe('saveChat', () => {
    it('returns the saved chat', async () => {
      const chat = makeChat()
      const result = await repo.saveChat(chat)
      expect(result).toEqual(chat)
    })

    it('replaces an existing chat on second save', async () => {
      const original = makeChat({ title: 'Original' })
      await repo.saveChat(original)

      const updated = { ...original, title: 'Updated' }
      await repo.saveChat(updated)

      const found = await repo.getChat(original.id)
      expect(found!.title).toBe('Updated')
    })

    it('does not merge — fully replaces (pinnedAt cleared on re-save without it)', async () => {
      const withPin = makeChat({ pinnedAt: new Date('2024-01-01') })
      await repo.saveChat(withPin)

      // Save again without pinnedAt
      const withoutPin = makeChat()
      await repo.saveChat(withoutPin)

      const found = await repo.getChat(withoutPin.id)
      expect(found!.pinnedAt).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // deleteChat
  // ---------------------------------------------------------------------------

  describe('deleteChat', () => {
    it('removes the chat from the store', async () => {
      await repo.saveChat(makeChat({ id: 'to-delete' }))
      await repo.deleteChat('to-delete')

      const result = await repo.getChat('to-delete')
      expect(result).toBeNull()
    })

    it('resolves without error when chat does not exist', async () => {
      await expect(repo.deleteChat('ghost')).resolves.toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // clearAll
  // ---------------------------------------------------------------------------

  describe('clearAll', () => {
    it('removes all chats', async () => {
      await repo.saveChat(makeChat({ id: 'a' }))
      await repo.saveChat(makeChat({ id: 'b', createdAt: new Date('2024-02-01') }))

      await repo.clearAll()

      const result = await repo.listChats()
      expect(result.chats).toHaveLength(0)
    })

    it('resolves without error when store is already empty', async () => {
      await expect(repo.clearAll()).resolves.toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // pinChat
  // ---------------------------------------------------------------------------

  describe('pinChat', () => {
    it('sets pinnedAt when pinned=true', async () => {
      await repo.saveChat(makeChat({ id: 'chat-pin' }))

      await repo.pinChat('chat-pin', true)

      const result = await repo.getChat('chat-pin')
      expect(result!.pinnedAt).toBeInstanceOf(Date)
    })

    it('clears pinnedAt when pinned=false', async () => {
      const chat = makeChat({
        id: 'chat-unpin',
        pinnedAt: new Date('2024-01-01')
      })
      await repo.saveChat(chat)

      await repo.pinChat('chat-unpin', false)

      const result = await repo.getChat('chat-unpin')
      expect(result!.pinnedAt).toBeUndefined()
    })

    it('resolves without error when chat does not exist', async () => {
      await expect(repo.pinChat('ghost', true)).resolves.toBeUndefined()
    })

    it('pinned chats surface first in listChats after pinChat', async () => {
      await repo.saveChat(makeChat({ id: 'old', createdAt: new Date('2024-01-01') }))
      await repo.saveChat(makeChat({ id: 'new', createdAt: new Date('2024-12-01') }))

      // Pin the older chat
      await repo.pinChat('old', true)

      const result = await repo.listChats()
      expect(result.chats[0].id).toBe('old')
    })
  })
})

// ---------------------------------------------------------------------------
// Integration: pin survives simulated page reload
// ---------------------------------------------------------------------------

describe('IdbHistoryRepository — integration: pin persists across reload', () => {
  it('pinned chat stays at position 0 after creating a fresh repository instance (simulated reload)', async () => {
    // Use a unique, stable db name shared between both repo instances
    const sharedDbName = `morphic-history-reload-test-${Date.now()}`

    // --- Session 1: save chats and pin the older one ---
    const session1 = new IdbHistoryRepository(sharedDbName)
    await session1.saveChat(makeChat({ id: 'older', createdAt: new Date('2024-01-01') }))
    await session1.saveChat(makeChat({ id: 'newer', createdAt: new Date('2024-12-01') }))
    await session1.pinChat('older', true)

    // --- Session 2: fresh instance with the same db name (simulates page reload) ---
    const session2 = new IdbHistoryRepository(sharedDbName)
    const result = await session2.listChats()

    expect(result.chats).toHaveLength(2)
    expect(result.chats[0].id).toBe('older')
    expect(result.chats[0].pinnedAt).toBeInstanceOf(Date)
    expect(result.chats[1].id).toBe('newer')
    expect(result.chats[1].pinnedAt).toBeUndefined()
  })
})
