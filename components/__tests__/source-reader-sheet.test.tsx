import React from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { SourceReaderSheet } from '../source-reader-sheet'

// Minimal sheet mock: renders children when open
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    children,
    open
  }: {
    children: React.ReactNode
    open: boolean
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({
    children,
    asChild
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => (asChild ? <>{children}</> : <p>{children}</p>)
}))

const baseResult = {
  title: 'Test Article',
  url: 'https://example.com/article',
  content: 'This is the article content.',
  domain: 'example.com',
  faviconUrl: 'https://example.com/favicon.ico',
  publishedAt: '2024-03-15T00:00:00Z'
}

describe('SourceReaderSheet', () => {
  test('renders nothing when result is null', () => {
    const { container } = render(
      <SourceReaderSheet result={null} open={false} onOpenChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when open is false', () => {
    const { queryByTestId } = render(
      <SourceReaderSheet
        result={baseResult}
        open={false}
        onOpenChange={vi.fn()}
      />
    )
    expect(queryByTestId('sheet')).toBeNull()
  })

  test('renders title when open', () => {
    render(
      <SourceReaderSheet
        result={baseResult}
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  test('renders content prose when open', () => {
    render(
      <SourceReaderSheet
        result={baseResult}
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    expect(screen.getByText('This is the article content.')).toBeInTheDocument()
  })

  test('renders "Open original" link with correct href', () => {
    render(
      <SourceReaderSheet
        result={baseResult}
        open={true}
        onOpenChange={vi.fn()}
      />
    )
    const link = screen.getByRole('link', { name: /open original/i })
    expect(link).toHaveAttribute('href', 'https://example.com/article')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('shows domain as title fallback when title is empty', () => {
    const result = { ...baseResult, title: '', domain: 'example.com' }
    render(
      <SourceReaderSheet result={result} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByRole('heading', { name: 'example.com' })).toBeInTheDocument()
  })

  test('falls back to parsed hostname when domain field is absent', () => {
    const result = {
      ...baseResult,
      title: '',
      domain: undefined,
      faviconUrl: undefined
    }
    render(
      <SourceReaderSheet result={result} open={true} onOpenChange={vi.fn()} />
    )
    // deriveSourceMeta strips www., so hostname → "example.com"
    expect(screen.getByRole('heading', { name: 'example.com' })).toBeInTheDocument()
  })

  test('shows "No preview available" when content is empty', () => {
    const result = { ...baseResult, content: '' }
    render(
      <SourceReaderSheet result={result} open={true} onOpenChange={vi.fn()} />
    )
    expect(screen.getByText(/no preview available/i)).toBeInTheDocument()
  })
})
