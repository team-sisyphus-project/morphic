'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { IconTrash as Trash2 } from '@tabler/icons-react'
import { toast } from 'sonner'

import { getHistoryMode, getHistoryRepository } from '@/lib/history/factory'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/**
 * A button + confirmation dialog for clearing local (IndexedDB) chat history.
 *
 * Only renders when the active history mode is "idb" (no DATABASE_URL).
 * Intended for use in settings dialogs / menus.
 */
export function ClearHistorySettings() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const mode = getHistoryMode()

  const handleClear = useCallback(() => {
    startTransition(async () => {
      try {
        const repo = getHistoryRepository()
        await repo.clearAll()
        toast.success('History cleared')
        router.push('/')
        window.dispatchEvent(new CustomEvent('chat-history-updated'))
      } catch {
        toast.error('Failed to clear history')
      }
    })
  }, [router])

  if (mode !== 'idb') return null

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-fit gap-2"
          disabled={isPending}
        >
          <Trash2 className="size-4" />
          Clear history
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all history?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all conversations stored in this
            browser. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={event => {
              event.preventDefault()
              handleClear()
            }}
          >
            {isPending ? <Spinner /> : 'Clear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
