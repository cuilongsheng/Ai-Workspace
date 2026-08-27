import { Card } from '@heroui/react'
import { ArrowLeft, Play, SearchCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { debugRetrieval, type RetrievalDiagnostics } from '../../api/retrieval'
import { useLocaleText } from '../../i18n/useLocaleText'

export function RetrievalDebugPage() {
  const { departmentId, knowledgeBaseId } = useParams()
  const { text } = useLocaleText()
  const [query, setQuery] = useState('')
  const [diagnostics, setDiagnostics] = useState<RetrievalDiagnostics | null>(
    null,
  )
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!departmentId || !knowledgeBaseId || !query.trim()) return
    setLoading(true)
    try {
      const result = await debugRetrieval(
        departmentId,
        knowledgeBaseId,
        query.trim(),
      )
      setDiagnostics(result.diagnostics)
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid gap-5 p-6">
      <div className="flex items-center gap-3">
        <Link
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-slate-200 bg-white hover:border-indigo-300"
          to={`/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}`}
        >
          <ArrowLeft size={17} />
        </Link>
        <div>
          <h1 className="font-semibold">
            {text('检索诊断', 'Retrieval diagnostics')}
          </h1>
          <p className="text-xs text-slate-500">
            {text(
              '查看问题改写、双路召回、阈值、降级和最终章节。',
              'Inspect rewrite, retrieval pipelines, thresholds and final sections.',
            )}
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-none">
        <Card.Content className="grid gap-3 p-5">
          <label className="text-sm font-medium">
            {text('测试问题', 'Test question')}
          </label>
          <textarea
            className="min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text(
              '输入需要诊断的问题',
              'Enter a question to diagnose',
            )}
          />
          <button
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !query.trim()}
            onClick={() => void run()}
            type="button"
          >
            <Play size={15} />
            {loading ? text('诊断中…', 'Running…') : text('开始诊断', 'Run')}
          </button>
        </Card.Content>
      </Card>

      {diagnostics ? (
        <Card className="border border-slate-200 bg-white shadow-none">
          <Card.Content className="grid gap-5 p-5 text-sm">
            <div className="flex items-center gap-2">
              <SearchCheck className="text-indigo-600" size={18} />
              <strong>{diagnostics.status}</strong>
              {diagnostics.degraded ? (
                <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  degraded
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.entries(diagnostics.candidateCounts).map(
                ([key, value]) => (
                  <div className="rounded-lg bg-slate-50 p-3" key={key}>
                    <dt className="text-xs text-slate-500">{key}</dt>
                    <dd className="mt-1 text-lg font-semibold">{value}</dd>
                  </div>
                ),
              )}
            </dl>
            <div className="grid gap-2 rounded-lg bg-slate-50 p-4">
              <p>
                <b>Semantic:</b> {diagnostics.semanticQueries.join(' / ')}
              </p>
              <p>
                <b>Lexical:</b> {diagnostics.lexicalQueries.join(' / ')}
              </p>
              <p>
                <b>Pipeline:</b> Vector {diagnostics.vectorStatus} · BM25{' '}
                {diagnostics.keywordStatus} · Reranker{' '}
                {diagnostics.rerankerStatus}
              </p>
              <p>
                <b>Thresholds:</b> similarity{' '}
                {diagnostics.thresholds.minSimilarity} · rerank{' '}
                {diagnostics.thresholds.minRerankScore}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="p-3">Section</th>
                    <th className="p-3">Document</th>
                    <th className="p-3">Similarity</th>
                    <th className="p-3">Rerank</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.sections.map((section) => (
                    <tr
                      className="border-b border-slate-100"
                      key={`${section.documentId}-${section.sectionIndex}`}
                    >
                      <td className="p-3">
                        {section.sectionTitle ?? `#${section.sectionIndex}`}
                      </td>
                      <td className="p-3">{section.documentName}</td>
                      <td className="p-3">{section.similarity.toFixed(4)}</td>
                      <td className="p-3">
                        {section.rerankScore?.toFixed(4) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {diagnostics.errors.length ? (
              <pre className="overflow-auto rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                {diagnostics.errors.join('\n')}
              </pre>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}
    </section>
  )
}
