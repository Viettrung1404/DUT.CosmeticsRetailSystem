import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, money, type Page, uuidRule } from '../../api/sprint4Api'
interface PoLine { id: string; sku: string; productName: string; quantityOrdered: number; quantityReceived: number; unitCost: number; totalCost: number }
interface Receipt { id: string; receiptCode: string; totalCost: number; receivedDate: string }
interface PO { id: string; poNumber: string; supplierName: string; storeName: string; supplierId: string; storeId: string; status: string; totalAmount: number; expectedDate: string | null; createdAt: string; items: PoLine[]; receipts: Receipt[] }
interface CreateForm { supplierId: string; storeId: string; note?: string; expectedDate?: string; items: { productVariantId: string; quantity: number; unitCost: number }[] }
const { Title, Text } = Typography
export default function PurchaseOrdersPage() {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, search: undefined as string | undefined, status: undefined as string | undefined })
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<PO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<PO | null>(null)
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const load = useCallback(async () => {
    setLoading(true)
    try { const p = await apiGet<Page<PO>>('/admin/purchase-orders', query); setRows(p.data ?? []); setTotal(p.meta?.itemCount ?? 0) }
    catch (error) { msg.error(errorText(error)) } finally { setLoading(false) }
  }, [msg, query])
  useEffect(() => { void load() }, [load])
  const open = async (id: string) => {
    try { setDetail(await apiGet<PO>(`/admin/purchase-orders/${id}`)) }
    catch (error) { msg.error(errorText(error)) }
  }
  const create = async () => {
    try {
      const values = await form.validateFields()
      setBusy(true)
      await apiPost('/admin/purchase-orders', values)
      msg.success('Đã tạo PO nháp'); setCreating(false); form.resetFields(); await load()
    } catch (error) { if (!(error as { errorFields?: unknown }).errorFields) msg.error(errorText(error)) }
    finally { setBusy(false) }
  }
  const action = async (path: string) => {
    if (!detail) return
    setBusy(true)
    try {
      await apiPut(`/admin/purchase-orders/${detail.id}/${path}`)
      msg.success('Đã cập nhật trạng thái PO'); await load(); await open(detail.id)
    } catch (error) { msg.error(errorText(error)) } finally { setBusy(false) }
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Đơn mua hàng (PO)</Title>
      <Text className="glowup-page-subtitle">Tạo PO, duyệt gửi, ghi nhận xác nhận từ nhà cung cấp và theo dõi nhận hàng.</Text></div>
      <Space><Button onClick={() => void load()}>Làm mới</Button><Button type="primary" onClick={() => { form.resetFields(); setCreating(true) }}>Tạo PO</Button></Space></div>
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}><Space wrap>
      <Input.Search value={search} onChange={(e) => setSearch(e.target.value)} onSearch={() => setQuery((q) => ({ ...q, page: 1, search: search.trim() || undefined }))}
        placeholder="Số PO hoặc tên NCC" style={{ width: 270 }} />
      <Select allowClear placeholder="Trạng thái" value={query.status} style={{ width: 185 }}
        options={['DRAFT','SENT','CONFIRMED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED'].map((s) => ({ value: s, label: s }))}
        onChange={(status) => setQuery((q) => ({ ...q, page: 1, status }))} />
    </Space></Card>
    <Card className="glowup-table-card"><Table<PO> rowKey="id" loading={loading} dataSource={rows} scroll={{ x: 900 }}
      pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
      onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
      columns={[{title:'Số PO',dataIndex:'poNumber',render:(v:string,r)=><Button type="link" onClick={()=>void open(r.id)}>{v}</Button>},
        {title:'Nhà cung cấp',dataIndex:'supplierName'},{title:'Kho nhận',dataIndex:'storeName'},
        {title:'Tổng tiền',dataIndex:'totalAmount',render:(v:number)=>money(v)},
        {title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag color={v==='RECEIVED'?'green':'blue'}>{v}</Tag>},
        {title:'Ngày tạo',dataIndex:'createdAt',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')}]} /></Card>
    <Modal title="Tạo đơn đặt hàng nhà cung cấp" open={creating} onCancel={() => setCreating(false)}
      onOk={() => void create()} confirmLoading={busy} okText="Lưu PO nháp" width={770}>
      <Form form={form} layout="vertical">
        <Form.Item label="UUID nhà cung cấp" name="supplierId" rules={[{ required: true }, { pattern: uuidRule, message: 'UUID không hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="UUID kho tổng nhận hàng" name="storeId" rules={[{ required: true }, { pattern: uuidRule, message: 'UUID không hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Ngày dự kiến (YYYY-MM-DD)" name="expectedDate" rules={[{ pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Ngày không hợp lệ' }]}><Input placeholder="2026-11-25" /></Form.Item>
        <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500} /></Form.Item>
        <Form.List name="items" initialValue={[{}]}>{(fields,{add,remove})=><Space direction="vertical" style={{ width:'100%' }}>
          {fields.map(({key,name})=><Space key={key} align="start" wrap>
            <Form.Item name={[name,'productVariantId']} rules={[{required:true},{pattern:uuidRule,message:'UUID không hợp lệ'}]}>
              <Input placeholder="UUID biến thể" style={{ width:275 }}/></Form.Item>
            <Form.Item name={[name,'quantity']} rules={[{required:true,message:'Nhập số lượng'}]}>
              <InputNumber placeholder="Số lượng" precision={0} min={1}/></Form.Item>
            <Form.Item name={[name,'unitCost']} rules={[{required:true,message:'Nhập giá nhập'}]}>
              <InputNumber placeholder="Giá nhập" min={0} precision={2}/></Form.Item>
            <Button disabled={fields.length===1} onClick={()=>remove(name)}>Xóa</Button>
          </Space>)}
          <Button onClick={()=>add({})}>+ Thêm dòng sản phẩm</Button>
        </Space>}</Form.List>
      </Form>
    </Modal>
    <Modal title={detail ? `PO ${detail.poNumber}` : 'Chi tiết'} open={Boolean(detail)} onCancel={() => setDetail(null)} footer={null} width={850}>
      {detail && <Space direction="vertical" style={{ width:'100%' }} size={12}>
        <Text><strong>{detail.supplierName}</strong> → {detail.storeName} · <Tag>{detail.status}</Tag></Text>
        <Table<PoLine> rowKey="id" size="small" pagination={false} dataSource={detail.items}
          columns={[{title:'SKU',dataIndex:'sku'},{title:'Sản phẩm',dataIndex:'productName'},
            {title:'Đặt',dataIndex:'quantityOrdered'},{title:'Đã nhận',dataIndex:'quantityReceived'},
            {title:'Đơn giá',dataIndex:'unitCost',render:(v:number)=>money(v)}]} />
        <Text strong>Phiếu nhập liên quan</Text>
        <Table<Receipt> rowKey="id" size="small" pagination={false} dataSource={detail.receipts ?? []}
          columns={[{title:'Mã nhập',dataIndex:'receiptCode'},{title:'Giá trị',dataIndex:'totalCost',render:(v:number)=>money(v)},
            {title:'Ngày nhận',dataIndex:'receivedDate',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')}]} />
        <Space wrap>
          {detail.status==='DRAFT' && <Popconfirm title="Duyệt và gửi PO? Người duyệt phải khác người lập." onConfirm={()=>void action('approve-send')}>
            <Button type="primary" disabled={busy}>Duyệt & gửi</Button></Popconfirm>}
          {detail.status==='SENT' && <Popconfirm title="Xác nhận NCC đã nhận và chấp nhận PO?" onConfirm={()=>void action('confirm')}>
            <Button type="primary" disabled={busy}>NCC xác nhận</Button></Popconfirm>}
          {['DRAFT','SENT','CONFIRMED'].includes(detail.status) && <Popconfirm title="Hủy PO chưa nhận hàng?" onConfirm={()=>void action('cancel')}>
            <Button danger disabled={busy}>Hủy PO</Button></Popconfirm>}
          {['CONFIRMED','PARTIALLY_RECEIVED'].includes(detail.status) && <Text type="secondary">Nhập hàng tại trang Nhập / điều chỉnh kho (Sprint 3).</Text>}
        </Space>
      </Space>}
    </Modal>
  </div>
}
