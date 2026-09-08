'use client'

import { IconExternalLink as ExternalLink } from '@tabler/icons-react'

import { SearchResultItem } from '@/lib/types'
import { deriveSourceMeta } from '@/lib/utils/source-meta'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'

export interface SourceReaderSheetProps {
  result: SearchResultItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SourceReaderSheet({
  result,
  open,
  onOpenChange
}: SourceReaderSheetProps) {
  if (!result) return null

  const { domain: fallbackDomain } = deriveSourceMeta(result.url)
  const displayDomain = result.domain || fallbackDomain || result.url

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        aria-describedby="source-reader-description"
      >
        <SheetHeader className="shrink-0 pr-6">
          <SheetTitle className="line-clamp-2 text-base leading-snug">
            {result.title || displayDomain}
          </SheetTitle>
          <SheetDescription id="source-reader-description" asChild>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span>Open original</span>
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          {result.content ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {result.content}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">
              No preview available.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
