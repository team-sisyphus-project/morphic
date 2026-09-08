import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DbHistoryRepository } from './db-repository'
import { IdbHistoryRepository } from './idb-repository'

// getHistoryMode and getHistoryRepository are re-imported inside each test
// block after env vars are configured, to capture the env at call time.

describe('getHistoryMode', () => {
  describe('server-side (window is undefined)', () => {
    beforeEach(() => {
      // Ensure we are in a server-like environment
      vi.stubGlobal('window', undefined)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      delete process.env.DATABASE_URL
    })

    it('returns "db" when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgres://localhost/test'
      const { getHistoryMode } = await import('./factory')
      expect(getHistoryMode()).toBe('db')
    })

    it('returns "idb" when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL
      const { getHistoryMode } = await import('./factory')
      expect(getHistoryMode()).toBe('idb')
    })
  })

  describe('client-side (window is defined)', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      delete process.env.NEXT_PUBLIC_HISTORY_MODE
    })

    it('returns "idb" when NEXT_PUBLIC_HISTORY_MODE is "idb"', async () => {
      process.env.NEXT_PUBLIC_HISTORY_MODE = 'idb'
      const { getHistoryMode } = await import('./factory')
      expect(getHistoryMode()).toBe('idb')
    })

    it('returns "db" when NEXT_PUBLIC_HISTORY_MODE is "db"', async () => {
      process.env.NEXT_PUBLIC_HISTORY_MODE = 'db'
      const { getHistoryMode } = await import('./factory')
      expect(getHistoryMode()).toBe('db')
    })

    it('defaults to "db" when NEXT_PUBLIC_HISTORY_MODE is absent', async () => {
      delete process.env.NEXT_PUBLIC_HISTORY_MODE
      const { getHistoryMode } = await import('./factory')
      expect(getHistoryMode()).toBe('db')
    })
  })
})

describe('getHistoryRepository', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.DATABASE_URL
    delete process.env.NEXT_PUBLIC_HISTORY_MODE
  })

  it('returns DbHistoryRepository when DATABASE_URL is set (server)', async () => {
    vi.stubGlobal('window', undefined)
    process.env.DATABASE_URL = 'postgres://localhost/test'
    const { getHistoryRepository } = await import('./factory')
    const repo = getHistoryRepository()
    expect(repo).toBeInstanceOf(DbHistoryRepository)
  })

  it('returns IdbHistoryRepository when DATABASE_URL is absent (server)', async () => {
    vi.stubGlobal('window', undefined)
    delete process.env.DATABASE_URL
    const { getHistoryRepository } = await import('./factory')
    const repo = getHistoryRepository()
    expect(repo).toBeInstanceOf(IdbHistoryRepository)
  })

  it('returns IdbHistoryRepository when NEXT_PUBLIC_HISTORY_MODE is "idb" (client)', async () => {
    vi.stubGlobal('window', {})
    process.env.NEXT_PUBLIC_HISTORY_MODE = 'idb'
    const { getHistoryRepository } = await import('./factory')
    const repo = getHistoryRepository()
    expect(repo).toBeInstanceOf(IdbHistoryRepository)
  })

  it('returns DbHistoryRepository when NEXT_PUBLIC_HISTORY_MODE is "db" (client)', async () => {
    vi.stubGlobal('window', {})
    process.env.NEXT_PUBLIC_HISTORY_MODE = 'db'
    const { getHistoryRepository } = await import('./factory')
    const repo = getHistoryRepository()
    expect(repo).toBeInstanceOf(DbHistoryRepository)
  })
})
