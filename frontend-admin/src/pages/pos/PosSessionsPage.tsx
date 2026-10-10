import { CheckCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { getAdminPosSessions, reconcilePosSession } from '../../api/operationsApi'
import type { PosSession, PosSessionQuery, PosSessionStatus } from '../../types/operations'

const { RangePicker } = DatePicker
const { Title, Text } = Typography
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

const statusLabels: Record<PosSessionStatus, string> = {
  OPEN: 'Đang mở',
  CLOSED: 'Đã đóng',
  RECONCILED: 'Đã chốt',
}

const statusColors: Record<PosSessionStatus, string> = {
  OPEN: 'green',
  CLOSED: 'gold',
  RECONCILED: 'blue',
}

export default function PosSessionsPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<PosSession[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState<PosSessionQuery>({ page: 1, limit: 20, order: 'DESC' })
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [storeId, setStoreId] = useState('')
  const [reconcileTarget, setReconcileTarget] = useState<PosSession | null>(null)
  const [note, setNote] = useState('')

  const load = async (next: PosSessionQuery = query) => {
    setLoading(true)
    try {
      const result = await getAdminPosSessions(next)
      setSessions(result.data ?? [])
      setTotal(Number(result.meta?.itemCount ?? 0))
    } catch {
      messageApi.error('Không thể tải lịch sử ca POS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.status, query.fromDate, query.toDate, query.storeId])

  const columns: ColumnsType<PosSession> = useMemo(() => [
    { title: 'Mã ca', dataIndex: 'sessionCode', width: 185, render: (value: string) => <strong>{value}</strong> },
    { title: 'Cửa hàng', width: 180, render: (_, row) => <div><strong>{row.store.name}</strong><br /><Text type="secondary">{row.store.code}</Text></div> },
    { title: 'Thu ngân', width: 150, render: (_, row) => row.cashier.fullName },
    { title: 'Mở ca', dataIndex: 'openedAt', width: 145, render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm') },
    { title: 'Đóng ca', dataIndex: 'closedAt', width: 145, render: (value: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Tiền đầu ca', dataIndex: 'openingCash', align: 'right', width: 135, render: (value: number) => money.format(value) },
    { title: 'Tiền hệ thống', dataIndex: 'systemCash', align: 'right', width: 140, render: (value: number) => money.format(value) },
    { title: 'Chênh lệch', dataIndex: 'difference', align: 'right', width: 135, render: (value: number | null) => value == null ? '—' : <Text type={value === 0 ? 'success' : 'danger'}>{money.format(value)}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (value: PosSessionStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    {
      title: '', width: 95, fixed: 'right', render: (_, row) => row.status === 'CLOSED' ? (
        <Button size="small" icon={<CheckCircleOutlined />} onClick={() => { setReconcileTarget(row); setNote('') }}>Chốt ca</Button>
      ) : null,
    },
  ], [])

  const applyStore = () => setQuery((current) => ({ ...current, page: 1, storeId: storeId.trim() || undefined }))

  const handleReconcile = async () => {
    if (!reconcileTarget) return
    try {
      await reconcilePosSession(reconcileTarget.id, note.trim() || undefined)
      messageApi.success('Chốt ca thành công')
      setReconcileTarget(null)
      await load()
    } catch {
      messageApi.error('Không thể chốt ca. Kiểm tra quyền hoặc phần giải trình chênh lệch.')
    }
  }

  const onTableChange = (pagination: TablePaginationConfig) => {
    setQuery((current) => ({ ...current, page: pagination.current ?? 1, limit: pagination.pageSize ?? 20 }))
  }

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">Ca bán hàng POS</Title>
          <Text className="glowup-page-subtitle">Theo dõi ca thu ngân, tiền đầu ca, tiền hệ thống và chênh lệch cuối ca.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>Làm mới</Button>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="Store UUID" value={storeId} onChange={(e) => setStoreId(e.target.value)} onPressEnter={applyStore} style={{ width: 260 }} />
          <Select allowClear placeholder="Trạng thái" style={{ width: 150 }} value={query.status} onChange={(status) => setQuery((c) => ({ ...c, page: 1, status }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
          <RangePicker value={dates} format="DD/MM/YYYY" onChange={(range) => {
            const value = range as [Dayjs | null, Dayjs | null] | null
            setDates(value)
            setQuery((c) => ({ ...c, page: 1, fromDate: value?.[0]?.format('YYYY-MM-DD'), toDate: value?.[1]?.format('YYYY-MM-DD') }))
          }} />
          <Button type="primary" icon={<SearchOutlined />} onClick={applyStore}>Lọc</Button>
          <Button onClick={() => { setStoreId(''); setDates(null); setQuery({ page: 1, limit: 20, order: 'DESC' }) }}>Xóa lọc</Button>
        </Space>
      </Card>

      <Card className="glowup-table-card" title="Lịch sử ca POS">
        <Table<PosSession> rowKey="id" loading={loading} columns={columns} dataSource={sessions} scroll={{ x: 1450 }} pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true, showTotal: (value) => `${value} ca` }} onChange={onTableChange} />
      </Card>

      <Modal title={`Chốt ca ${reconcileTarget?.sessionCode ?? ''}`} open={Boolean(reconcileTarget)} onCancel={() => setReconcileTarget(null)} onOk={() => void handleReconcile()} okText="Chốt ca">
        <Text>Ghi chú của quản lý/kế toán:</Text>
        <Input.TextArea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập giải trình nếu ca có chênh lệch..." style={{ marginTop: 8 }} />
      </Modal>
    </div>
  )
}
