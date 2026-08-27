import { Building2, CirclePlus, Eye, EyeOff, Search, X } from 'lucide-react'
import { ListBox, Select } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  createPlatformOrganization,
  createPlatformOrganizationAdministrator,
  disablePlatformOrganization,
  enablePlatformOrganization,
  listPlatformOrganizations,
  updatePlatformOrganization,
  type PlatformOrganization,
} from '../../api/platform-organizations'
import {
  assignMember,
  createEmployee,
  createDepartment,
  listEmployeeOptions,
  listEmployees,
  listDepartments,
  listMembers,
  listRoles,
  removeEmployee,
  removeMember,
  updateEmployee,
  updateMember,
  updateDepartment,
  type Department,
  type Employee,
  type Member,
  type OrganizationRole,
} from '../../api/organization-admin'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { AppSelect } from '../../components/forms/AppSelect'
import { localizedName } from '../../i18n/localized-name'

function StatusBadge({ status, zh }: { status: string; zh: boolean }) {
  const labels: Record<string, [string, string]> = {
    ACTIVE: ['启用', 'Active'],
    INACTIVE: ['已禁用', 'Inactive'],
    LOCKED: ['已锁定', 'Locked'],
    PENDING: ['待生效', 'Pending'],
    DISABLED: ['已停用', 'Disabled'],
  }
  const label = labels[status]?.[zh ? 0 : 1] ?? status
  const color =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'PENDING'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-zinc-100 text-zinc-600'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  )
}

export function AdminPage({
  kind,
}: {
  kind: 'platform' | 'organization' | 'employees' | 'department'
}) {
  if (kind === 'organization') return <OrganizationDepartmentAdmin />
  if (kind === 'employees') return <EmployeeAdmin />
  if (kind === 'department') return <DepartmentMemberAdmin />
  return <PlatformOrganizationAdmin />
}

function PlatformOrganizationAdmin() {
  const { i18n } = useTranslation()
  const zh = !i18n.resolvedLanguage?.startsWith('en')
  const [items, setItems] = useState<PlatformOrganization[]>([])
  const [tab, setTab] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [disableTarget, setDisableTarget] =
    useState<PlatformOrganization | null>(null)
  const [editTarget, setEditTarget] = useState<PlatformOrganization | null>(
    null,
  )
  const [name, setName] = useState('')
  const [administratorEmail, setAdministratorEmail] = useState('')
  const [administratorName, setAdministratorName] = useState('')
  const [administratorPassword, setAdministratorPassword] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void listPlatformOrganizations()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (tab === 'ALL' ||
            item.status === (tab === 'ACTIVE' ? 'ACTIVE' : 'DISABLED')) &&
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, tab, query],
  )
  const create = async () => {
    if (
      !name.trim() ||
      !administratorEmail.trim() ||
      administratorPassword.length < 6
    )
      return
    const item = await createPlatformOrganization({
      name: name.trim(),
      administratorEmail: administratorEmail.trim(),
      administratorName: administratorName.trim() || undefined,
      administratorPassword,
    })
    setItems((current) => [
      item.administrator ? { ...item, users: [item.administrator] } : item,
      ...current,
    ])
    setName('')
    setAdministratorEmail('')
    setAdministratorName('')
    setAdministratorPassword('')
    setCreateOpen(false)
  }
  const disable = async () => {
    if (!disableTarget) return
    const next =
      disableTarget.status === 'ACTIVE'
        ? await disablePlatformOrganization(disableTarget.id)
        : await enablePlatformOrganization(disableTarget.id)
    setItems((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    )
    setDisableTarget(null)
  }
  const update = async () => {
    if (!editTarget || !name.trim()) return
    const next = await updatePlatformOrganization(editTarget.id, name.trim())
    setItems((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    )
    setEditTarget(null)
    setName('')
  }
  const addAdministrator = async () => {
    if (
      !editTarget ||
      !administratorEmail.trim() ||
      administratorPassword.length < 6
    )
      return
    const administrator = await createPlatformOrganizationAdministrator(
      editTarget.id,
      {
        email: administratorEmail.trim(),
        username: administratorName.trim() || undefined,
        password: administratorPassword,
      },
    )
    const next = { ...editTarget, users: [administrator] }
    setItems((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    )
    setEditTarget(next)
    setAdministratorEmail('')
    setAdministratorName('')
    setAdministratorPassword('')
  }
  return (
    <div className="min-h-full bg-[#fafafb] font-sans text-zinc-950">
      <section className="min-w-0">
        <main className="grid gap-6 p-8 max-md:p-4">
          <div className="flex items-center gap-4 max-md:flex-col max-md:items-stretch">
            <div className="flex gap-1 overflow-x-auto rounded-md border border-zinc-200 bg-white p-1">
              {[
                ['ALL', zh ? '全部租户' : 'All Tenants'],
                ['ACTIVE', zh ? '仅启用' : 'Active Only'],
                ['DISABLED', zh ? '已禁用' : 'Disabled'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTab(value as typeof tab)}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${tab === value ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex w-80 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-400 max-md:w-full">
              <Search size={15} />
              <input
                className="w-full bg-transparent text-xs text-zinc-700 outline-none"
                placeholder={zh ? '搜索租户…' : 'Search organizations...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              onClick={() => {
                setName('')
                setAdministratorEmail('')
                setAdministratorName('')
                setAdministratorPassword('')
                setCreateOpen(true)
              }}
              className="ml-auto flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-[13px] font-medium text-white max-md:ml-0"
            >
              <CirclePlus size={14} />
              {zh ? '新建租户' : 'Create Organization'}
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[620px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-medium text-zinc-500">
                <tr>
                  <th className="px-5 py-3">{zh ? '租户' : 'ORGANIZATION'}</th>
                  <th className="px-5 py-3">{zh ? '状态' : 'STATUS'}</th>
                  <th className="px-5 py-3">{zh ? '创建日期' : 'CREATED'}</th>
                  <th className="px-5 py-3 text-right">
                    {zh ? '操作' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-12 text-center text-sm text-zinc-400"
                    >
                      {zh ? '正在加载租户…' : 'Loading organizations…'}
                    </td>
                  </tr>
                ) : visible.length ? (
                  visible.map((item) => (
                    <tr
                      className="border-b border-zinc-100 last:border-0"
                      key={item.id}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => {
                            setEditTarget(item)
                            setName(item.name)
                          }}
                          className="flex items-center gap-2 text-[13px] font-medium"
                        >
                          <span className="grid h-8 w-8 place-items-center rounded bg-indigo-50 text-indigo-600">
                            <Building2 size={16} />
                          </span>
                          {item.name}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} zh={zh} />
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setDisableTarget(item)}
                          className={`ml-auto block rounded-md border px-3 py-1.5 text-xs font-medium ${item.status === 'ACTIVE' ? 'border-rose-200 text-rose-600' : 'border-emerald-200 text-emerald-700'}`}
                        >
                          {item.status === 'ACTIVE'
                            ? zh
                              ? '禁用'
                              : 'Disable'
                            : zh
                              ? '启用'
                              : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-12 text-center text-sm text-zinc-400"
                    >
                      {zh ? '未找到租户' : 'No organizations found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </section>
      {createOpen ? (
        <Modal
          title={zh ? '新建租户' : 'Create Organization'}
          onClose={() => setCreateOpen(false)}
        >
          <label className="grid gap-2 text-sm font-medium">
            {zh ? '租户名称' : 'Organization name'}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-indigo-500"
              placeholder={zh ? '例如：阿里巴巴' : 'e.g. Acme Inc.'}
            />
          </label>
          <div className="mt-5 grid gap-4 border-t border-zinc-100 pt-5">
            <p className="text-sm font-semibold">
              {zh ? '租户管理员登录账号' : 'Tenant administrator login'}
            </p>
            <label className="grid gap-2 text-sm font-medium">
              {zh ? '用户名（选填）' : 'Username (optional)'}
              <input
                value={administratorName}
                onChange={(e) => setAdministratorName(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                autoComplete="off"
                name="new-tenant-administrator-name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {zh ? '登录邮箱' : 'Login email'}
              <input
                type="email"
                value={administratorEmail}
                onChange={(e) => setAdministratorEmail(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                autoComplete="off"
                name="new-tenant-administrator-email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {zh
                ? '初始密码（至少 6 位）'
                : 'Initial password (6+ characters)'}
              <input
                type="password"
                value={administratorPassword}
                onChange={(e) => setAdministratorPassword(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                autoComplete="new-password"
                name="new-tenant-administrator-password"
                minLength={6}
                required
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
            >
              {zh ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={() => void create()}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white"
            >
              {zh ? '创建租户及管理员' : 'Create tenant and administrator'}
            </button>
          </div>
        </Modal>
      ) : null}
      {editTarget ? (
        <Modal
          title={zh ? '租户详情' : 'Organization details'}
          onClose={() => setEditTarget(null)}
        >
          <label className="grid gap-2 text-sm font-medium">
            {zh ? '租户名称' : 'Organization name'}
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <p className="mt-3 text-xs text-zinc-500">
            {zh ? '状态：' : 'Status: '}
            <StatusBadge status={editTarget.status} zh={zh} />
          </p>
          {editTarget.users?.[0] ? (
            <div className="mt-5 rounded-md bg-zinc-50 p-3 text-sm">
              <p className="font-medium">
                {zh ? '租户管理员' : 'Tenant administrator'}
              </p>
              <p className="mt-1 text-zinc-600">
                {editTarget.users[0].username || '—'} ·{' '}
                {editTarget.users[0].email}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-5">
              <p className="text-sm font-semibold">
                {zh
                  ? '尚无管理员，请创建登录账号'
                  : 'No administrator yet — create a login'}
              </p>
              <input
                placeholder={zh ? '用户名（选填）' : 'Username (optional)'}
                value={administratorName}
                onChange={(e) => setAdministratorName(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder={zh ? '登录邮箱' : 'Login email'}
                value={administratorEmail}
                onChange={(e) => setAdministratorEmail(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder={
                  zh
                    ? '初始密码（至少 6 位）'
                    : 'Initial password (6+ characters)'
                }
                value={administratorPassword}
                onChange={(e) => setAdministratorPassword(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() => void addAdministrator()}
                className="justify-self-start rounded-md bg-emerald-600 px-3 py-2 text-sm text-white"
              >
                {zh ? '创建管理员账号' : 'Create administrator'}
              </button>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void update()}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white"
            >
              {zh ? '保存修改' : 'Save changes'}
            </button>
          </div>
        </Modal>
      ) : null}
      {disableTarget ? (
        <Modal
          title={
            disableTarget.status === 'ACTIVE'
              ? zh
                ? '禁用租户？'
                : 'Disable organization?'
              : zh
                ? '启用租户？'
                : 'Enable organization?'
          }
          onClose={() => setDisableTarget(null)}
        >
          <p className="text-sm text-zinc-600">
            {disableTarget.status === 'ACTIVE'
              ? zh
                ? `禁用后，${disableTarget.name} 的用户将无法访问工作区。`
                : `${disableTarget.name} will no longer be able to access this workspace.`
              : zh
                ? `启用后，${disableTarget.name} 的用户将恢复访问工作区。`
                : `${disableTarget.name} will regain access to this workspace.`}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setDisableTarget(null)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
            >
              {zh ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={() => void disable()}
              className={`rounded-md px-3 py-2 text-sm text-white ${disableTarget.status === 'ACTIVE' ? 'bg-rose-600' : 'bg-emerald-600'}`}
            >
              {disableTarget.status === 'ACTIVE'
                ? zh
                  ? '禁用租户'
                  : 'Disable organization'
                : zh
                  ? '启用租户'
                  : 'Enable organization'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function OrganizationDepartmentAdmin() {
  const { i18n } = useTranslation()
  const zh = !i18n.resolvedLanguage?.startsWith('en')
  const [items, setItems] = useState<Department[]>([])
  const [editing, setEditing] = useState<Department | 'new' | null>(null)
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const reload = () =>
    void listDepartments()
      .then(setItems)
      .catch(() => undefined)
  useEffect(reload, [])
  const save = async () => {
    if (!name.trim()) return
    try {
      if (editing === 'new')
        await createDepartment(name.trim(), nameEn.trim() || undefined)
      else if (editing)
        await updateDepartment(
          editing.id,
          name.trim(),
          nameEn.trim() || undefined,
        )
      setEditing(null)
      setName('')
      setNameEn('')
      reload()
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  return (
    <div className="min-h-full bg-[#fafafb] p-8 max-md:p-4">
      <div className="mb-6 flex justify-end">
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditing('new')
            setName('')
            setNameEn('')
          }}
        >
          {zh ? '新建部门' : 'Create department'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-5 py-3">{zh ? '部门名称' : 'Department'}</th>
              <th className="px-5 py-3">{zh ? '成员数' : 'Members'}</th>
              <th className="px-5 py-3">{zh ? '创建时间' : 'Created'}</th>
              <th className="px-5 py-3 text-right">
                {zh ? '操作' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                className="border-b border-zinc-100 last:border-0"
                key={item.id}
              >
                <td className="px-5 py-4 font-medium text-zinc-900">
                  {localizedName(item, i18n.resolvedLanguage)}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {item._count?.memberships ?? 0}
                </td>
                <td className="px-5 py-4 text-zinc-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
                    onClick={() => {
                      setEditing(item)
                      setName(item.name)
                      setNameEn(item.nameEn ?? '')
                    }}
                  >
                    {zh ? '编辑' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <Modal
          title={
            editing === 'new'
              ? zh
                ? '新建部门'
                : 'Create department'
              : zh
                ? '编辑部门'
                : 'Edit department'
          }
          onClose={() => setEditing(null)}
        >
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              {zh ? '中文名称' : 'Chinese name'}
              <input
                autoFocus
                className="w-full rounded border px-3 py-2 font-normal"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              {zh ? '英文名称（可选）' : 'English name (optional)'}
              <input
                className="w-full rounded border px-3 py-2 font-normal"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
              />
            </label>
          </div>
          <button
            className="mt-4 w-full rounded bg-indigo-600 px-3 py-2 text-white"
            onClick={() => void save()}
          >
            {zh ? '保存' : 'Save'}
          </button>
        </Modal>
      ) : null}
    </div>
  )
}

function EmployeeAdmin() {
  const { t, i18n } = useTranslation()
  const zh = !i18n.resolvedLanguage?.startsWith('en')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<OrganizationRole[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [adminTarget, setAdminTarget] = useState<Employee | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null)
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null)
  const [departmentId, setDepartmentId] = useState('')
  const [assignmentRoleIds, setAssignmentRoleIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [showEmployeePassword, setShowEmployeePassword] = useState(false)
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    departmentId: '',
    roleIds: [] as string[],
  })

  const reload = () =>
    void Promise.all([listEmployees(), listDepartments(), listRoles()])
      .then(([employeeItems, departmentItems, roleItems]) => {
        setEmployees(employeeItems)
        setDepartments(departmentItems)
        setRoles(roleItems)
      })
      .catch(() => undefined)
  useEffect(reload, [])
  const add = async () => {
    if (
      !form.email ||
      form.password.length < 6 ||
      (form.departmentId && !form.roleIds.length)
    )
      return
    try {
      const employee = await createEmployee({
        email: form.email,
        username: form.username || undefined,
        password: form.password,
        ...(form.departmentId
          ? {
              departmentId: form.departmentId,
              roleIds: form.roleIds,
            }
          : {}),
      })
      setEmployees((current) => [...current, employee])
      setForm({
        email: '',
        username: '',
        password: '',
        departmentId: '',
        roleIds: [],
      })
      setCreateOpen(false)
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }

  const assignDepartment = async () => {
    if (!adminTarget || !departmentId || !assignmentRoleIds.length || assigning)
      return
    const existingMembership = adminTarget.memberships?.find(
      (membership) => membership.department.id === departmentId,
    )
    try {
      setAssigning(true)
      if (existingMembership)
        await updateMember(departmentId, existingMembership.id, {
          employeeId: adminTarget.id,
          roleIds: assignmentRoleIds,
        })
      else
        await assignMember(departmentId, {
          employeeId: adminTarget.id,
          roleIds: assignmentRoleIds,
        })
      setAdminTarget(null)
      setDepartmentId('')
      setAssignmentRoleIds([])
      reload()
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="min-h-full bg-[#fafafb] p-8 text-zinc-950 max-md:p-4">
      <div className="mb-6 flex justify-end">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white"
          onClick={() => {
            setForm({
              email: '',
              username: '',
              password: '',
              departmentId: '',
              roleIds: [],
            })
            setShowEmployeePassword(false)
            setCreateOpen(true)
          }}
        >
          {zh ? '新建员工' : 'Create employee'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="p-4">{zh ? '员工' : 'Employee'}</th>
              <th>{zh ? '角色' : 'Role'}</th>
              <th>{zh ? '部门名称' : 'Department name'}</th>
              <th>{zh ? '状态' : 'Status'}</th>
              <th className="pr-4 text-right">{zh ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="border-b border-zinc-100 bg-white last:border-0"
              >
                <td className="p-4">
                  <b className="block">{employee.username ?? employee.email}</b>
                  <small className="text-zinc-500">{employee.email}</small>
                </td>
                <td>
                  {[
                    ...new Set(
                      employee.memberships?.flatMap((membership) =>
                        membership.roles.map(({ role }) => role.name),
                      ) ?? [],
                    ),
                  ]
                    .map((roleName) =>
                      roleName === 'DEPARTMENT_ADMIN'
                        ? t('roles.department')
                        : roleName === 'DEPARTMENT_MEMBER'
                          ? t('roles.member')
                          : roleName,
                    )
                    .join(' / ') || '—'}
                </td>
                <td className="max-w-64 text-xs text-zinc-500">
                  {employee.memberships
                    ?.map((item) =>
                      localizedName(item.department, i18n.resolvedLanguage),
                    )
                    .join(', ') || '—'}
                </td>
                <td>
                  <StatusBadge status={employee.status} zh={zh} />
                </td>
                <td className="space-x-2 py-3 text-right pr-4">
                  {!employee.organizationRole ? (
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => {
                        setAdminTarget(employee)
                        const membership = employee.memberships?.[0]
                        setDepartmentId(membership?.department.id ?? '')
                        setAssignmentRoleIds(
                          membership?.roles.map(({ role }) => role.id) ?? [],
                        )
                      }}
                    >
                      {zh ? '分配部门' : 'Assign department'}
                    </button>
                  ) : null}
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setStatusTarget(employee)}
                  >
                    {employee.status === 'ACTIVE'
                      ? zh
                        ? '禁用'
                        : 'Disable'
                      : zh
                        ? '启用'
                        : 'Enable'}
                  </button>
                  <button
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600"
                    onClick={() => setRemoveTarget(employee)}
                  >
                    {zh ? '移出租户' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {createOpen ? (
        <Modal
          title={zh ? '新建租户员工' : 'Create tenant employee'}
          onClose={() => setCreateOpen(false)}
        >
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              Email
              <input
                className="rounded-md border border-zinc-200 px-3 py-2 font-normal"
                placeholder="employee@example.com"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              {zh ? '名称' : 'Name'}
              <input
                className="rounded-md border border-zinc-200 px-3 py-2 font-normal"
                placeholder={zh ? '员工名称' : 'Employee name'}
                autoComplete="off"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              {zh ? '密码' : 'Password'}
              <span className="relative">
                <input
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 pr-10 font-normal"
                  type={showEmployeePassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={zh ? '至少 6 位' : 'At least 6 characters'}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                <button
                  type="button"
                  aria-label={
                    showEmployeePassword
                      ? zh
                        ? '隐藏密码'
                        : 'Hide password'
                      : zh
                        ? '显示密码'
                        : 'Show password'
                  }
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-zinc-400 hover:text-indigo-600"
                  onClick={() => setShowEmployeePassword((visible) => !visible)}
                >
                  {showEmployeePassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              {zh ? '部门（可为空）' : 'Department (optional)'}
              <AppSelect
                label={zh ? '部门' : 'Department'}
                placeholder={zh ? '暂不分配部门' : 'No department'}
                value={form.departmentId}
                options={departments.map((department) => ({
                  value: department.id,
                  label: localizedName(department, i18n.resolvedLanguage),
                }))}
                onChange={(value) =>
                  setForm({
                    ...form,
                    departmentId: value,
                    roleIds: value ? form.roleIds : [],
                  })
                }
              />
            </label>
            {form.departmentId ? (
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                {zh ? '角色' : 'Role'}
                <Select
                  aria-label={zh ? '角色（可多选）' : 'Roles (multiple)'}
                  fullWidth
                  onChange={(keys) =>
                    setForm({ ...form, roleIds: keys.map(String) })
                  }
                  placeholder={zh ? '选择一个或多个角色' : 'Select roles'}
                  selectionMode="multiple"
                  value={form.roleIds}
                >
                  <Select.Trigger className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 shadow-none">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={roles} selectionBehavior="toggle">
                      {(role) => (
                        <ListBox.Item
                          id={role.id}
                          textValue={
                            role.name === 'DEPARTMENT_ADMIN'
                              ? t('roles.department')
                              : t('roles.member')
                          }
                        >
                          {role.name === 'DEPARTMENT_ADMIN'
                            ? t('roles.department')
                            : t('roles.member')}
                          <ListBox.Item.Indicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </label>
            ) : null}
            <button
              className="rounded bg-indigo-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !form.email ||
                form.password.length < 6 ||
                Boolean(form.departmentId && !form.roleIds.length)
              }
              onClick={() => void add()}
            >
              {zh ? '创建' : 'Create'}
            </button>
          </div>
        </Modal>
      ) : null}
      {adminTarget ? (
        <Modal
          title={zh ? '给员工分配部门' : 'Assign employee to department'}
          onClose={() => {
            setAdminTarget(null)
            setDepartmentId('')
            setAssignmentRoleIds([])
          }}
        >
          <div className="grid gap-4">
            <AppSelect
              label={zh ? '部门名称' : 'Department'}
              placeholder={zh ? '选择部门' : 'Select department'}
              showLabel
              value={departmentId}
              options={departments.map((department) => ({
                value: department.id,
                label: localizedName(department, i18n.resolvedLanguage),
              }))}
              onChange={(value) => {
                const membership = adminTarget.memberships?.find(
                  (item) => item.department.id === value,
                )
                setDepartmentId(value)
                setAssignmentRoleIds(
                  membership?.roles.map(({ role }) => role.id) ?? [],
                )
              }}
            />
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                {zh ? '部门角色（可多选）' : 'Department roles (multiple)'}
              </label>
              <Select
                aria-label={
                  zh ? '部门角色（可多选）' : 'Department roles (multiple)'
                }
                fullWidth
                onChange={(keys) => setAssignmentRoleIds(keys.map(String))}
                placeholder={zh ? '选择一个或多个角色' : 'Select roles'}
                selectionMode="multiple"
                value={assignmentRoleIds}
              >
                <Select.Trigger className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 shadow-none">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={roles} selectionBehavior="toggle">
                    {(role) => (
                      <ListBox.Item
                        id={role.id}
                        textValue={
                          role.name === 'DEPARTMENT_ADMIN'
                            ? t('roles.department')
                            : t('roles.member')
                        }
                      >
                        {role.name === 'DEPARTMENT_ADMIN'
                          ? t('roles.department')
                          : t('roles.member')}
                        <ListBox.Item.Indicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
          <button
            className="mt-4 w-full rounded bg-indigo-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!departmentId || !assignmentRoleIds.length || assigning}
            onClick={() => void assignDepartment()}
          >
            {assigning
              ? zh
                ? '正在分配…'
                : 'Assigning…'
              : zh
                ? '确认分配'
                : 'Assign'}
          </button>
        </Modal>
      ) : null}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status === 'ACTIVE'
            ? zh
              ? '禁用员工？'
              : 'Disable employee?'
            : zh
              ? '启用员工？'
              : 'Enable employee?'
        }
        description={
          statusTarget?.status === 'ACTIVE'
            ? zh
              ? `${statusTarget?.username ?? statusTarget?.email ?? ''} 将无法继续登录。`
              : `${statusTarget?.username ?? statusTarget?.email ?? ''} will no longer be able to sign in.`
            : zh
              ? `${statusTarget?.username ?? statusTarget?.email ?? ''} 将恢复登录权限。`
              : `${statusTarget?.username ?? statusTarget?.email ?? ''} will regain sign-in access.`
        }
        confirmLabel={
          statusTarget?.status === 'ACTIVE'
            ? zh
              ? '确认禁用'
              : 'Disable'
            : zh
              ? '确认启用'
              : 'Enable'
        }
        cancelLabel={zh ? '取消' : 'Cancel'}
        destructive={statusTarget?.status === 'ACTIVE'}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget) return
          void updateEmployee(statusTarget.id, {
            status: statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
          }).then(() => {
            setStatusTarget(null)
            reload()
          })
        }}
      />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={zh ? '移出租户？' : 'Remove employee?'}
        description={
          zh
            ? `将移除 ${removeTarget?.username ?? removeTarget?.email ?? ''} 的全部部门关系并禁用账号。`
            : `This removes all department memberships for ${removeTarget?.username ?? removeTarget?.email ?? ''} and disables the account.`
        }
        confirmLabel={zh ? '确认移除' : 'Remove'}
        cancelLabel={zh ? '取消' : 'Cancel'}
        destructive
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return
          void removeEmployee(removeTarget.id).then(() => {
            setRemoveTarget(null)
            reload()
          })
        }}
      />
    </div>
  )
}

function DepartmentMemberAdmin() {
  const { departmentId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const zh = !i18n.resolvedLanguage?.startsWith('en')
  const [members, setMembers] = useState<Member[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<OrganizationRole[]>([])
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const reload = () =>
    void Promise.all([
      listMembers(departmentId),
      listEmployeeOptions(departmentId),
      listRoles(),
    ])
      .then(([memberItems, employeeItems, roleItems]) => {
        setMembers(memberItems)
        setEmployees(employeeItems)
        setRoles(roleItems)
      })
      .catch(() => undefined)
  useEffect(reload, [departmentId])
  const open = (member: Member | 'new') => {
    setEditing(member)
    setEmployeeId(member === 'new' ? '' : member.user.id)
    setRoleIds(member === 'new' ? [] : member.roles.map(({ role }) => role.id))
  }
  const save = async () => {
    if (!employeeId || !roleIds.length) return
    try {
      if (editing === 'new')
        await assignMember(departmentId, {
          employeeId,
          roleIds,
        })
      else if (editing)
        await updateMember(departmentId, editing.id, {
          employeeId,
          roleIds,
        })
      setEditing(null)
      reload()
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  return (
    <div className="min-h-full bg-[#fafafb] p-8 max-md:p-4">
      <div className="mb-6 flex justify-end">
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
          onClick={() => open('new')}
        >
          {zh ? '添加部门成员' : 'Add member'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="p-4">{zh ? '成员' : 'Member'}</th>
              <th>{zh ? '角色' : 'Roles'}</th>
              <th>{zh ? '状态' : 'Status'}</th>
              <th className="pr-4 text-right">{zh ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-zinc-100 bg-white last:border-0"
              >
                <td className="p-4">
                  <b className="block">
                    {member.user.username ?? member.user.email}
                  </b>
                  <small>{member.user.email}</small>
                </td>
                <td>
                  {member.roles
                    .map(({ role }) =>
                      role.name === 'DEPARTMENT_ADMIN'
                        ? t('roles.department')
                        : t('roles.member'),
                    )
                    .join(' + ')}
                </td>
                <td>
                  <StatusBadge status={member.status} zh={zh} />
                </td>
                <td className="space-x-2 text-right pr-4">
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => open(member)}
                  >
                    {zh ? '修改角色' : 'Change role'}
                  </button>
                  <button
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600"
                    onClick={() => setRemoveTarget(member)}
                  >
                    {zh ? '移出部门' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <Modal
          title={zh ? '部门成员与角色' : 'Department membership and roles'}
          onClose={() => setEditing(null)}
        >
          <div className="grid gap-4">
            <AppSelect
              disabled={editing !== 'new'}
              label={zh ? '租户员工' : 'Tenant employee'}
              placeholder={zh ? '选择租户员工' : 'Select tenant employee'}
              value={employeeId}
              options={
                editing !== 'new'
                  ? [
                      {
                        value: editing.user.id,
                        label: editing.user.email,
                      },
                    ]
                  : employees.map((employee) => ({
                      value: employee.id,
                      label: `${employee.username ?? employee.email} (${employee.email})`,
                    }))
              }
              onChange={setEmployeeId}
            />
            <Select
              aria-label={zh ? '角色（可多选）' : 'Roles (multiple)'}
              fullWidth
              onChange={(keys) => setRoleIds(keys.map(String))}
              placeholder={zh ? '选择一个或多个角色' : 'Select roles'}
              selectionMode="multiple"
              value={roleIds}
            >
              <Select.Trigger className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 shadow-none">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={roles} selectionBehavior="toggle">
                  {(role) => (
                    <ListBox.Item
                      id={role.id}
                      textValue={
                        role.name === 'DEPARTMENT_ADMIN'
                          ? t('roles.department')
                          : t('roles.member')
                      }
                    >
                      {role.name === 'DEPARTMENT_ADMIN'
                        ? t('roles.department')
                        : t('roles.member')}
                      <ListBox.Item.Indicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <button
              className="rounded bg-indigo-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!employeeId || !roleIds.length}
              onClick={() => void save()}
            >
              {zh ? '保存' : 'Save'}
            </button>
          </div>
        </Modal>
      ) : null}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={zh ? '移出部门？' : 'Remove from department?'}
        description={
          zh
            ? `${removeTarget?.user.username ?? removeTarget?.user.email ?? ''} 将无法继续访问本部门资源。`
            : `${removeTarget?.user.username ?? removeTarget?.user.email ?? ''} will lose access to this department.`
        }
        confirmLabel={zh ? '确认移除' : 'Remove'}
        cancelLabel={zh ? '取消' : 'Cancel'}
        destructive
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return
          void removeMember(departmentId, removeTarget.id).then(() => {
            setRemoveTarget(null)
            reload()
          })
        }}
      />
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/20 p-4">
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-zinc-400">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
