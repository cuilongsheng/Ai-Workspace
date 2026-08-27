import type { Citation } from '../../api/chat'

export function groupCitationsByDocument(citations: Citation[]) {
  const groups = new Map<string, Citation[]>()
  for (const citation of citations) {
    const key = citation.documentId ?? citation.documentName ?? 'unknown'
    groups.set(key, [...(groups.get(key) ?? []), citation])
  }
  return [...groups.values()]
}
