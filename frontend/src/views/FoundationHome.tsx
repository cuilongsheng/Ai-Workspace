import { ArrowRight, Building2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPlatformDashboard,
  type PlatformDashboard,
} from '../api/platform-organizations'
import { useLocaleText } from '../i18n/useLocaleText'

export function FoundationHome() {
  const { text, locale } = useLocaleText()
  const [data, setData] = useState<PlatformDashboard | null>(null)

  useEffect(() => {
    void getPlatformDashboard()
      .then(setData)
      .catch(() => undefined)
  }, [])

  return (
    <div className="min-h-full bg-slate-50 px-8 py-8 text-slate-950">
      <section
        className="grid gap-4 md:grid-cols-3"
        aria-label={text('租户摘要', 'Tenant summary')}
      >
        <Metric
          label={text('组织总数', 'Organizations')}
          value={data?.organizations}
        />
        <Metric
          label={text('启用组织', 'Active organizations')}
          value={data?.activeOrganizations}
          tone="green"
        />
        <Metric
          label={text('禁用组织', 'Disabled organizations')}
          value={data?.disabledOrganizations}
          tone="slate"
        />
      </section>
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {text('最近创建的组织', 'Recently created organizations')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {text(
                '数据来自平台 Dashboard 接口',
                'Live data from the platform dashboard API',
              )}
            </p>
          </div>
          <Link
            className="text-sm font-medium text-indigo-600"
            to="/platform/organizations"
          >
            {text('管理全部组织 →', 'Manage all organizations →')}
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {data?.recentOrganizations.length ? (
            data.recentOrganizations.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <span className="grid h-9 w-9 place-items-center rounded-md bg-indigo-50 text-indigo-600">
                  <Building2 size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{item.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {text('创建于', 'Created')}{' '}
                    {new Date(item.createdAt).toLocaleDateString(locale)}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-[11px] ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {item.status === 'ACTIVE'
                    ? text('已启用', 'Active')
                    : text('已禁用', 'Disabled')}
                </span>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              {data
                ? text('暂无组织数据', 'No organization data')
                : text('正在加载平台摘要…', 'Loading platform summary…')}
            </div>
          )}
        </div>
      </section>
      <section className="mt-10 grid gap-4">
        <QuickAction
          to="/platform/organizations"
          title={text('租户配置', 'Tenant settings')}
          description={text(
            '新建、编辑、启用或禁用组织',
            'Create, edit, enable, or disable organizations',
          )}
        />
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'indigo',
}: {
  label: string
  value?: number
  tone?: 'indigo' | 'green' | 'slate'
}) {
  const toneClass =
    tone === 'green'
      ? 'text-emerald-600'
      : tone === 'slate'
        ? 'text-slate-600'
        : 'text-indigo-600'
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <strong className={`mt-2 block text-3xl font-semibold ${toneClass}`}>
        {value ?? '—'}
      </strong>
    </article>
  )
}

function QuickAction({
  to,
  title,
  description,
}: {
  to: string
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-lg border border-slate-200 bg-white p-5 hover:border-indigo-300"
    >
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 pr-8 text-sm text-slate-500">{description}</p>
      <ArrowRight
        className="absolute right-5 top-8 text-indigo-600 transition group-hover:translate-x-0.5"
        size={18}
      />
    </Link>
  )
}
