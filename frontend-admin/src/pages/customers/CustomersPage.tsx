import {
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminCustomers, getAdminOrders } from '../../api/ordersApi'
import type {
  AdminCustomerListItem,
  AdminCustomerQuery,
  AdminOrderListItem,
  OrderStoreSummary,
} from '../../types/orders'

const { Title, Text } = Typography
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const statusColors: Record<string, string> = {
  PENDING: 'gold', CONFIRMED: 'blue', PROCESSING: 'purple', SHIPPING: 'cyan', DELIVERED: 'geekblue', COMPLETED: 'green', CANCELLED: 'red',
}

type LoyaltyTierOption = { id: string; name: string }

function mergeTiers(current: LoyaltyTierOption[], items: AdminCustomerListItem[]) {
  const tierMap = new Map(current.map((tier) => [tier.id, tier]))
  items.forEach((item) => {
    if (item.loyaltyTier?.id) tierMap.set(item.loyaltyTier.id, item.loyaltyTier)
  })
  return Array.from(tierMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

function mergeStores(current: OrderStoreSummary[], orders: AdminOrderListItem[]) {
  const storeMap = new Map(current.map((store) => [store.id, store]))
  orders.forEach((order) => {
    if (order.store?.id) storeMap.set(order.store.id, order.store)
  })
  return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState<AdminCustomerQuery>({ page: 1, limit: 20, order: 'DESC' })
  const [keyword, setKeyword] = useState('')
  const [knownTiers, setKnownTiers] = useState<LoyaltyTierOption[]>([])
  const [knownStores, setKnownStores] = useState<OrderStoreSummary[]>([])
  const [selected, setSelected] = useState<AdminCustomerListItem | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history, setHistory] = useState<AdminOrderListItem[]>([])

  const loadCustomers = async (next: AdminCustomerQuery = query) => {
    setLoading(true)
    try {
      const result = await getAdminCustomers(next)
      const items = result.data ?? []
      setCustomers(items)
      setKnownTiers((current) => mergeTiers(current, items))
      setTotal(Number(result.meta?.itemCount ?? 0))
    } catch {
      messageApi.error('Không thể tải danh sách khách hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomers(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.loyaltyTierId, query.storeId, query.sortBy, query.order])

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [customerResult, orderResult] = await Promise.all([
          getAdminCustomers({ page: 1, limit: 100, order: 'DESC' }),
          getAdminOrders({ page: 1, limit: 100, order: 'DESC' }),
        ])
        setKnownTiers((current) => mergeTiers(current, customerResult.data ?? []))
        setKnownStores((current) => mergeStores(current, orderResult.data ?? []))
      } catch {
        // Filter options are progressive; the main table can still work if this preload fails.
      }
    }
    void loadFilterOptions()
  }, [])

  const applySearch = () => {
    const next = { ...query, page: 1, search: keyword.trim() || undefined }
    setQuery(next)
    void loadCustomers(next)
  }

  const resetFilters = () => {
    setKeyword('')
    setQuery({ page: 1, limit: 20, order: 'DESC' })
  }

  const openCustomer = async (customer: AdminCustomerListItem) => {
    setSelected(customer)
    setHistory([])
    setHistoryLoading(true)
    try {
      const result = await getAdminOrders({ customerId: customer.id, page: 1, limit: 10, order: 'DESC' })
      setHistory(result.data ?? [])
      setKnownStores((current) => mergeStores(current, result.data ?? []))
    } catch {
      messageApi.warning('Không tải được lịch sử đơn hàng của khách hàng')
    } finally {
      setHistoryLoading(false)
    }
  }

  const columns: ColumnsType<AdminCustomerListItem> = useMemo(() => [
    {
      title: 'Khách hàng',
      render: (_, record) => (
        <Space>
          <Avatar style={{ background: '#FFF1F2', color: '#BE123C' }} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 700 }}>{record.fullName ?? 'Khách chưa cập nhật tên'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.phone ?? record.email ?? '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tài khoản',
      dataIndex: 'hasAccount',
      width: 110,
      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Đã đăng ký' : 'Khách POS'}</Tag>,
    },
    {
      title: 'Hạng',
      dataIndex: 'loyaltyTier',
      width: 120,
      render: (tier: AdminCustomerListItem['loyaltyTier']) => tier ? <Tag icon={<TrophyOutlined />} color="magenta">{tier.name}</Tag> : '—',
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'totalOrders',
      width: 105,
      align: 'right',
      render: (value: number) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Điểm',
      dataIndex: 'totalPoints',
      width: 100,
      align: 'right',
      sorter: true,
      render: (value: number) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Tổng chi tiêu',
      dataIndex: 'totalSpent',
      width: 150,
      align: 'right',
      sorter: true,
      render: (value: number) => <strong>{money.format(value)}</strong>,
    },
    {
      title: 'Tham gia',
      dataIndex: 'createdAt',
      width: 125,
      sorter: true,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: '',
      width: 56,
      render: (_, record) => <Button type="text" icon={<EyeOutlined />} onClick={() => void openCustomer(record)} />,
    },
  ], [])

  const onTableChange = (pagination: TablePaginationConfig, _: unknown, sorter: any) => {
    const field = sorter?.field
    const sortBy = field === 'totalSpent' || field === 'totalPoints' || field === 'createdAt' ? field : query.sortBy
    setQuery((current) => ({
      ...current,
      page: pagination.current ?? 1,
      limit: pagination.pageSize ?? 20,
      sortBy,
      order: sorter?.order === 'ascend' ? 'ASC' : sorter?.order === 'descend' ? 'DESC' : current.order,
    }))
  }

  const totalSpentOnPage = customers.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0)
  const totalOrdersOnPage = customers.reduce((sum, item) => sum + Number(item.totalOrders || 0), 0)
  const registeredOnPage = customers.filter((item) => item.hasAccount).length

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">Quản lý khách hàng</Title>
          <Text className="glowup-page-subtitle">Theo dõi hồ sơ, hạng thành viên và lịch sử mua hàng của khách GlowUp.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadCustomers()}>Làm mới</Button>
      </div>

      <div className="glowup-stat-strip">
        <div className="glowup-stat-card"><div className="glowup-stat-label">Tổng khách hàng</div><div className="glowup-stat-value">{total.toLocaleString('vi-VN')}</div><div className="glowup-stat-meta">Theo bộ lọc hiện tại</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Có tài khoản</div><div className="glowup-stat-value">{registeredOnPage}</div><div className="glowup-stat-meta">Trong trang hiện tại</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Đơn hàng</div><div className="glowup-stat-value">{totalOrdersOnPage}</div><div className="glowup-stat-meta">Tổng đơn của khách đang hiển thị</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Doanh số khách hàng</div><div className="glowup-stat-value" style={{ fontSize: 20 }}>{money.format(totalSpentOnPage)}</div><div className="glowup-stat-meta">Trong trang hiện tại</div></div>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tên, SĐT hoặc email..."
            style={{ width: 250 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Hạng thành viên"
            style={{ width: 170 }}
            value={query.loyaltyTierId}
            onChange={(loyaltyTierId) => setQuery((current) => ({ ...current, page: 1, loyaltyTierId }))}
            options={knownTiers.map((tier) => ({ value: tier.id, label: tier.name }))}
            notFoundContent="Chưa có hạng trong dữ liệu đã tải"
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Cửa hàng"
            style={{ width: 205 }}
            value={query.storeId}
            onChange={(storeId) => setQuery((current) => ({ ...current, page: 1, storeId }))}
            options={knownStores.map((store) => ({
              value: store.id,
              label: `${store.name}${store.code ? ` (${store.code})` : ''}`,
            }))}
            notFoundContent="Chưa có cửa hàng trong dữ liệu đã tải"
          />
          <Select
            allowClear
            placeholder="Sắp xếp"
            style={{ width: 165 }}
            value={query.sortBy}
            onChange={(sortBy) => setQuery((current) => ({ ...current, page: 1, sortBy }))}
            options={[
              { value: 'createdAt', label: 'Ngày tham gia' },
              { value: 'totalSpent', label: 'Tổng chi tiêu' },
              { value: 'totalPoints', label: 'Điểm tích lũy' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={applySearch}>Tìm kiếm</Button>
          <Button onClick={resetFilters}>Xóa lọc</Button>
        </Space>
      </Card>

      <Card className="glowup-table-card" title={<Space><TeamOutlined /> Danh sách khách hàng</Space>}>
        <Table<AdminCustomerListItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={customers}
          scroll={{ x: 1050 }}
          pagination={{ current: query.page ?? 1, pageSize: query.limit ?? 20, total, showSizeChanger: true, showTotal: (value) => `${value} khách hàng` }}
          onChange={onTableChange}
          onRow={(record) => ({ onDoubleClick: () => void openCustomer(record) })}
        />
      </Card>

      <Drawer
        title="Hồ sơ khách hàng"
        open={Boolean(selected)}
        width={560}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <Space size={12} style={{ marginBottom: 20 }}>
              <Avatar size={52} style={{ background: '#BE123C' }} icon={<UserOutlined />} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{selected.fullName ?? 'Khách hàng'}</Title>
                <Text type="secondary">{selected.email ?? selected.phone ?? 'Chưa có thông tin liên hệ'}</Text>
              </div>
            </Space>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Điện thoại">{selected.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Loại">{selected.hasAccount ? 'Khách có tài khoản' : 'Khách mua tại POS'}</Descriptions.Item>
              <Descriptions.Item label="Hạng">{selected.loyaltyTier?.name ?? 'Chưa xếp hạng'}</Descriptions.Item>
              <Descriptions.Item label="Điểm">{selected.totalPoints.toLocaleString('vi-VN')}</Descriptions.Item>
              <Descriptions.Item label="Tổng chi tiêu">{money.format(selected.totalSpent)}</Descriptions.Item>
              <Descriptions.Item label="Tổng đơn">{selected.totalOrders.toLocaleString('vi-VN')}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>Lịch sử đơn hàng</Title>
            {historyLoading ? <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div> : (
              <Table<AdminOrderListItem>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={history}
                columns={[
                  { title: 'Mã đơn', dataIndex: 'orderNumber', render: (value: string, record) => <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/admin/orders/${record.id}`)}>{value}</Button> },
                  { title: 'Ngày', dataIndex: 'createdAt', width: 100, render: (value: string) => dayjs(value).format('DD/MM/YY') },
                  { title: 'Trạng thái', dataIndex: 'status', width: 115, render: (value: string) => <Tag color={statusColors[value]}>{statusLabels[value] ?? value}</Tag> },
                  { title: 'Tổng tiền', dataIndex: 'totalAmount', align: 'right', width: 120, render: (value: number) => money.format(value) },
                ]}
              />
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}
