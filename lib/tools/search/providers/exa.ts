import Exa from 'exa-js'

import { SearchResults } from '@/lib/types'
import { deriveSourceMeta } from '@/lib/utils/source-meta'

import { BaseSearchProvider } from './base'

export class ExaSearchProvider extends BaseSearchProvider {
  async search(
    query: string,
    maxResults: number = 10,
    _searchDepth: 'basic' | 'advanced' = 'basic',
    includeDomains: string[] = [],
    excludeDomains: string[] = []
  ): Promise<SearchResults> {
    const apiKey = process.env.EXA_API_KEY
    this.validateApiKey(apiKey, 'EXA')

    const exa = new Exa(apiKey)
    const exaResults = await exa.searchAndContents(query, {
      highlights: true,
      numResults: maxResults,
      includeDomains,
      excludeDomains
    })

    return {
      results: exaResults.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.highlight || result.text,
        ...(result.publishedDate
          ? { publishedAt: new Date(result.publishedDate).toISOString() }
          : {}),
        ...deriveSourceMeta(result.url)
      })),
      query,
      images: [],
      number_of_results: exaResults.results.length
    }
  }
}
