import { Button, Card, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut, errorText, type Page } from '../../api/sprint4Api'

interface Batch { id: string; storeName: string; productName: string; sku: string; batchNumber: string; quantity: number; expiryDate: string; manufactureDate: string | null; isActive: boolean }
const { Title, Text } = Typography
export default function BatchesPage() {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, search: undefined as string | undefined, expired: undefined as boolean | undefined, isActive: undefined as boolean | undefined, expiringWithinDays: undefined as number | undefined })
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Batch[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<Batch | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await apiGet<Page<Batch>>('/admin/batches', query); setItems(data.data ?? []); setTotal(data.meta?.itemCount ?? 0) }
    catch (error) { msg.error(errorText(error)) } finally { setLoading(false) }
  }, [msg, query])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (!target) return
    if (target.isActive && !reason.trim()) { msg.error('Phải nhập lý do khóa lô'); return }
    setBusy(true)
    try {
      await apiPut(`/admin/batches/${target.id}/${target.isActive ? 'lock' : 'unlock'}`, { reason: reason.trim() || undefined })
      msg.success(target.isActive ? 'Đã khóa lô' : 'Đã mở khóa lô')
      setTarget(null); setReason(''); await load()
    } catch (error) { msg.error(errorText(error)) } finally { setBusy(false) }
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Lô hàng & hạn sử dụng</Title>
      <Text className="glowup-page-subtitle">Theo dõi lô sắp hết hạn, lô đã hết hạn và khóa lô không đảm bảo chất lượng.</Text></div>
      <Button onClick={() => void load()}>Làm mới</Button></div>
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}><Space wrap>
      <Input.Search placeholder="Số lô, SKU hoặc sản phẩm" value={search} onChange={(e) => setSearch(e.target.value)}
        onSearch={() => setQuery((q) => ({ ...q, page: 1, search: search.trim() || undefined }))} style={{ width: 300 }} />
      <Select allowClear placeholder="Hạn sử dụng" style={{ width: 180 }} value={query.expiringWithinDays}
        onChange={(value) => setQuery((q) => ({ ...q, page: 1, expiringWithinDays: value, expired: undefined }))}
        options={[30, 60, 90].map((days) => ({ label: `Hết hạn trong ${days} ngày`, value: days }))} />
      <Select allowClear placeholder="Đã hết hạn" style={{ width: 155 }} value={query.expired}
        onChange={(expired) => setQuery((q) => ({ ...q, page: 1, expired, expiringWithinDays: undefined }))}
        options={[{ label: 'Đã hết hạn', value: true }, { label: 'Chưa hết hạn', value: false }]} />
      <Select allowClear placeholder="Trạng thái lô" style={{ width: 160 }} value={query.isActive}
        onChange={(isActive) => setQuery((q) => ({ ...q, page: 1, isActive }))}
        options={[{ label: 'Đang dùng', value: true }, { label: 'Đã khóa', value: false }]} />
      <Button onClick={() => { setSearch(''); setQuery({ page: 1, limit: 20, search: undefined, expired: undefined, isActive: undefined, expiringWithinDays: undefined }) }}>Xóa lọc</Button>
    </Space></Card>
    <Card className="glowup-table-card"><Table<Batch> rowKey="id" dataSource={items} loading={loading} scroll={{ x: 1050 }}
      pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
      onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
      columns={[
        { title: 'Sản phẩm', render: (_, row) => <div><strong>{row.productName}</strong><div><Text type="secondary">{row.sku}</Text></div></div> },
        { title: 'Cửa hàng', dataIndex: 'storeName' }, { title: 'Số lô', dataIndex: 'batchNumber' },
        { title: 'Số lượng', dataIndex: 'quantity', align: 'right' },
        { title: 'Hạn dùng', dataIndex: 'expiryDate', render: (v: string) => {
          const days = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000)
          return <Space><Text>{new Date(v).toLocaleDateString('vi-VN')}</Text>{days < 0 ? <Tag color="red">Hết hạn</Tag> : days <= 30 ? <Tag color="orange">Sắp hết hạn</Tag> : null}</Space>
        } },
        { title: 'Trạng thái', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Đang dùng' : 'Đã khóa'}</Tag> },
        { title: 'Thao tác', render: (_, row) => <Button danger={row.isActive} onClick={() => { setTarget(row); setReason('') }}>{row.isActive ? 'Khóa lô' : 'Mở khóa'}</Button> },
      ]} /></Card>
    <Modal title={target?.isActive ? 'Khóa lô hàng' : 'Mở khóa lô hàng'} open={Boolean(target)}
      onCancel={() => setTarget(null)} footer={null}>
      <Text>{target?.batchNumber} — {target?.productName}</Text>
      <Input.TextArea style={{ marginTop: 12 }} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
        maxLength={500} placeholder="Ghi rõ lý do thay đổi trạng thái lô" />
      <Popconfirm title="Xác nhận thay đổi trạng thái lô?" onConfirm={() => void save()}>
        <Button type="primary" danger={target?.isActive} loading={busy} style={{ marginTop: 12 }}>Xác nhận</Button>
      </Popconfirm>
    </Modal>
  </div>
}
