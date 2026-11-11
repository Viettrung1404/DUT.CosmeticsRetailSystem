import { EditOutlined, LockOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, UnlockOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createUser, getPermissions, getRoles, getUser, getUsers, setUserPermissions, setUserStores, updateUser } from '../../api/adminUsersApi'
import type { AdminPermission, AdminRole, AdminStore, AdminUser, AdminUsersQuery, UpdateUserInput, UserInput, UserStatus } from '../../types/adminUsers'

const { Title, Text } = Typography
const statusLabels: Record<UserStatus, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Tạm khóa', BANNED: 'Cấm truy cập' }
const statusColors: Record<UserStatus, string> = { ACTIVE: 'green', INACTIVE: 'orange', BANNED: 'red' }
type EditorValues = { email?: string; fullName: string; phone?: string; roleId: number; storeIds?: string[] }
type PermissionMode = 'inherit' | 'extra' | 'revoke'

function getErrorMessage(error: unknown): string {
  const response = error as { response?: { status?: number; data?: { message?: string | string[] } } }
  const value = response.response?.data?.message
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  if (response.response?.status === 403) return 'Tài khoản không có quyền SYSTEM_USER_MANAGE'
  return 'Không thể kết nối hoặc xử lý yêu cầu'
}
function hasBit(mask: string, bit: number): boolean {
  return (BigInt(mask || '0') & (1n << BigInt(bit))) !== 0n
}
function permissionMode(user: AdminUser, p: AdminPermission): PermissionMode {
  return hasBit(user.extraPermissions, p.bitPosition) ? 'extra' :
    hasBit(user.revokedPermissions, p.bitPosition) ? 'revoke' : 'inherit'
}
function validStoreId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export default function UsersPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [query, setQuery] = useState<AdminUsersQuery>({ page: 1, limit: 20, order: 'DESC' })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [editor, setEditor] = useState<AdminUser | 'new' | null>(null)
  const [permissionTarget, setPermissionTarget] = useState<AdminUser | null>(null)
  const [storeTarget, setStoreTarget] = useState<AdminUser | null>(null)
  const [modes, setModes] = useState<Record<number, PermissionMode>>({})
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<EditorValues>()
  const [storeOptions, setStoreOptions] = useState<AdminStore[]>([])

  const load = useCallback(async (params: AdminUsersQuery) => {
    setLoading(true)
    try {
      const result = await getUsers(params)
      setUsers(result.data ?? [])
      setTotal(result.meta?.itemCount ?? 0)
      setStoreOptions((existing) => {
        const map = new Map(existing.map((s) => [s.id, s]))
        result.data?.forEach((user) => user.stores.forEach((store) => map.set(store.id, store)))
        return [...map.values()]
      })
      setForbidden(false)
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 403) setForbidden(true)
      messageApi.error(getErrorMessage(error))
    } finally { setLoading(false) }
  }, [messageApi])

  useEffect(() => { void load(query) }, [load, query])
  useEffect(() => {
    void Promise.all([getRoles(), getPermissions()]).then(([r, p]) => {
      setRoles(r); setPermissions(p)
    }).catch((error: unknown) => messageApi.warning(getErrorMessage(error)))
  }, [messageApi])

  const openEditor = (user: AdminUser | 'new') => {
    setEditor(user)
    form.resetFields()
    if (user !== 'new') form.setFieldsValue({
      fullName: user.fullName, phone: user.phone ?? '', roleId: user.roleId,
      storeIds: user.stores.map((s) => s.id),
    })
  }
  const saveEditor = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editor === 'new') {
        const result = await createUser({
          email: values.email!.trim(), fullName: values.fullName.trim(),
          phone: values.phone?.trim() || undefined, roleId: values.roleId,
          storeIds: values.storeIds ?? [],
        } satisfies UserInput)
        messageApi[result.activationEmailSent ? 'success' : 'warning'](
          result.activationEmailSent ? 'Đã tạo tài khoản và gửi email kích hoạt' :
            'Đã tạo tài khoản nhưng chưa gửi được email kích hoạt. Liên hệ Backend để cấu hình SMTP.',
        )
      } else if (editor) {
        await updateUser(editor.id, {
          fullName: values.fullName.trim(), phone: values.phone?.trim() ?? '', roleId: values.roleId,
        } satisfies UpdateUserInput)
        const current = editor.stores.map((s) => s.id)
        const desired = values.storeIds ?? []
        if (current.length !== desired.length || current.some((id) => !desired.includes(id))) {
          await setUserStores(editor.id, desired)
        }
        messageApi.success('Đã cập nhật người dùng')
      }
      setEditor(null)
      await load(query)
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return
      messageApi.error(getErrorMessage(error))
    } finally { setSaving(false) }
  }

  const openPermissions = async (user: AdminUser) => {
    try {
      const fresh = await getUser(user.id)
      setPermissionTarget(fresh)
      setModes(Object.fromEntries(permissions.map((p) => [p.bitPosition, permissionMode(fresh, p)])))
    } catch (error) { messageApi.error(getErrorMessage(error)) }
  }
  const savePermissions = async () => {
    if (!permissionTarget) return
    let extra = 0n
    let revoked = 0n
    for (const permission of permissions) {
      const bit = 1n << BigInt(permission.bitPosition)
      if (modes[permission.bitPosition] === 'extra') extra |= bit
      if (modes[permission.bitPosition] === 'revoke') revoked |= bit
    }
    setSaving(true)
    try {
      await setUserPermissions(permissionTarget.id, extra.toString(), revoked.toString())
      messageApi.success('Đã cập nhật phân quyền')
      setPermissionTarget(null)
      await load(query)
    } catch (error) { messageApi.error(getErrorMessage(error)) }
    finally { setSaving(false) }
  }
  const openStores = async (user: AdminUser) => {
    try {
      const fresh = await getUser(user.id)
      setStoreTarget(fresh)
      setStoreIds(fresh.stores.map((s) => s.id))
      setStoreOptions((current) => {
        const map = new Map(current.map((s) => [s.id, s]))
        fresh.stores.forEach((store) => map.set(store.id, store))
        return [...map.values()]
      })
    } catch (error) { messageApi.error(getErrorMessage(error)) }
  }
  const saveStores = async () => {
    if (!storeTarget) return
    if (storeIds.some((id) => !validStoreId(id))) {
      messageApi.error('Vui lòng nhập UUID cửa hàng hợp lệ')
      return
    }
    setSaving(true)
    try {
      await setUserStores(storeTarget.id, [...new Set(storeIds)])
      messageApi.success('Đã cập nhật cửa hàng phụ trách')
      setStoreTarget(null)
      await load(query)
    } catch (error) { messageApi.error(getErrorMessage(error)) }
    finally { setSaving(false) }
  }
  const changeStatus = async (user: AdminUser, status: UserStatus) => {
    try {
      await updateUser(user.id, { status })
      messageApi.success('Đã cập nhật trạng thái tài khoản')
      await load(query)
    } catch (error) { messageApi.error(getErrorMessage(error)) }
  }

  const columns: ColumnsType<AdminUser> = [
    { title: 'Người dùng', width: 235, render: (_, row) => <div><strong>{row.fullName}</strong><div><Text type="secondary">{row.email}</Text></div></div> },
    { title: 'Điện thoại', dataIndex: 'phone', width: 125, render: (v: string | null) => v || '—' },
    { title: 'Vai trò', dataIndex: 'roleDisplayName', width: 155 },
    { title: 'Trạng thái', dataIndex: 'status', width: 125, render: (v: UserStatus) => <Tag color={statusColors[v]}>{statusLabels[v] ?? v}</Tag> },
    { title: 'Cửa hàng', width: 210, render: (_, row) => row.stores.length ? row.stores.map((s) => <Tag key={s.id}>{s.name}</Tag>) : <Text type="secondary">Chưa gán</Text> },
    { title: 'Thao tác', fixed: 'right', width: 325, render: (_, row) => <Space wrap size={4}>
      <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>Sửa</Button>
      <Button size="small" onClick={() => void openStores(row)}>Cửa hàng</Button>
      <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => void openPermissions(row)}>Quyền</Button>
      <Popconfirm title={row.status === 'ACTIVE' ? 'Tạm khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description="Thay đổi trạng thái có thể thu hồi phiên đăng nhập của người dùng."
        okText="Xác nhận" cancelText="Hủy"
        onConfirm={() => void changeStatus(row, row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>
        <Button size="small" danger={row.status === 'ACTIVE'} icon={row.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />}>{row.status === 'ACTIVE' ? 'Khóa' : 'Mở'}</Button>
      </Popconfirm>
    </Space> },
  ]

  const role = roles.find((r) => r.id === permissionTarget?.roleId)
  const byModule = useMemo(() => {
    const group: Record<string, AdminPermission[]> = {}
    permissions.forEach((p) => (group[p.module] ??= []).push(p))
    return group
  }, [permissions])

  const storeChoices = storeOptions.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))
  return <div>
    {contextHolder}
    <div className="glowup-page-header">
      <div><Title level={2} className="glowup-page-title">Người dùng & phân quyền</Title>
        <Text className="glowup-page-subtitle">Quản lý tài khoản, vai trò, cửa hàng và quyền truy cập theo module.</Text></div>
      <Space><Button icon={<ReloadOutlined />} onClick={() => void load(query)}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor('new')}>Tạo tài khoản</Button></Space>
    </div>
    {forbidden && <Alert type="warning" showIcon style={{ marginBottom: 16 }}
      message="Bạn không có quyền SYSTEM_USER_MANAGE"
      description="Chỉ quản trị viên có quyền quản lý người dùng mới được xem, cấp quyền và gán cửa hàng. Liên hệ người phụ trách Backend để cấp quyền phù hợp." />}
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Input.Search placeholder="Tên, email hoặc số điện thoại" style={{ width: 280 }} value={search} onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setQuery((q) => ({ ...q, page: 1, search: search.trim() || undefined }))} enterButton />
        <Select allowClear placeholder="Vai trò" style={{ width: 180 }} value={query.roleId}
          options={roles.map((r) => ({ label: r.displayName, value: r.id }))}
          onChange={(roleId) => setQuery((q) => ({ ...q, page: 1, roleId }))} />
        <Select allowClear placeholder="Trạng thái" style={{ width: 160 }} value={query.status}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          onChange={(status) => setQuery((q) => ({ ...q, page: 1, status }))} />
        <Button onClick={() => { setSearch(''); setQuery({ page: 1, limit: 20, order: 'DESC' }) }}>Xóa lọc</Button>
      </Space>
    </Card>
    <Card className="glowup-table-card" title="Danh sách người dùng">
      <Table<AdminUser> rowKey="id" loading={loading} dataSource={users} columns={columns} scroll={{ x: 1200 }}
        pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true, showTotal: (n) => `${n} người dùng` }}
        onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))} />
    </Card>
    <Modal title={editor === 'new' ? 'Tạo tài khoản nhân viên' : 'Chỉnh sửa người dùng'} open={editor !== null}
      onCancel={() => setEditor(null)} onOk={() => void saveEditor()} okText="Lưu" confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
        {editor === 'new' && <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
          <Input autoComplete="off" /></Form.Item>}
        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, min: 2, max: 100, message: 'Họ tên từ 2 đến 100 ký tự' }]}>
          <Input maxLength={100} /></Form.Item>
        <Form.Item label="Số điện thoại" name="phone" rules={[{ pattern: /^(|[0-9]{10,11})$/, message: 'Số điện thoại 10–11 chữ số' }]}>
          <Input maxLength={11} /></Form.Item>
        <Form.Item label="Vai trò" name="roleId" rules={[{ required: true, message: 'Chọn vai trò' }]}>
          <Select options={roles.filter((r) => r.name.toUpperCase() !== 'CUSTOMER').map((r) => ({ value: r.id, label: r.displayName }))} /></Form.Item>
        {editor === 'new' && <Form.Item label="Cửa hàng được gán (nếu có)" name="storeIds">
          <Select mode="multiple" allowClear options={storeChoices} placeholder="Chọn cửa hàng đã biết" /></Form.Item>}
        {editor !== 'new' && editor && <Alert showIcon type="info" message="Sửa cửa hàng và phân quyền bằng các nút tương ứng ở danh sách." />}
        {editor === 'new' && <Alert showIcon type="info" message="Hệ thống gửi email đặt mật khẩu sau khi tạo tài khoản. Cần Backend cấu hình SMTP." />}
      </Form>
    </Modal>
    <Modal title={`Gán cửa hàng — ${storeTarget?.fullName ?? ''}`} open={storeTarget !== null}
      onCancel={() => setStoreTarget(null)} onOk={() => void saveStores()} okText="Lưu cửa hàng" confirmLoading={saving}>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Các lựa chọn có sẵn được tổng hợp từ cửa hàng của những người dùng đã tải."
        description="Nếu chưa có cửa hàng trong danh sách, hãy nhập UUID thật do Backend cung cấp. API sẽ xác minh cửa hàng tồn tại." />
      <Select mode="tags" style={{ width: '100%' }} placeholder="Chọn hoặc nhập UUID cửa hàng"
        value={storeIds} onChange={(values: string[]) => setStoreIds(values)}
        options={storeChoices} tokenSeparators={[',']} />
      {storeIds.some((id) => !validStoreId(id)) && <Text type="danger">Có UUID cửa hàng không hợp lệ</Text>}
    </Modal>
    <Modal title={`Phân quyền — ${permissionTarget?.fullName ?? ''}`} open={permissionTarget !== null}
      width={850} onCancel={() => setPermissionTarget(null)} onOk={() => void savePermissions()}
      okText="Lưu phân quyền" confirmLoading={saving}>
      {permissionTarget && <>
        <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Vai trò">{role?.displayName ?? permissionTarget.roleDisplayName}</Descriptions.Item>
          <Descriptions.Item label="Nguyên tắc">Kế thừa = quyền theo vai trò; Cấp thêm = bật quyền; Thu hồi = tắt quyền.</Descriptions.Item>
        </Descriptions>
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="Thay đổi quyền ảnh hưởng trực tiếp đến khả năng truy cập. Chỉ cấp các quyền thực sự cần thiết." />
        <div style={{ maxHeight: 470, overflowY: 'auto' }}>
          {Object.entries(byModule).map(([module, items]) => <Card size="small" key={module} title={module} style={{ marginBottom: 12 }}>
            {items.map((p) => {
              const value = modes[p.bitPosition] ?? 'inherit'
              const inherited = Boolean(role && hasBit(role.permissions, p.bitPosition))
              const effective = value === 'extra' || (value === 'inherit' && inherited)
              return <div key={p.bitPosition} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 230px', minWidth: 0 }}>
                  <strong>{p.permissionName}</strong><div><Text type="secondary" style={{ fontSize: 11 }}>{p.permissionCode}</Text></div>
                </div>
                <Tag color={effective ? 'green' : 'default'}>{effective ? 'Được phép' : 'Không có quyền'}</Tag>
                <Space wrap>
                  <Checkbox checked={value === 'extra'} onChange={(e) => setModes((old) => ({
                    ...old, [p.bitPosition]: e.target.checked ? 'extra' : 'inherit',
                  }))}>Cấp thêm</Checkbox>
                  <Checkbox checked={value === 'revoke'} onChange={(e) => setModes((old) => ({
                    ...old, [p.bitPosition]: e.target.checked ? 'revoke' : 'inherit',
                  }))}>Thu hồi</Checkbox>
                </Space>
              </div>
            })}
          </Card>)}
        </div>
      </>}
    </Modal>
  </div>
}
