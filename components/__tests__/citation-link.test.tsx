import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

// Mock Radix Popover so asChild trigger renders straight through
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: () => null
}))

// Mock Avatar to keep tests lightweight
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  )
}))

// Use vi.hoisted to create the spy before the vi.mock factory is hoisted
const { mockSetActiveSourceUrl } = vi.hoisted(() => ({
  mockSetActiveSourceUrl: vi.fn()
}))

vi.mock('../citation-context', () => ({
  setActiveSourceUrl: mockSetActiveSourceUrl,
  useCitation: () => ({ citationMaps: undefined }),
  useActiveSourceUrl: () => null,
  CitationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// isCitationLabel: true for [N] patterns
vi.mock('@/lib/utils/citation', () => ({
  isCitationLabel: (text: string) => /^\[\d+\]$/.test(text)
}))

// Import after mocks are in place
import { CitationLink } from '../citation-link'

const citationData = {
  title: 'Test Source',
  url: 'https://example.com/source',
  content: 'Test content here.'
}

describe('CitationLink — citation hover active URL', () => {
  afterEach(() => {
    mockSetActiveSourceUrl.mockClear()
  })

  test('calls setActiveSourceUrl(url) on mouseEnter of a [N] citation with data', () => {
    render(
      <CitationLink href={citationData.url} citationData={citationData}>
        [1]
      </CitationLink>
    )

    fireEvent.mouseEnter(screen.getByText('[1]'))

    expect(mockSetActiveSourceUrl).toHaveBeenCalledWith(
      'https://example.com/source'
    )
  })

  test('calls setActiveSourceUrl(null) on mouseLeave of a [N] citation with data', () => {
    render(
      <CitationLink href={citationData.url} citationData={citationData}>
        [1]
      </CitationLink>
    )

    fireEvent.mouseEnter(screen.getByText('[1]'))
    fireEvent.mouseLeave(screen.getByText('[1]'))

    expect(mockSetActiveSourceUrl).toHaveBeenLastCalledWith(null)
  })

  test('does not call setActiveSourceUrl for a plain link without citationData', () => {
    render(
      <CitationLink href="https://example.com">regular text</CitationLink>
    )

    fireEvent.mouseEnter(screen.getByText('regular text'))

    expect(mockSetActiveSourceUrl).not.toHaveBeenCalled()
  })

  test('does not call setActiveSourceUrl for a [N] link without citationData', () => {
    render(
      <CitationLink href="https://example.com/source">[2]</CitationLink>
    )

    fireEvent.mouseEnter(screen.getByText('[2]'))

    expect(mockSetActiveSourceUrl).not.toHaveBeenCalled()
  })
})
