import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminOrders } from '../../api/ordersApi'
import type { AdminOrderListItem, AdminOrderQuery, OrderStoreSummary } from '../../types/orders'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

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
  PENDING: 'gold',
  CONFIRMED: 'blue',
  PROCESSING: 'purple',
  SHIPPING: 'cyan',
  DELIVERED: 'geekblue',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

function mergeStores(current: OrderStoreSummary[], items: AdminOrderListItem[]) {
  const storeMap = new Map(current.map((store) => [store.id, store]))
  items.forEach((item) => {
    if (item.store?.id) storeMap.set(item.store.id, item.store)
  })
  return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [knownStores, setKnownStores] = useState<OrderStoreSummary[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState<AdminOrderQuery>({ page: 1, limit: 20, order: 'DESC' })
  const [keyword, setKeyword] = useState('')
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const loadOrders = async (next: AdminOrderQuery = query) => {
    setLoading(true)
    try {
      const result = await getAdminOrders(next)
      const items = result.data ?? []
      setOrders(items)
      setKnownStores((current) => mergeStores(current, items))
      setTotal(Number(result.meta?.itemCount ?? 0))
    } catch {
      messageApi.error('Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.status, query.orderType, query.storeId, query.fromDate, query.toDate, query.sortBy, query.order])

  const applySearch = () => {
    const next = { ...query, page: 1, search: keyword.trim() || undefined }
    setQuery(next)
    void loadOrders(next)
  }

  const resetFilters = () => {
    setKeyword('')
    setDates(null)
    setQuery({ page: 1, limit: 20, order: 'DESC' })
  }

  const exportExcel = () => {
    if (!orders.length) {
      messageApi.warning('Không có dữ liệu để xuất')
      return
    }
    const rows = orders.map((item) => `
      <tr>
        <td>${item.orderNumber}</td>
        <td>${item.customer?.fullName ?? 'Khách lẻ'}</td>
        <td>${item.customer?.phone ?? ''}</td>
        <td>${statusLabels[item.status] ?? item.status}</td>
        <td>${item.orderType}</td>
        <td>${item.store?.name ?? ''}</td>
        <td>${item.totalAmount}</td>
        <td>${dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</td>
      </tr>`).join('')
    const html = `﻿<html><head><meta charset="utf-8"></head><body><table border="1"><tr><th>Mã đơn</th><th>Khách hàng</th><th>SĐT</th><th>Trạng thái</th><th>Loại</th><th>Cửa hàng</th><th>Tổng tiền</th><th>Ngày tạo</th></tr>${rows}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `glowup-orders-${dayjs().format('YYYYMMDD-HHmm')}.xls`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const columns: ColumnsType<AdminOrderListItem> = useMemo(() => [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      width: 150,
      render: (value: string, record) => (
        <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => navigate(`/admin/orders/${record.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: 'Khách hàng',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.customer?.fullName ?? 'Khách lẻ'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.customer?.phone ?? record.customer?.email ?? '—'}</Text>
        </div>
      ),
    },
    { title: 'Cửa hàng', dataIndex: ['store', 'name'], width: 170 },
    {
      title: 'Loại',
      dataIndex: 'orderType',
      width: 95,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (value: string) => <Tag color={statusColors[value]}>{statusLabels[value] ?? value}</Tag>,
    },
    {
      title: 'Thanh toán',
      width: 125,
      render: (_, record) => (
        <div>
          <div>{record.paymentMethod ?? '—'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.paymentStatus ?? '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      width: 145,
      align: 'right',
      sorter: true,
      render: (value: number) => <strong>{money.format(value)}</strong>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 145,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: '',
      width: 56,
      fixed: 'right',
      render: (_, record) => <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/admin/orders/${record.id}`)} />,
    },
  ], [navigate])

  const onTableChange = (pagination: TablePaginationConfig, _: unknown, sorter: any) => {
    setQuery((current) => ({
      ...current,
      page: pagination.current ?? 1,
      limit: pagination.pageSize ?? 20,
      sortBy: sorter?.field === 'totalAmount' ? 'totalAmount' : current.sortBy,
      order: sorter?.order === 'ascend' ? 'ASC' : sorter?.order === 'descend' ? 'DESC' : current.order,
    }))
  }

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">Quản lý đơn hàng</Title>
          <Text className="glowup-page-subtitle">Theo dõi, lọc và xử lý toàn bộ đơn hàng trong hệ thống GlowUp.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadOrders()}>Làm mới</Button>
          <Button icon={<DownloadOutlined />} onClick={exportExcel}>Xuất Excel</Button>
        </Space>
      </div>

      <div className="glowup-stat-strip">
        <div className="glowup-stat-card"><div className="glowup-stat-label">Đơn đang hiển thị</div><div className="glowup-stat-value">{total.toLocaleString('vi-VN')}</div><div className="glowup-stat-meta">Theo bộ lọc hiện tại</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Chờ xác nhận</div><div className="glowup-stat-value">{orders.filter((item) => item.status === 'PENDING').length}</div><div className="glowup-stat-meta">Cần xử lý sớm</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Đang giao</div><div className="glowup-stat-value">{orders.filter((item) => item.status === 'SHIPPING').length}</div><div className="glowup-stat-meta">Đơn trong trang hiện tại</div></div>
        <div className="glowup-stat-card"><div className="glowup-stat-label">Giá trị trang</div><div className="glowup-stat-value" style={{ fontSize: 20 }}>{money.format(orders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))}</div><div className="glowup-stat-meta">Tổng giá trị đang hiển thị</div></div>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap size={10} style={{ width: '100%' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã đơn..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 165 }}
            value={query.status}
            onChange={(status) => setQuery((current) => ({ ...current, page: 1, status }))}
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          />
          <Select
            allowClear
            placeholder="Loại đơn"
            style={{ width: 130 }}
            value={query.orderType}
            onChange={(orderType) => setQuery((current) => ({ ...current, page: 1, orderType }))}
            options={[{ value: 'ONLINE', label: 'Online' }, { value: 'POS', label: 'POS' }]}
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
          <RangePicker
            value={dates}
            format="DD/MM/YYYY"
            onChange={(range) => {
              const value = range as [Dayjs | null, Dayjs | null] | null
              setDates(value)
              setQuery((current) => ({
                ...current,
                page: 1,
                fromDate: value?.[0]?.format('YYYY-MM-DD'),
                toDate: value?.[1]?.format('YYYY-MM-DD'),
              }))
            }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={applySearch}>Tìm kiếm</Button>
          <Button onClick={resetFilters}>Xóa lọc</Button>
        </Space>
      </Card>

      <Card className="glowup-table-card" title={<Space><ShoppingCartOutlined /> Danh sách đơn hàng</Space>}>
        <Table<AdminOrderListItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          scroll={{ x: 1250 }}
          pagination={{ current: query.page ?? 1, pageSize: query.limit ?? 20, total, showSizeChanger: true, showTotal: (value) => `${value} đơn hàng` }}
          onChange={onTableChange}
        />
      </Card>
    </div>
  )
}
