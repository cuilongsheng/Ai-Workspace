import { describe, expect, it } from 'vitest'
import type { Citation } from '../../api/chat'
import { groupCitationsByDocument } from './citation-groups'

describe('groupCitationsByDocument', () => {
  it('merges chunks from the same document without merging other documents', () => {
    const citations = [
      { sourceNumber: 1, documentId: 'doc-a', documentName: 'a.docx' },
      { sourceNumber: 2, documentId: 'doc-a', documentName: 'a.docx' },
      { sourceNumber: 3, documentId: 'doc-b', documentName: 'b.pdf' },
    ] as Citation[]

    expect(groupCitationsByDocument(citations)).toEqual([
      [citations[0], citations[1]],
      [citations[2]],
    ])
  })
})
