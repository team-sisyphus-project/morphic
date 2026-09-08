/**
 * Derives display-layer metadata from a source URL.
 *
 * Both fields fall back to empty strings when the URL cannot be parsed so
 * callers can spread the result safely without null-checking.
 */
export function deriveSourceMeta(url: string): {
  domain: string
  faviconUrl: string
} {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    const domain = hostname.replace(/^www\./, '')
    const faviconUrl = `${parsed.protocol}//${domain}/favicon.ico`
    return { domain, faviconUrl }
  } catch {
    return { domain: '', faviconUrl: '' }
  }
}
