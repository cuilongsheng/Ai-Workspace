import { useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import { LoadingState } from '../components/feedback/LoadingState'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminPage } from '../features/admin/AdminPages'
import { ChatPage } from '../features/chat/ChatPage'
import { KnowledgeBasePage } from '../features/knowledge-bases/KnowledgeBasePage'
import { RetrievalDebugPage } from '../features/knowledge-bases/RetrievalDebugPage'
import { DocumentReviewPage } from '../features/documents/DocumentReviewPage'
import { AppShell } from '../layouts/AppShell'
import { useSessionStore } from '../store/session-store'
import { FoundationHome } from '../views/FoundationHome'
import { NotFound } from '../views/NotFound'
import { NoAccess } from '../views/NoAccess'
import { useTranslation } from 'react-i18next'

function SessionBoundary() {
  const { t } = useTranslation()
  const status = useSessionStore((state) => state.status)
  const restore = useSessionStore((state) => state.restore)

  useEffect(() => {
    if (status === 'idle') void restore()
  }, [restore, status])

  if (status === 'idle' || status === 'restoring')
    return <LoadingState label={t('restoring')} />
  return <Outlet />
}

function ProtectedRoute() {
  const status = useSessionStore((state) => state.status)
  return status === 'authenticated' ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  )
}

function PlatformRoute() {
  const user = useSessionStore((state) => state.currentUser)
  return user?.role === 'PLATFORM_ADMIN' ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        user?.role === 'ORGANIZATION_ADMIN'
          ? '/organization/admin'
          : user?.role
            ? '/'
            : '/no-access'
      }
      replace
    />
  )
}

function OrganizationAdminRoute() {
  const user = useSessionStore((state) => state.currentUser)
  return user?.role === 'ORGANIZATION_ADMIN' ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        user?.role === 'PLATFORM_ADMIN'
          ? '/workspace'
          : user?.role
            ? '/'
            : '/no-access'
      }
      replace
    />
  )
}

function DepartmentRoute({
  roles,
}: {
  roles: Array<'DEPARTMENT_ADMIN' | 'DEPARTMENT_MEMBER'>
}) {
  const { departmentId } = useParams()
  const user = useSessionStore((state) => state.currentUser)
  const membership = user?.departments.find((item) => item.id === departmentId)
  const allowed = membership?.roles.some((role) =>
    roles.includes(role.name as (typeof roles)[number]),
  )
  return allowed ? (
    <Outlet />
  ) : (
    <Navigate to={user?.role ? '/' : '/no-access'} replace />
  )
}

function IndexRedirect() {
  const status = useSessionStore((state) => state.status)
  const user = useSessionStore((state) => state.currentUser)
  const firstDepartment = user?.departments[0]
  const firstDepartmentIsAdmin = firstDepartment?.roles.some(
    (role) => role.name === 'DEPARTMENT_ADMIN',
  )
  const destination =
    user?.role === 'PLATFORM_ADMIN'
      ? '/workspace'
      : user?.role === 'ORGANIZATION_ADMIN'
        ? '/organization/admin'
        : firstDepartment
          ? `/departments/${firstDepartment.id}/${firstDepartmentIsAdmin ? 'members' : 'chat'}`
          : '/no-access'
  return (
    <Navigate
      to={status === 'authenticated' ? destination : '/login'}
      replace
    />
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SessionBoundary />}>
          <Route index element={<IndexRedirect />} />
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="no-access" element={<NoAccess />} />
            <Route element={<AppShell />}>
              <Route element={<PlatformRoute />}>
                <Route path="workspace" element={<FoundationHome />} />
                <Route
                  path="platform/organizations"
                  element={<AdminPage kind="platform" />}
                />
              </Route>
              <Route element={<OrganizationAdminRoute />}>
                <Route
                  path="organization/admin"
                  element={<AdminPage kind="organization" />}
                />
                <Route
                  path="organization/employees"
                  element={<AdminPage kind="employees" />}
                />
              </Route>
              <Route
                path="knowledge-bases"
                element={<Navigate to="/" replace />}
              />
              <Route path="chat" element={<Navigate to="/" replace />} />
              <Route
                element={
                  <DepartmentRoute
                    roles={['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER']}
                  />
                }
              >
                <Route
                  path="departments/:departmentId/knowledge-bases"
                  element={<KnowledgeBasePage />}
                />
                <Route
                  path="departments/:departmentId/knowledge-bases/:knowledgeBaseId"
                  element={<KnowledgeBasePage />}
                />
              </Route>
              <Route element={<DepartmentRoute roles={['DEPARTMENT_ADMIN']} />}>
                <Route
                  path="departments/:departmentId/knowledge-bases/:knowledgeBaseId/retrieval-debug"
                  element={<RetrievalDebugPage />}
                />
                <Route
                  path="departments/:departmentId/members"
                  element={<AdminPage kind="department" />}
                />
              </Route>
              <Route
                element={
                  <DepartmentRoute
                    roles={['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER']}
                  />
                }
              >
                <Route
                  path="departments/:departmentId/chat"
                  element={<ChatPage />}
                />
                <Route
                  path="departments/:departmentId/chat/:conversationId"
                  element={<ChatPage />}
                />
              </Route>
              <Route>
                <Route
                  path="documents/:documentId"
                  element={<DocumentReviewPage />}
                />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
