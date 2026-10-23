import { DownloadOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdminInventory } from '../../api/operationsApi'
import type { InventoryItem, InventoryQuery, StockStatus } from '../../types/operations'

const { Title, Text } = Typography

const stockLabels: Record<StockStatus, string> = {
  LOW_STOCK: 'Tồn thấp',
  OUT_OF_STOCK: 'Hết hàng',
  IN_STOCK: 'Còn hàng',
}

export default function InventoryPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState<InventoryQuery>({ page: 1, limit: 20, order: 'DESC' })
  const [keyword, setKeyword] = useState('')
  const [storeId, setStoreId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const requestId = useRef(0)

  const load = async (next: InventoryQuery = query) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    try {
      const result = await getAdminInventory(next)
      if (currentRequest !== requestId.current) return
      setRows(result.data ?? [])
      setTotal(Number(result.meta?.itemCount ?? 0))
    } catch {
      if (currentRequest === requestId.current) messageApi.error('Không thể tải dữ liệu tồn kho')
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    void load(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.status, query.storeId, query.categoryId, query.brandId, query.search])

  const applyFilters = () => {
    const next: InventoryQuery = {
      ...query,
      page: 1,
      search: keyword.trim() || undefined,
      storeId: storeId.trim() || undefined,
      categoryId: categoryId.trim() || undefined,
      brandId: brandId.trim() || undefined,
    }
    setQuery(next)
  }

  const exportExcel = () => {
    if (!rows.length) {
      messageApi.warning('Không có dữ liệu để xuất')
      return
    }
    // Xuất CSV UTF-8 an toàn cho Excel; không đưa dữ liệu nhập vào HTML.
    const csvCell = (value: string | number | null | undefined) => {
      let cell = String(value ?? '')
      if (/^[\\s]*[=+@-]/.test(cell)) cell = "'" + cell
      return '"' + cell.replace(/"/g, '""') + '"'
    }
    const headers = ['Cửa hàng', 'Sản phẩm', 'Biến thể', 'SKU', 'Barcode', 'Tồn thực tế', 'Giữ chỗ', 'Khả dụng', 'Tồn tối thiểu', 'Hạn gần nhất']
    const lines = rows.map((item) => [
      item.store.name, item.variant.productName, item.variant.optionLabel,
      item.variant.sku, item.variant.barcode, item.quantity, item.reservedQuantity,
      item.availableQuantity, item.minQuantity, item.nearestExpiryDate,
    ].map(csvCell).join(','))
    const csv = '\uFEFF' + [headers.map(csvCell).join(','), ...lines].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `glowup-inventory-${dayjs().format('YYYYMMDD-HHmm')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    messageApi.info('Đã xuất dữ liệu của trang hiện tại. Các trang khác chưa được bao gồm.')
  }

  const columns: ColumnsType<InventoryItem> = useMemo(() => [
    { title: 'Cửa hàng', width: 165, render: (_, row) => <div><strong>{row.store.name}</strong><br /><Text type="secondary">{row.store.code}</Text></div> },
    { title: 'Sản phẩm', width: 220, render: (_, row) => <div><strong>{row.variant.productName}</strong><br /><Text type="secondary">{row.variant.optionLabel ?? '—'}</Text></div> },
    { title: 'SKU', width: 150, render: (_, row) => <div>{row.variant.sku}<br /><Text type="secondary">{row.variant.barcode ?? 'Không barcode'}</Text></div> },
    { title: 'Thực tế', dataIndex: 'quantity', align: 'right', width: 95 },
    { title: 'Giữ chỗ', dataIndex: 'reservedQuantity', align: 'right', width: 95 },
    { title: 'Khả dụng', dataIndex: 'availableQuantity', align: 'right', width: 100, render: (value: number) => <strong>{value}</strong> },
    { title: 'Tối thiểu', dataIndex: 'minQuantity', align: 'right', width: 95 },
    {
      title: 'Cảnh báo', width: 135, render: (_, row) => row.availableQuantity <= 0 ? <Tag color="red">Hết hàng</Tag> : row.isLowStock ? <Tag color="gold" icon={<WarningOutlined />}>Tồn thấp</Tag> : <Tag color="green">Ổn định</Tag>,
    },
    { title: 'Hạn gần nhất', dataIndex: 'nearestExpiryDate', width: 125, render: (value: string | null, row) => value ? <Tag color={row.hasNearExpiry ? 'orange' : 'default'}>{dayjs(value).format('DD/MM/YYYY')}</Tag> : '—' },
    { title: 'Cập nhật', dataIndex: 'updatedAt', width: 140, render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
  ], [])

  const onTableChange = (pagination: TablePaginationConfig) => setQuery((c) => ({ ...c, page: pagination.current ?? 1, limit: pagination.pageSize ?? 20 }))

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div><Title level={2} className="glowup-page-title">Quản lý tồn kho</Title><Text className="glowup-page-subtitle">Theo dõi tồn thực tế, hàng giữ chỗ, tồn khả dụng và cảnh báo hạn dùng.</Text></div>
        <Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>Làm mới</Button><Button icon={<DownloadOutlined />} onClick={exportExcel}>Xuất Excel</Button></Space>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} allowClear placeholder="Tên SP, SKU hoặc barcode" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={applyFilters} style={{ width: 240 }} />
          <Input placeholder="Store UUID" value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: 230 }} />
          <Input placeholder="Category UUID" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: 230 }} />
          <Input placeholder="Brand UUID" value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ width: 230 }} />
          <Select allowClear placeholder="Tình trạng" style={{ width: 150 }} value={query.status} onChange={(status) => setQuery((c) => ({ ...c, page: 1, status }))} options={Object.entries(stockLabels).map(([value, label]) => ({ value, label }))} />
          <Button type="primary" icon={<SearchOutlined />} onClick={applyFilters}>Lọc</Button>
          <Button onClick={() => { setKeyword(''); setStoreId(''); setCategoryId(''); setBrandId(''); setQuery({ page: 1, limit: 20, order: 'DESC' }) }}>Xóa lọc</Button>
        </Space>
      </Card>

      <Card className="glowup-table-card" title="Danh sách tồn kho">
        <Table<InventoryItem> rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1400 }} pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true, showTotal: (value) => `${value} dòng tồn kho` }} onChange={onTableChange} />
      </Card>
    </div>
  )
}
