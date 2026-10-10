import {
  CheckCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Modal,
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
import {
  closePosSession,
  getAdminPosSessions,
  getCurrentPosSession,
  openPosSession,
  reconcilePosSession,
} from '../../api/operationsApi'
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

  const [currentStoreId, setCurrentStoreId] = useState('')
  const [currentSession, setCurrentSession] = useState<PosSession | null>(null)
  const [currentLoading, setCurrentLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [openingCash, setOpeningCash] = useState<number | null>(null)
  const [countedCash, setCountedCash] = useState<number | null>(null)
  const [sessionNote, setSessionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

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
    { title: 'Tiền đếm', dataIndex: 'countedCash', align: 'right', width: 135, render: (value: number | null) => value == null ? '—' : money.format(value) },
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
      setActionLoading(true)
      await reconcilePosSession(reconcileTarget.id, note.trim() || undefined)
      messageApi.success('Chốt ca thành công')
      setReconcileTarget(null)
      await load()
    } catch {
      messageApi.error('Không thể chốt ca. Kiểm tra quyền hoặc phần giải trình chênh lệch.')
    } finally {
      setActionLoading(false)
    }
  }

  const checkCurrentSession = async () => {
    const id = currentStoreId.trim()
    if (!id) {
      messageApi.warning('Nhập Store UUID để kiểm tra ca đang mở')
      return
    }
    setCurrentLoading(true)
    try {
      const result = await getCurrentPosSession(id)
      setCurrentSession(result)
      if (!result) messageApi.info('Cửa hàng hiện chưa có ca POS đang mở')
    } catch {
      setCurrentSession(null)
      messageApi.error('Không thể kiểm tra ca hiện tại. Kiểm tra Store UUID và phạm vi dữ liệu.')
    } finally {
      setCurrentLoading(false)
    }
  }

  const handleOpen = async () => {
    if (!currentStoreId.trim() || openingCash == null || openingCash < 0) {
      messageApi.warning('Nhập Store UUID và tiền đầu ca hợp lệ')
      return
    }
    setActionLoading(true)
    try {
      const result = await openPosSession({
        storeId: currentStoreId.trim(),
        openingCash,
        note: sessionNote.trim() || undefined,
      })
      setCurrentSession(result)
      setOpenModal(false)
      setOpeningCash(null)
      setSessionNote('')
      messageApi.success('Mở ca thành công')
      await load()
    } catch {
      messageApi.error('Không thể mở ca. Có thể cửa hàng/thu ngân đang có ca chưa đóng hoặc bạn không có quyền.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async () => {
    if (!currentSession || countedCash == null || countedCash < 0) {
      messageApi.warning('Nhập số tiền thực tế đã đếm trong két')
      return
    }
    setActionLoading(true)
    try {
      const result = await closePosSession(currentSession.id, {
        countedCash,
        note: sessionNote.trim() || undefined,
      })
      setCurrentSession(null)
      setCloseModal(false)
      setCountedCash(null)
      setSessionNote('')
      messageApi.success(`Đóng ca thành công. Chênh lệch: ${money.format(result.difference ?? 0)}`)
      await load()
    } catch {
      messageApi.error('Không thể đóng ca. Kiểm tra quyền và trạng thái ca hiện tại.')
    } finally {
      setActionLoading(false)
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
          <Text className="glowup-page-subtitle">Mở/đóng ca đang trực, theo dõi lịch sử và chốt đối soát ca POS.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>Làm mới</Button>
      </div>

      <Card title="Ca đang trực" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Store UUID"
            value={currentStoreId}
            onChange={(e) => setCurrentStoreId(e.target.value)}
            onPressEnter={() => void checkCurrentSession()}
            style={{ width: 320 }}
          />
          <Button loading={currentLoading} onClick={() => void checkCurrentSession()}>Kiểm tra ca</Button>
          {!currentSession ? (
            <Button type="primary" icon={<LoginOutlined />} disabled={!currentStoreId.trim()} onClick={() => { setOpeningCash(null); setSessionNote(''); setOpenModal(true) }}>Mở ca</Button>
          ) : (
            <Button danger icon={<LogoutOutlined />} onClick={() => { setCountedCash(null); setSessionNote(''); setCloseModal(true) }}>Đóng ca</Button>
          )}
        </Space>

        {currentSession ? (
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
            <Descriptions.Item label="Mã ca">{currentSession.sessionCode}</Descriptions.Item>
            <Descriptions.Item label="Cửa hàng">{currentSession.store.name} ({currentSession.store.code})</Descriptions.Item>
            <Descriptions.Item label="Thu ngân">{currentSession.cashier.fullName}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag color="green">Đang mở</Tag></Descriptions.Item>
            <Descriptions.Item label="Tiền đầu ca">{money.format(currentSession.openingCash)}</Descriptions.Item>
            <Descriptions.Item label="Tiền hệ thống">{money.format(currentSession.systemCash)}</Descriptions.Item>
            <Descriptions.Item label="Mở lúc">{dayjs(currentSession.openedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{currentSession.note || '—'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert type="info" showIcon message="Nhập Store UUID và bấm Kiểm tra ca. Nếu chưa có ca đang mở, bạn có thể mở ca mới." />
        )}
      </Card>

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
        <Table<PosSession> rowKey="id" loading={loading} columns={columns} dataSource={sessions} scroll={{ x: 1580 }} pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true, showTotal: (value) => `${value} ca` }} onChange={onTableChange} />
      </Card>

      <Modal title="Mở ca POS" open={openModal} onCancel={() => setOpenModal(false)} onOk={() => void handleOpen()} confirmLoading={actionLoading} okText="Mở ca">
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text>Cửa hàng: <strong>{currentStoreId || '—'}</strong></Text>
          <div>
            <Text>Tiền mặt đầu ca</Text>
            <InputNumber<number> min={0} precision={0} value={openingCash} onChange={setOpeningCash} addonAfter="VND" style={{ width: '100%', marginTop: 6 }} />
          </div>
          <div>
            <Text>Ghi chú</Text>
            <Input.TextArea rows={3} maxLength={500} value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} style={{ marginTop: 6 }} />
          </div>
        </Space>
      </Modal>

      <Modal title={`Đóng ca ${currentSession?.sessionCode ?? ''}`} open={closeModal} onCancel={() => setCloseModal(false)} onOk={() => void handleClose()} confirmLoading={actionLoading} okText="Đóng ca" okButtonProps={{ danger: true }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {currentSession && <Alert showIcon type="info" message={`Tiền dự kiến trong két: ${money.format(currentSession.openingCash + currentSession.systemCash)}`} />}
          <div>
            <Text>Tiền mặt đếm được</Text>
            <InputNumber<number> min={0} precision={0} value={countedCash} onChange={setCountedCash} addonAfter="VND" style={{ width: '100%', marginTop: 6 }} />
          </div>
          <div>
            <Text>Giải trình / ghi chú</Text>
            <Input.TextArea rows={3} maxLength={500} value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} style={{ marginTop: 6 }} />
          </div>
        </Space>
      </Modal>

      <Modal title={`Chốt ca ${reconcileTarget?.sessionCode ?? ''}`} open={Boolean(reconcileTarget)} onCancel={() => setReconcileTarget(null)} onOk={() => void handleReconcile()} confirmLoading={actionLoading} okText="Chốt ca">
        <Text>Ghi chú của quản lý/kế toán:</Text>
        <Input.TextArea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhập giải trình nếu ca có chênh lệch..." style={{ marginTop: 8 }} />
      </Modal>
    </div>
  )
}
