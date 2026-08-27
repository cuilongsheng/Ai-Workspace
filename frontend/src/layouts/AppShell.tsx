import {
  ArrowLeft,
  Bot,
  BookOpen,
  Building2,
  ChevronRight,
  Users,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react'
import { Card, Dropdown } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from '../store/session-store'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { localizedName } from '../i18n/localized-name'
import { resolveChatDepartment } from '../features/chat/chat-context'

export function AppShell() {
  const { t, i18n } = useTranslation()
  const user = useSessionStore((state) => state.currentUser)
  const logout = useSessionStore((state) => state.logout)
  const location = useLocation()
  const role = user?.role
  const departmentId =
    location.pathname.match(/^\/departments\/([^/]+)/)?.[1] ??
    new URLSearchParams(location.search).get('departmentId') ??
    undefined
  const currentDepartment =
    user?.departments.find((department) => department.id === departmentId) ??
    user?.departments[0]
  const currentDepartmentRoleNames = new Set(
    currentDepartment?.roles.map((departmentRole) => departmentRole.name) ?? [],
  )
  const isCurrentDepartmentAdmin =
    currentDepartmentRoleNames.has('DEPARTMENT_ADMIN')
  const canUseCurrentDepartment =
    isCurrentDepartmentAdmin ||
    currentDepartmentRoleNames.has('DEPARTMENT_MEMBER')
  const savedChatDepartmentId = localStorage.getItem(
    'ai-workspace-chat-department-id',
  )
  const chatDepartment = resolveChatDepartment(
    user?.departments ?? [],
    savedChatDepartmentId,
  )
  const identityName =
    (localizedName(currentDepartment, i18n.resolvedLanguage) ||
      user?.organization?.name) ??
    (role === 'PLATFORM_ADMIN' ? t('appName') : '—')
  const roleLabel =
    role === 'PLATFORM_ADMIN'
      ? t('roles.platform')
      : role === 'ORGANIZATION_ADMIN'
        ? t('roles.organization')
        : role === 'DEPARTMENT_ADMIN'
          ? t('roles.department')
          : t('roles.member')
  const accountName = user?.username?.trim() || user?.email || '—'
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 text-slate-600 max-lg:w-56 max-sm:w-20 max-sm:px-2 max-sm:py-4">
        <div className="flex items-center gap-3 px-2 max-sm:justify-center max-sm:px-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xl font-bold text-white">
            W
          </span>
          <span className="min-w-0 max-sm:hidden">
            <strong className="block truncate text-base font-bold leading-5 text-slate-950">
              AI Workspace
            </strong>
          </span>
        </div>
        <Card className="mt-6 border-0 bg-transparent p-0 shadow-none max-sm:hidden">
          <Card.Content className="p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                {identityName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold leading-5 text-slate-900">
                  {identityName}
                </strong>
                <span className="block truncate text-xs leading-5 text-slate-500">
                  {roleLabel}
                </span>
              </span>
            </div>
          </Card.Content>
        </Card>
        <nav
          className="mt-7 grid gap-1.5 max-sm:mt-6 max-sm:justify-center"
          aria-label={t('navigation.workspace')}
        >
          {role === 'PLATFORM_ADMIN' ? (
            <NavItem
              to="/workspace"
              icon={<LayoutDashboard size={18} />}
              label={t('navigation.workspace')}
            />
          ) : null}
          {role === 'PLATFORM_ADMIN' ? (
            <NavItem
              to="/platform/organizations"
              icon={<Building2 size={18} />}
              label={t('navigation.tenants')}
            />
          ) : null}
          {role === 'ORGANIZATION_ADMIN' ? (
            <NavItem
              to="/organization/admin"
              icon={<Settings size={18} />}
              label={t('navigation.departments')}
            />
          ) : null}
          {role === 'ORGANIZATION_ADMIN' ? (
            <NavItem
              to="/organization/employees"
              icon={<Users size={18} />}
              label={t('navigation.members')}
            />
          ) : null}
          {isCurrentDepartmentAdmin && currentDepartment ? (
            <NavItem
              to={`/departments/${currentDepartment.id}/members`}
              icon={<Users size={18} />}
              label={t('navigation.members')}
            />
          ) : null}
          {canUseCurrentDepartment && currentDepartment ? (
            <NavItem
              to={`/departments/${currentDepartment.id}/knowledge-bases`}
              icon={<BookOpen size={18} />}
              label={t('navigation.knowledge')}
            />
          ) : null}
          {chatDepartment ? (
            <NavItem
              to={`/departments/${chatDepartment.id}/chat`}
              icon={<Bot size={18} />}
              label={t('navigation.chat')}
            />
          ) : null}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 max-sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton />
            <Breadcrumbs role={role} />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Dropdown>
              <Dropdown.Trigger
                aria-label={t('actions.accountMenu')}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white transition hover:bg-indigo-600"
              >
                {user?.username?.slice(0, 1).toUpperCase() ?? 'U'}
              </Dropdown.Trigger>
              <Dropdown.Popover
                className="relative w-56 overflow-visible rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                placement="bottom end"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white"
                />
                <div className="px-2 py-2.5">
                  <strong
                    className="block truncate text-sm font-semibold text-slate-950"
                    title={accountName}
                  >
                    {accountName}
                  </strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {roleLabel}
                  </span>
                </div>
                <Dropdown.Menu
                  aria-label={t('actions.accountMenu')}
                  className="border-t border-slate-100 pt-1.5"
                  onAction={(key) => {
                    if (key === 'logout') void logout()
                  }}
                >
                  <Dropdown.Item
                    id="logout"
                    textValue={t('actions.logout')}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <LogOut aria-hidden="true" size={17} />
                    <span>{t('actions.logout')}</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function BackButton() {
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname
  const params = new URLSearchParams(location.search)
  const departmentId =
    path.match(/^\/departments\/([^/]+)/)?.[1] ??
    params.get('departmentId') ??
    ''
  const knowledgeBaseId =
    path.match(/\/knowledge-bases\/([^/]+)$/)?.[1] ??
    params.get('knowledgeBaseId') ??
    ''
  const conversationId = params.get('conversationId') ?? ''
  const fromChat = params.get('from') === 'chat'

  let target = ''
  if (/^\/documents\/[^/]+$/.test(path)) {
    if (fromChat && departmentId)
      target = `/departments/${departmentId}/chat${conversationId ? `/${conversationId}` : ''}`
    else if (departmentId && knowledgeBaseId)
      target = `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}`
    else if (departmentId)
      target = `/departments/${departmentId}/knowledge-bases`
  } else if (/^\/departments\/[^/]+\/knowledge-bases\/[^/]+$/.test(path)) {
    target = `/departments/${departmentId}/knowledge-bases`
  }

  if (!target) return null
  return (
    <NavLink
      to={target}
      aria-label={t('actions.back')}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <ArrowLeft size={15} />
      <span className="max-sm:hidden">{t('actions.back')}</span>
    </NavLink>
  )
}

function Breadcrumbs({ role }: { role?: string | null }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const zh = !i18n.resolvedLanguage?.startsWith('en')
  const path = location.pathname
  const departmentId =
    path.match(/^\/departments\/([^/]+)/)?.[1] ??
    new URLSearchParams(location.search).get('departmentId') ??
    ''
  const sourceParams = new URLSearchParams(location.search)
  let items: Array<{ label: string; to?: string }> = []

  if (path === '/workspace') items = [{ label: t('navigation.workspace') }]
  else if (path === '/platform/organizations')
    items = [{ label: t('navigation.tenants') }]
  else if (path === '/organization/admin')
    items = [{ label: t('navigation.departments') }]
  else if (path === '/organization/employees')
    items = [{ label: t('navigation.members') }]
  else if (/\/members$/.test(path)) items = [{ label: t('navigation.members') }]
  else if (/\/knowledge-bases\/[^/]+$/.test(path))
    items = [
      {
        label:
          role === 'DEPARTMENT_ADMIN'
            ? zh
              ? '知识库管理'
              : 'Knowledge Base Management'
            : t('navigation.knowledge'),
        to: `/departments/${departmentId}/knowledge-bases`,
      },
      { label: zh ? '文档管理' : 'Documents' },
    ]
  else if (/\/knowledge-bases$/.test(path))
    items = [
      {
        label:
          role === 'DEPARTMENT_ADMIN'
            ? zh
              ? '知识库管理'
              : 'Knowledge Base Management'
            : t('navigation.knowledge'),
      },
    ]
  else if (/\/documents\//.test(path))
    items = [
      {
        label:
          role === 'DEPARTMENT_ADMIN'
            ? zh
              ? '知识库管理'
              : 'Knowledge Base Management'
            : t('navigation.knowledge'),
        to: departmentId ? `/departments/${departmentId}/knowledge-bases` : '/',
      },
      {
        label: zh ? '文档管理' : 'Documents',
        to:
          departmentId && sourceParams.get('knowledgeBaseId')
            ? `/departments/${departmentId}/knowledge-bases/${sourceParams.get('knowledgeBaseId')}`
            : undefined,
      },
      { label: zh ? '审核' : 'Review' },
    ]
  else if (/\/chat\//.test(path))
    items = [
      {
        label: t('navigation.chat'),
        to: `/departments/${departmentId}/chat`,
      },
      { label: zh ? '当前对话' : 'Conversation' },
    ]
  else if (/\/chat$/.test(path)) items = [{ label: t('navigation.chat') }]

  if (!items.length) return <span />
  return (
    <nav
      aria-label={zh ? '面包屑导航' : 'Breadcrumb'}
      className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500"
    >
      {items.map((item, index) => (
        <span
          className="flex min-w-0 items-center gap-1.5"
          key={`${item.label}-${index}`}
        >
          {index ? <ChevronRight className="shrink-0" size={14} /> : null}
          {item.to ? (
            <NavLink className="truncate hover:text-indigo-600" to={item.to}>
              {item.label}
            </NavLink>
          ) : (
            <span
              className={`truncate ${index === items.length - 1 ? 'font-medium text-slate-900' : ''}`}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  const location = useLocation()
  return (
    <NavLink
      className={({ isActive }) => {
        const isKnowledgeLink = to.endsWith('/knowledge-bases')
        const isChatLink = to.endsWith('/chat')
        const isDocumentPage = /^\/documents\/[^/]+$/.test(location.pathname)
        const fromChat =
          new URLSearchParams(location.search).get('from') === 'chat'
        const selected =
          (isKnowledgeLink &&
            (/^\/departments\/[^/]+\/knowledge-bases(?:\/[^/]+)?$/.test(
              location.pathname,
            ) ||
              (isDocumentPage && !fromChat))) ||
          (isChatLink &&
            (/^\/departments\/[^/]+\/chat(?:\/[^/]+)?$/.test(
              location.pathname,
            ) ||
              (isDocumentPage && fromChat))) ||
          isActive
        return `flex h-11 w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition max-sm:h-12 max-sm:w-12 max-sm:justify-center max-sm:px-0 ${selected ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`
      }}
      to={to}
    >
      {icon}
      <span className="min-w-0 truncate max-sm:hidden">{label}</span>
    </NavLink>
  )
}
