'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react'

import type { SearchResultItem } from '@/lib/types'

// ---------------------------------------------------------------------------
// Module-level active source URL store
//
// Lives outside the React tree so CitationLink and SearchResults can share
// state even when they render in separate React subtrees (e.g. SearchSection
// and AnswerSection are siblings, not nested under a common provider).
// ---------------------------------------------------------------------------

let _activeSourceUrl: string | null = null
const _activeSourceListeners = new Set<(url: string | null) => void>()

export function setActiveSourceUrl(url: string | null): void {
  _activeSourceUrl = url
  _activeSourceListeners.forEach(l => l(url))
}

export function useActiveSourceUrl(): string | null {
  const [url, setUrl] = useState<string | null>(_activeSourceUrl)

  useEffect(() => {
    const handler = (next: string | null) => setUrl(next)
    _activeSourceListeners.add(handler)
    return () => {
      _activeSourceListeners.delete(handler)
    }
  }, [])

  return url
}

// ---------------------------------------------------------------------------
// Citation context — carries citationMaps per message
// ---------------------------------------------------------------------------

interface CitationContextValue {
  citationMaps?: Record<string, Record<number, SearchResultItem>>
}

const CitationContext = createContext<CitationContextValue | undefined>(
  undefined
)

export function CitationProvider({
  children,
  citationMaps
}: {
  children: ReactNode
  citationMaps?: Record<string, Record<number, SearchResultItem>>
}) {
  return (
    <CitationContext.Provider value={{ citationMaps }}>
      {children}
    </CitationContext.Provider>
  )
}

export function useCitation() {
  const context = useContext(CitationContext)
  return context || { citationMaps: undefined }
}
