import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { SearchResults } from '../search-results'

// Stub the sheet so we don't need a full Radix environment
vi.mock('../source-reader-sheet', () => ({
  SourceReaderSheet: ({
    result,
    open
  }: {
    result: { title: string; url: string; content: string } | null
    open: boolean
  }) =>
    open && result ? (
      <div data-testid="source-reader-sheet">
        <span data-testid="sheet-title">{result.title}</span>
        <a href={result.url}>Open original</a>
      </div>
    ) : null
}))

const results = [
  {
    title: 'Alpha Post',
    url: 'https://alpha.com/post',
    content: 'Alpha content here.',
    domain: 'alpha.com',
    faviconUrl: 'https://alpha.com/favicon.ico',
    publishedAt: '2024-06-01T00:00:00Z'
  },
  {
    title: 'Beta Article',
    url: 'https://beta.org/article',
    content: 'Beta content here.',
    domain: 'beta.org',
    faviconUrl: undefined,
    publishedAt: undefined
  },
  {
    title: '',
    url: 'https://gamma.io/page',
    content: 'Gamma content.',
    domain: undefined,
    faviconUrl: undefined,
    publishedAt: undefined
  }
]

describe('SearchResults — grid mode', () => {
  test('renders domain for each result', () => {
    render(<SearchResults results={results} displayMode="grid" />)
    expect(screen.getByText('alpha.com')).toBeInTheDocument()
    expect(screen.getByText('beta.org')).toBeInTheDocument()
    // domain derived via deriveSourceMeta for gamma.io
    expect(screen.getByText('gamma.io')).toBeInTheDocument()
  })

  test('renders formatted publishedAt when present', () => {
    render(<SearchResults results={results} displayMode="grid" />)
    // "Jun 1, 2024" or locale equivalent — just check the year is present
    const dateText = screen.getAllByText(/2024/)
    expect(dateText.length).toBeGreaterThan(0)
  })

  test('does not render a date for results without publishedAt', () => {
    render(<SearchResults results={results.slice(1)} displayMode="grid" />)
    expect(screen.queryByText(/2024/)).toBeNull()
  })

  test('clicking a card opens the sheet with the right result', () => {
    render(<SearchResults results={results} displayMode="grid" />)

    expect(screen.queryByTestId('source-reader-sheet')).toBeNull()

    // Click the first card button
    const cardButtons = screen
      .getAllByRole('button')
      .filter(b => b.tagName === 'BUTTON' && b.className.includes('text-left'))

    fireEvent.click(cardButtons[0])

    expect(screen.getByTestId('source-reader-sheet')).toBeInTheDocument()
    expect(screen.getByTestId('sheet-title')).toHaveTextContent('Alpha Post')
  })

  test('clicking a second card updates the sheet content', () => {
    render(<SearchResults results={results} displayMode="grid" />)

    const cardButtons = screen
      .getAllByRole('button')
      .filter(b => b.tagName === 'BUTTON' && b.className.includes('text-left'))

    fireEvent.click(cardButtons[0])
    expect(screen.getByTestId('sheet-title')).toHaveTextContent('Alpha Post')

    fireEvent.click(cardButtons[1])
    expect(screen.getByTestId('sheet-title')).toHaveTextContent('Beta Article')
  })
})

describe('SearchResults — list mode', () => {
  test('renders domain and title in list cards', () => {
    render(<SearchResults results={results} displayMode="list" />)
    expect(screen.getByText('Alpha Post')).toBeInTheDocument()
    expect(screen.getByText('alpha.com')).toBeInTheDocument()
  })

  test('clicking a list card opens the sheet', () => {
    render(<SearchResults results={results} displayMode="list" />)

    expect(screen.queryByTestId('source-reader-sheet')).toBeNull()

    const cardButtons = screen
      .getAllByRole('button')
      .filter(b => b.tagName === 'BUTTON' && b.className.includes('text-left'))

    fireEvent.click(cardButtons[0])
    expect(screen.getByTestId('source-reader-sheet')).toBeInTheDocument()
  })

  test('uses derived domain when domain field is absent', () => {
    render(<SearchResults results={results.slice(2)} displayMode="list" />)
    const matches = screen.getAllByText('gamma.io')
    expect(matches.length).toBeGreaterThan(0)
  })
})

describe('SearchResults — show more', () => {
  const manyResults = Array.from({ length: 5 }, (_, i) => ({
    title: `Result ${i + 1}`,
    url: `https://site${i}.com/page`,
    content: `Content ${i + 1}`,
    domain: `site${i}.com`
  }))

  test('shows "View N more" button when results exceed 3 in grid mode', () => {
    render(<SearchResults results={manyResults} displayMode="grid" />)
    expect(screen.getAllByText(/view 2 more/i).length).toBeGreaterThan(0)
  })

  test('shows all results after clicking view more', () => {
    render(<SearchResults results={manyResults} displayMode="grid" />)

    const viewMoreButtons = screen.getAllByRole('button', {
      name: /view 2 more/i
    })
    fireEvent.click(viewMoreButtons[0])

    expect(screen.queryByText(/view 2 more/i)).toBeNull()
    expect(screen.getByText('Result 5')).toBeInTheDocument()
  })
})
