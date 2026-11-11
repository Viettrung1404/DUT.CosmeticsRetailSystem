import { Alert, Button, Card, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut, errorText, money, type Page, uuidRule } from '../../api/sprint4Api'
interface Payment { id: string; orderNumber: string; storeName: string; channel: string; paymentMethod: string; amount: number; status: string; transactionId: string | null; paidAt: string | null; reconciledAt: string | null }
interface Group { storeId: string; storeName: string; channel: 'POS' | 'ONLINE'; paymentMethod: string; count: number; amount: number; reconciledCount: number; unreconciledSessions: number; canMark: boolean }
const { Title, Text } = Typography
export default function FinancePage({ mode }: { mode: 'payments' | 'reconciliation' }) {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, from: undefined as string | undefined, to: undefined as string | undefined, paymentMethod: undefined as string | undefined, status: undefined as string | undefined })
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [storeId, setStoreId] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (mode === 'payments') {
        const page = await apiGet<Page<Payment>>('/admin/payments', query)
        setPayments(page.data ?? []); setTotal(page.meta?.itemCount ?? 0)
      } else {
        const data = await apiGet<{ date: string; groups: Group[] }>('/admin/reconciliation', { date, storeId: storeId.trim() || undefined })
        setGroups(data.groups ?? [])
      }
    } catch (error) { msg.error(errorText(error)) } finally { setLoading(false) }
  }, [mode, query, date, storeId, msg])
  useEffect(() => { void load() }, [load])
  const reconcile = async (row: Group) => {
    setBusy(true)
    try {
      await apiPut('/admin/reconciliation/mark', { date, storeId: row.storeId, channel: row.channel, paymentMethod: row.paymentMethod })
      msg.success('Đã đánh dấu đối soát nhóm giao dịch'); await load()
    } catch (error) { msg.error(errorText(error)) } finally { setBusy(false) }
  }
  const exportCsv = () => {
    const values = [['Mã đơn','Cửa hàng','Kênh','Phương thức','Số tiền','Trạng thái','Ngày thu','Ngày đối soát'],
      ...payments.map((p) => [p.orderNumber, p.storeName, p.channel, p.paymentMethod, String(p.amount), p.status, p.paidAt ?? '', p.reconciledAt ?? ''])]
    const csv = '\ufeff' + values.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.href = url; link.download = `glowup-payments-page-${query.page}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">{mode === 'payments' ? 'Lịch sử thanh toán' : 'Đối soát thanh toán'}</Title>
      <Text className="glowup-page-subtitle">{mode === 'payments' ? 'Giao dịch theo cửa hàng và phạm vi quyền của tài khoản.' : 'Đánh dấu đối soát theo cửa hàng, kênh và phương thức.'}</Text></div>
      <Space><Button onClick={() => void load()}>Làm mới</Button>{mode === 'payments' && <Button onClick={exportCsv}>Xuất CSV trang này</Button>}</Space>
    </div>
    {mode === 'payments' ? <>
      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}><Space wrap>
        <DatePicker.RangePicker value={query.from && query.to ? [dayjs(query.from), dayjs(query.to)] : null}
          onChange={(range) => setQuery((q) => ({ ...q, page: 1, from: range?.[0]?.format('YYYY-MM-DD'), to: range?.[1]?.format('YYYY-MM-DD') }))} />
        <Select allowClear placeholder="Phương thức" style={{ width: 170 }} value={query.paymentMethod}
          options={['CASH','CARD','TRANSFER','COD','SEPAY'].map((x) => ({ value: x, label: x }))}
          onChange={(paymentMethod) => setQuery((q) => ({ ...q, page: 1, paymentMethod }))} />
        <Select allowClear placeholder="Trạng thái" style={{ width: 170 }} value={query.status}
          options={['PENDING','COMPLETED','FAILED','REFUNDED'].map((x) => ({ value: x, label: x }))}
          onChange={(status) => setQuery((q) => ({ ...q, page: 1, status }))} />
      </Space></Card>
      <Card className="glowup-table-card"><Table<Payment> rowKey="id" loading={loading} dataSource={payments} scroll={{ x: 1100 }}
        pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
        onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
        columns={[{ title:'Đơn',dataIndex:'orderNumber' },{title:'Cửa hàng',dataIndex:'storeName'},
          {title:'Kênh',dataIndex:'channel'},{title:'Phương thức',dataIndex:'paymentMethod'},
          {title:'Số tiền',dataIndex:'amount',render:(v:number)=>money(v)},{title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag>{v}</Tag>},
          {title:'Ngày thu',dataIndex:'paidAt',render:(v:string|null)=>v?dayjs(v).format('DD/MM/YYYY HH:mm'):'—'},
          {title:'Đối soát',dataIndex:'reconciledAt',render:(v:string|null)=>v?<Tag color="green">Đã đối soát</Tag>:'Chưa'}]} /></Card>
      <Text type="secondary">File CSV chỉ chứa các dòng trên trang đang hiển thị, không phải toàn bộ lịch sử.</Text>
    </> : <>
      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}><Space wrap>
        <DatePicker value={dayjs(date)} onChange={(v) => v && setDate(v.format('YYYY-MM-DD'))} />
        <Input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="UUID cửa hàng (tùy chọn)" style={{ width: 300 }}
          status={storeId && !uuidRule.test(storeId) ? 'error' : undefined} />
      </Space></Card>
      <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Nhóm POS chỉ được đánh dấu sau khi các ca liên quan đã chốt đối soát." />
      <Card className="glowup-table-card"><Table<Group> rowKey={(r) => `${r.storeId}-${r.channel}-${r.paymentMethod}`} loading={loading}
        dataSource={groups} pagination={false} scroll={{ x: 1000 }}
        columns={[{title:'Cửa hàng',dataIndex:'storeName'},{title:'Kênh',dataIndex:'channel'},
          {title:'Phương thức',dataIndex:'paymentMethod'},{title:'Số giao dịch',dataIndex:'count'},
          {title:'Tổng tiền',dataIndex:'amount',render:(v:number)=>money(v)},
          {title:'Đã đối soát',render:(_,r)=>`${r.reconciledCount}/${r.count}`},
          {title:'Ca chưa chốt',dataIndex:'unreconciledSessions'},
          {title:'Thao tác',render:(_,r)=><Popconfirm title="Đánh dấu cả nhóm giao dịch đã đối soát?" onConfirm={()=>void reconcile(r)}>
            <Button size="small" type="primary" disabled={!r.canMark || busy}>Đánh dấu</Button>
          </Popconfirm>}]} /></Card>
    </>}
  </div>
}
