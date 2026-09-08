'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { toast } from 'sonner'

import { deleteChat, pinChatById } from '@/lib/actions/chat'
import { getHistoryMode, getHistoryRepository } from '@/lib/history/factory'
import type { HistoryChat } from '@/lib/history/types'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu
} from '@/components/ui/sidebar'

import { ChatHistorySkeleton } from './chat-history-skeleton'
import { ChatMenuItem } from './chat-menu-item'
import { ClearHistoryAction } from './clear-history-action'

/** Shape returned by /api/chats (dates are serialized as strings in JSON). */
interface ChatPageResponse {
  chats: Array<{
    id: string
    title: string
    createdAt: string
    pinnedAt?: string | null
  }>
  nextOffset: number | null
}

function dbResponseToHistoryChat(raw: ChatPageResponse['chats'][number]): HistoryChat {
  return {
    id: raw.id,
    title: raw.title,
    createdAt: new Date(raw.createdAt),
    pinnedAt: raw.pinnedAt ? new Date(raw.pinnedAt) : undefined
  }
}

export function ChatHistoryClient() {
  const mode = useMemo(() => getHistoryMode(), [])
  const [chats, setChats] = useState<HistoryChat[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchInitialChats = useCallback(async () => {
    setIsLoading(true)
    try {
      if (mode === 'idb') {
        const repo = getHistoryRepository()
        const { chats: fetched, nextOffset: newNextOffset } = await repo.listChats({
          limit: 20,
          offset: 0
        })
        setChats(fetched)
        setNextOffset(newNextOffset)
      } else {
        const response = await fetch(`/api/chats?offset=0&limit=20`)
        if (!response.ok) {
          throw new Error('Failed to fetch initial chat history')
        }
        const { chats: raw, nextOffset: newNextOffset } =
          (await response.json()) as ChatPageResponse
        setChats(raw.map(dbResponseToHistoryChat))
        setNextOffset(newNextOffset)
      }
    } catch (error) {
      console.error('Failed to load initial chats:', error)
      toast.error('Failed to load chat history.')
      setNextOffset(null)
    } finally {
      setIsLoading(false)
    }
  }, [mode])

  useEffect(() => {
    // Intentional: async fetch on mount; setState calls happen after awaits
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialChats()
  }, [fetchInitialChats])

  useEffect(() => {
    const handleHistoryUpdate = () => {
      startTransition(async () => {
        await fetchInitialChats()
      })
    }
    window.addEventListener('chat-history-updated', handleHistoryUpdate)
    return () => {
      window.removeEventListener('chat-history-updated', handleHistoryUpdate)
    }
  }, [fetchInitialChats, startTransition])

  const fetchMoreChats = useCallback(async () => {
    if (isLoading || nextOffset === null) return

    setIsLoading(true)
    try {
      if (mode === 'idb') {
        const repo = getHistoryRepository()
        const { chats: fetched, nextOffset: newNextOffset } = await repo.listChats({
          limit: 20,
          offset: nextOffset
        })
        setChats(prevChats => [...prevChats, ...fetched])
        setNextOffset(newNextOffset)
      } else {
        const response = await fetch(`/api/chats?offset=${nextOffset}&limit=20`)
        if (!response.ok) {
          throw new Error('Failed to fetch more chat history')
        }
        const { chats: raw, nextOffset: newNextOffset } =
          (await response.json()) as ChatPageResponse
        setChats(prevChats => [...prevChats, ...raw.map(dbResponseToHistoryChat)])
        setNextOffset(newNextOffset)
      }
    } catch (error) {
      console.error('Failed to load more chats:', error)
      toast.error('Failed to load more chat history.')
      setNextOffset(null)
    } finally {
      setIsLoading(false)
    }
  }, [nextOffset, isLoading, mode])

  useEffect(() => {
    const observerRefValue = loadMoreRef.current
    if (!observerRefValue || nextOffset === null || isPending) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !isPending) {
          fetchMoreChats()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerRefValue)

    return () => {
      if (observerRefValue) {
        observer.unobserve(observerRefValue)
      }
    }
  }, [fetchMoreChats, nextOffset, isLoading, isPending])

  // ── Action callbacks ───────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (mode === 'idb') {
        try {
          const repo = getHistoryRepository()
          await repo.deleteChat(id)
          return { success: true }
        } catch {
          return { success: false, error: 'Failed to delete chat' }
        }
      }
      return deleteChat(id)
    },
    [mode]
  )

  const handlePin = useCallback(
    async (id: string, pinned: boolean): Promise<void> => {
      if (mode === 'idb') {
        const repo = getHistoryRepository()
        await repo.pinChat(id, pinned)
      } else {
        const result = await pinChatById(id, pinned)
        if (!result.success) {
          throw new Error(result.error ?? 'Failed to update pin')
        }
      }
    },
    [mode]
  )

  const handleClear = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      if (mode === 'idb') {
        try {
          const repo = getHistoryRepository()
          await repo.clearAll()
          return { success: true }
        } catch {
          return { success: false, error: 'Failed to clear history' }
        }
      }
      // DB mode: let ClearHistoryAction use the default clearChats server action
      return { success: true }
    },
    [mode]
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  const isHistoryEmpty = !isLoading && !chats.length && nextOffset === null

  return (
    <div className="flex flex-col flex-1 h-full">
      <SidebarGroup>
        <div className="flex items-center justify-between w-full">
          <SidebarGroupLabel className="p-0">History</SidebarGroupLabel>
          <ClearHistoryAction
            empty={isHistoryEmpty}
            onClear={mode === 'idb' ? handleClear : undefined}
          />
        </div>
      </SidebarGroup>
      <div className="flex-1 overflow-y-auto mb-2 relative">
        {isHistoryEmpty && !isPending ? (
          <div className="px-2 text-foreground/30 text-sm text-center py-4">
            No search history
          </div>
        ) : (
          <SidebarMenu>
            {chats.map(
              chat =>
                chat && (
                  <ChatMenuItem
                    key={chat.id}
                    chat={chat}
                    onDelete={handleDelete}
                    onPin={handlePin}
                  />
                )
            )}
          </SidebarMenu>
        )}
        <div ref={loadMoreRef} style={{ height: '1px' }} />
        {(isLoading || isPending) && (
          <div className="py-2">
            <ChatHistorySkeleton />
          </div>
        )}
      </div>
      {mode === 'idb' && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t">
          History is stored in this browser
        </p>
      )}
    </div>
  )
}
