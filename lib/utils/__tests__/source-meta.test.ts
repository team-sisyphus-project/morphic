import { describe, expect, it } from 'vitest'

import { deriveSourceMeta } from '../source-meta'

describe('deriveSourceMeta', () => {
  it('extracts domain and favicon for a standard https URL', () => {
    const result = deriveSourceMeta('https://www.example.com/some/path')
    expect(result.domain).toBe('example.com')
    expect(result.faviconUrl).toBe('https://example.com/favicon.ico')
  })

  it('strips www. from domain but not from favicon host', () => {
    const result = deriveSourceMeta('https://www.github.com/')
    expect(result.domain).toBe('github.com')
    expect(result.faviconUrl).toBe('https://github.com/favicon.ico')
  })

  it('preserves subdomain other than www in domain', () => {
    const result = deriveSourceMeta('https://docs.example.com/guide')
    expect(result.domain).toBe('docs.example.com')
    expect(result.faviconUrl).toBe('https://docs.example.com/favicon.ico')
  })

  it('handles http protocol', () => {
    const result = deriveSourceMeta('http://example.com')
    expect(result.domain).toBe('example.com')
    expect(result.faviconUrl).toBe('http://example.com/favicon.ico')
  })

  it('handles URL without www.', () => {
    const result = deriveSourceMeta('https://techcrunch.com/article')
    expect(result.domain).toBe('techcrunch.com')
    expect(result.faviconUrl).toBe('https://techcrunch.com/favicon.ico')
  })

  it('ignores path, query and fragment for both fields', () => {
    const result = deriveSourceMeta(
      'https://example.com/path?q=test#section'
    )
    expect(result.domain).toBe('example.com')
    expect(result.faviconUrl).toBe('https://example.com/favicon.ico')
  })

  it('returns empty strings for an invalid URL', () => {
    const result = deriveSourceMeta('not-a-url')
    expect(result.domain).toBe('')
    expect(result.faviconUrl).toBe('')
  })

  it('returns empty strings for an empty string', () => {
    const result = deriveSourceMeta('')
    expect(result.domain).toBe('')
    expect(result.faviconUrl).toBe('')
  })

  it('handles localhost', () => {
    const result = deriveSourceMeta('http://localhost:3000/page')
    expect(result.domain).toBe('localhost')
    expect(result.faviconUrl).toBe('http://localhost/favicon.ico')
  })
})
