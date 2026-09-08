'use client'

import { useState } from 'react'

import { SearchResultItem } from '@/lib/types'
import { deriveSourceMeta } from '@/lib/utils/source-meta'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { SourceReaderSheet } from '@/components/source-reader-sheet'

export interface SearchResultsProps {
  results: SearchResultItem[]
  displayMode?: 'grid' | 'list'
}

/** Format an ISO 8601 date string into a short human-readable label. */
function formatPublishedAt(iso: string | undefined): string | null {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(iso))
  } catch {
    return null
  }
}

interface SourceMetaDisplay {
  domain: string
  faviconUrl: string
  fallbackChar: string
}

function resolveSourceMeta(result: SearchResultItem): SourceMetaDisplay {
  const { domain: derivedDomain, faviconUrl: derivedFaviconUrl } =
    deriveSourceMeta(result.url)
  const domain = result.domain || derivedDomain || result.url
  const faviconUrl =
    result.faviconUrl ||
    derivedFaviconUrl ||
    `https://www.google.com/s2/favicons?domain=${domain}`
  const fallbackChar = domain[0]?.toUpperCase() ?? '?'
  return { domain, faviconUrl, fallbackChar }
}

export function SearchResults({
  results,
  displayMode = 'grid'
}: SearchResultsProps) {
  const [showAllResults, setShowAllResults] = useState(false)
  const [activeResult, setActiveResult] = useState<SearchResultItem | null>(
    null
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleCardClick = (result: SearchResultItem) => {
    setActiveResult(result)
    setSheetOpen(true)
  }

  const handleViewMore = () => {
    setShowAllResults(true)
  }

  const displayedGridResults = showAllResults ? results : results.slice(0, 3)
  const additionalResultsCount = results.length > 3 ? results.length - 3 : 0

  // --- List Mode Rendering ---
  if (displayMode === 'list') {
    return (
      <>
        <div className="flex flex-col gap-2">
          {results.map((result, index) => {
            const { domain, faviconUrl, fallbackChar } =
              resolveSourceMeta(result)
            const publishedLabel = formatPublishedAt(result.publishedAt)

            return (
              <button
                key={index}
                type="button"
                className="block w-full text-left"
                onClick={() => handleCardClick(result)}
              >
                <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-2 flex items-start space-x-2">
                    <Avatar className="h-4 w-4 mt-1 shrink-0">
                      <AvatarImage src={faviconUrl} alt={domain} />
                      <AvatarFallback className="text-xs">
                        {fallbackChar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grow overflow-hidden space-y-0.5">
                      <p className="text-sm font-medium line-clamp-1">
                        {result.title || domain}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground/80 truncate underline">
                          {domain}
                        </span>
                        {publishedLabel && (
                          <span className="text-xs text-muted-foreground/70 shrink-0">
                            {publishedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>

        <SourceReaderSheet
          result={activeResult}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </>
    )
  }

  // --- Grid Mode Rendering ---
  return (
    <>
      <div className="flex flex-col gap-1 md:-m-1 md:flex-row md:flex-wrap md:gap-0">
        {displayedGridResults.map((result, index) => {
          const { domain, faviconUrl, fallbackChar } = resolveSourceMeta(result)
          const publishedLabel = formatPublishedAt(result.publishedAt)

          return (
            <div className="min-w-0 md:w-1/4 md:p-1" key={index}>
              <button
                type="button"
                className="block w-full h-full text-left"
                onClick={() => handleCardClick(result)}
              >
                <Card className="h-full flex-1 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex h-full min-w-0 items-center justify-between gap-2 p-2 md:flex-col md:items-stretch">
                    <p className="min-w-0 flex-1 line-clamp-1 text-xs md:min-h-8 md:line-clamp-2">
                      {result.title || result.content}
                    </p>
                    <div className="flex max-w-[42%] shrink-0 items-center space-x-1 min-w-0 md:mt-2 md:max-w-full md:shrink">
                      <Avatar className="h-4 w-4 shrink-0">
                        <AvatarImage src={faviconUrl} alt={domain} />
                        <AvatarFallback>{fallbackChar}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <span className="text-xs opacity-60 truncate block">
                          {domain}
                        </span>
                        {publishedLabel && (
                          <span className="text-xs text-muted-foreground/70 truncate block">
                            {publishedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </div>
          )
        })}
        {!showAllResults && additionalResultsCount > 0 && (
          <>
            <div className="flex justify-center py-1 md:hidden">
              <Button
                variant="link"
                className="h-auto px-2 py-1 text-muted-foreground"
                onClick={handleViewMore}
              >
                View {additionalResultsCount} more
              </Button>
            </div>
            <div className="hidden md:block md:w-1/4 md:p-1">
              <Card className="flex h-full flex-1 items-center justify-center">
                <CardContent className="p-2">
                  <Button
                    variant="link"
                    className="text-muted-foreground"
                    onClick={handleViewMore}
                  >
                    View {additionalResultsCount} more
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <SourceReaderSheet
        result={activeResult}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
