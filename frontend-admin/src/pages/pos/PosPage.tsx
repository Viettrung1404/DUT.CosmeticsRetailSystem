import { ReloadOutlined, SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { getCurrentPosSession, getPosInventory } from '../../api/operationsApi'
import type { InventoryItem, PosSession } from '../../types/operations'

const { Title, Text } = Typography

export default function PosPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [storeId, setStoreId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [session, setSession] = useState<PosSession | null>(null)
  const [rows, setRows] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  const loadWorkspace = async (nextPage = page, nextLimit = limit) => {
    const id = storeId.trim()
    if (!id) {
      messageApi.warning('Nhập Store UUID để mở khu vực POS')
      return
    }

    setLoading(true)
    try {
      const [currentSession, inventory] = await Promise.all([
        getCurrentPosSession(id),
        getPosInventory({
          storeId: id,
          page: nextPage,
          limit: nextLimit,
          order: 'DESC',
          search: keyword.trim() || undefined,
        }),
      ])
      setSession(currentSession)
      setRows(inventory.data ?? [])
      setTotal(Number(inventory.meta?.itemCount ?? 0))
      setPage(nextPage)
      setLimit(nextLimit)
    } catch {
      setSession(null)
      setRows([])
      setTotal(0)
      messageApi.error('Không thể tải POS. Kiểm tra Store UUID, quyền truy cập và backend Sprint 3.')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<InventoryItem> = useMemo(() => [
    {
      title: 'Sản phẩm',
      render: (_, row) => (
        <div>
          <strong>{row.variant.productName}</strong>
          <br />
          <Text type="secondary">{row.variant.optionLabel ?? 'Biến thể mặc định'}</Text>
        </div>
      ),
    },
    {
      title: 'SKU / Barcode',
      width: 190,
      render: (_, row) => (
        <div>
          <div>{row.variant.sku}</div>
          <Text type="secondary">{row.variant.barcode ?? 'Không có barcode'}</Text>
        </div>
      ),
    },
    { title: 'Tồn thực tế', dataIndex: 'quantity', width: 110, align: 'right' },
    { title: 'Giữ chỗ', dataIndex: 'reservedQuantity', width: 100, align: 'right' },
    {
      title: 'Khả dụng',
      dataIndex: 'availableQuantity',
      width: 110,
      align: 'right',
      render: (value: number) => <strong>{value}</strong>,
    },
    {
      title: 'Tình trạng',
      width: 125,
      render: (_, row) => row.availableQuantity <= 0
        ? <Tag color="red">Hết hàng</Tag>
        : row.isLowStock
          ? <Tag color="gold">Tồn thấp</Tag>
          : <Tag color="green">Có thể bán</Tag>,
    },
  ], [])

  const onTableChange = (pagination: TablePaginationConfig) => {
    void loadWorkspace(pagination.current ?? 1, pagination.pageSize ?? 20)
  }

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">POS tại cửa hàng</Title>
          <Text className="glowup-page-subtitle">Khu vực POS hiện tích hợp các API backend đã có: kiểm tra ca đang mở và tra cứu tồn kho tại cửa hàng.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadWorkspace()}>Làm mới</Button>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Store UUID"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            onPressEnter={() => void loadWorkspace(1, limit)}
            style={{ width: 310 }}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tên sản phẩm, SKU hoặc barcode"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => void loadWorkspace(1, limit)}
            style={{ width: 300 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => void loadWorkspace(1, limit)}>Mở POS / Tìm hàng</Button>
        </Space>
      </Card>

      {session ? (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Ca đang mở: ${session.sessionCode}`}
          description={`${session.store.name} • Thu ngân: ${session.cashier.fullName}`}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chưa xác nhận có ca POS đang mở"
          description="Bạn có thể mở/đóng ca tại trang Ca POS. Backend tạo đơn POS, thanh toán, voucher và khách hàng chưa đủ contract nên phần checkout được để lại cho bước sau."
        />
      )}

      <Card className="glowup-table-card" title={<Space><ShoppingCartOutlined /> Hàng có thể tra cứu tại POS</Space>}>
        <Table<InventoryItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ current: page, pageSize: limit, total, showSizeChanger: true, showTotal: (value) => `${value} sản phẩm/biến thể` }}
          onChange={onTableChange}
          locale={{ emptyText: 'Nhập Store UUID và tìm hàng để bắt đầu.' }}
        />
      </Card>
    </div>
  )
}
