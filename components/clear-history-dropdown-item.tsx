'use client'

import { useCallback, useState, useTransition } from 'react'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'

/**
 * A dropdown menu item that clears local (IndexedDB) chat history after
 * confirmation. Only renders when the active history mode is "idb".
 */
export function ClearHistoryDropdownItem() {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const mode = getHistoryMode()

  const handleClear = useCallback(() => {
    startTransition(async () => {
      try {
        const repo = getHistoryRepository()
        await repo.clearAll()
        toast.success('History cleared')
        setOpen(false)
        router.push('/')
        window.dispatchEvent(new CustomEvent('chat-history-updated'))
      } catch {
        toast.error('Failed to clear history')
      }
    })
  }, [router])

  if (mode !== 'idb') return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          onSelect={event => {
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Trash2 className="size-4" />
          <span>Clear history</span>
        </DropdownMenuItem>
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
