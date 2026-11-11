import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, type Page, uuidRule } from '../../api/sprint4Api'

interface Line { id: string; productVariantId: string; sku: string; productName: string; quantityRequested: number; quantityApproved: number | null; quantityShipped: number; quantityReceived: number }
interface Transfer { id: string; transferCode: string; fromStoreId: string; fromStoreName: string; toStoreId: string; toStoreName: string; status: string; note: string | null; createdAt: string; items: Line[] }
interface TransferForm { fromStoreId: string; toStoreId: string; note?: string; items: { productVariantId: string; quantity: number }[] }
const statuses = ['DRAFT', 'REQUESTED', 'APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELLED']
const { Title, Text } = Typography
export default function TransfersPage() {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, status: undefined as string | undefined })
  const [records, setRecords] = useState<Transfer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Transfer | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm<TransferForm>()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<Page<Transfer>>('/admin/transfers', query)
      setRecords(data.data ?? []); setTotal(data.meta?.itemCount ?? 0)
    } catch (error) { msg.error(errorText(error)) }
    finally { setLoading(false) }
  }, [msg, query])
  useEffect(() => { void load() }, [load])
  const detail = async (id: string) => {
    try { setSelected(await apiGet<Transfer>(`/admin/transfers/${id}`)) }
    catch (error) { msg.error(errorText(error)) }
  }
  const action = async (item: Transfer, path: string, body?: object) => {
    setBusy(true)
    try {
      await apiPut(`/admin/transfers/${item.id}/${path}`, body)
      msg.success('Đã cập nhật phiếu chuyển kho')
      await load(); await detail(item.id)
    } catch (error) { msg.error(errorText(error)) }
    finally { setBusy(false) }
  }
  const create = async () => {
    try {
      const values = await form.validateFields()
      if (values.fromStoreId === values.toStoreId) { msg.error('Kho xuất và kho nhận phải khác nhau'); return }
      setBusy(true)
      await apiPost('/admin/transfers', values)
      msg.success('Đã tạo phiếu nháp')
      setCreating(false); form.resetFields(); await load()
    } catch (error) {
      if (!(error as { errorFields?: unknown }).errorFields) msg.error(errorText(error))
    } finally { setBusy(false) }
  }
  const [approveValues, setApproveValues] = useState<Record<string, number>>({})
  const [receiveValues, setReceiveValues] = useState<Record<string, number>>({})
  const [lossReasons, setLossReasons] = useState<Record<string, string>>({})
  const approve = () => selected && void action(selected, 'approve', { items: selected.items.map((line) => ({
    itemId: line.id, quantityApproved: approveValues[line.id] ?? line.quantityRequested,
  })) })
  const receive = () => {
    if (!selected) return
    const items = selected.items.map((line) => ({
      itemId: line.id,
      quantityReceived: receiveValues[line.id] ?? line.quantityShipped,
      lossReason: lossReasons[line.id]?.trim() || undefined,
    }))
    if (items.some((line) => line.quantityReceived < 0 || !Number.isInteger(line.quantityReceived))) { msg.error('Số nhận phải là số nguyên không âm'); return }
    if (selected.items.some((line, i) => items[i].quantityReceived < line.quantityShipped && !items[i].lossReason)) { msg.error('Cần ghi lý do nếu nhận thiếu'); return }
    void action(selected, 'receive', { items })
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Chuyển kho</Title>
      <Text className="glowup-page-subtitle">Tạo yêu cầu, duyệt, xuất và nhận hàng giữa các cửa hàng.</Text></div>
      <Space><Button onClick={() => void load()}>Làm mới</Button><Button type="primary" onClick={() => { form.resetFields(); setCreating(true) }}>Tạo phiếu chuyển</Button></Space></div>
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
      <Select allowClear placeholder="Trạng thái" style={{ width: 200 }} value={query.status}
        options={statuses.map((s) => ({ label: s, value: s }))}
        onChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))} />
    </Card>
    <Card className="glowup-table-card" title="Danh sách phiếu chuyển kho">
      <Table<Transfer> rowKey="id" dataSource={records} loading={loading} scroll={{ x: 980 }}
        pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
        onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'transferCode', render: (v: string, row) => <Button type="link" onClick={() => void detail(row.id)}>{v}</Button> },
          { title: 'Kho xuất', dataIndex: 'fromStoreName' }, { title: 'Kho nhận', dataIndex: 'toStoreName' },
          { title: 'Ngày tạo', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'RECEIVED' ? 'green' : v === 'CANCELLED' ? 'red' : 'blue'}>{v}</Tag> },
          { title: 'Chi tiết', render: (_, row) => <Button onClick={() => void detail(row.id)}>Xem phiếu</Button> },
        ]} />
    </Card>
    <Modal title="Tạo phiếu chuyển kho" open={creating} onCancel={() => setCreating(false)}
      onOk={() => void create()} confirmLoading={busy} okText="Tạo phiếu nháp" width={730}>
      <Form form={form} layout="vertical">
        <Form.Item label="UUID kho tổng xuất" name="fromStoreId" rules={[{ required: true }, { pattern: uuidRule, message: 'Nhập UUID hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="UUID cửa hàng nhận" name="toStoreId" rules={[{ required: true }, { pattern: uuidRule, message: 'Nhập UUID hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500} /></Form.Item>
        <Form.List name="items" initialValue={[{}]}>
          {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Danh sách sản phẩm</Text>
            {fields.map(({ key, name }) => <Space key={key} align="start" wrap>
              <Form.Item name={[name, 'productVariantId']} rules={[{ required: true }, { pattern: uuidRule, message: 'UUID biến thể không hợp lệ' }]}>
                <Input placeholder="UUID biến thể" style={{ width: 330 }} /></Form.Item>
              <Form.Item name={[name, 'quantity']} rules={[{ required: true, message: 'Nhập số lượng' }]}>
                <InputNumber min={1} precision={0} placeholder="Số lượng" /></Form.Item>
              <Button disabled={fields.length === 1} onClick={() => remove(name)}>Xóa</Button>
            </Space>)}
            <Button onClick={() => add({})}>+ Thêm sản phẩm</Button>
          </Space>}
        </Form.List>
      </Form>
    </Modal>
    <Modal title={selected ? `Phiếu ${selected.transferCode}` : 'Chi tiết'} open={Boolean(selected)}
      onCancel={() => setSelected(null)} footer={null} width={920}>
      {selected && <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Text>{selected.fromStoreName} → {selected.toStoreName} · <Tag>{selected.status}</Tag></Text>
        <Table<Line> size="small" rowKey="id" pagination={false} scroll={{ x: 750 }} dataSource={selected.items}
          columns={[
            { title: 'SKU', dataIndex: 'sku' }, { title: 'Sản phẩm', dataIndex: 'productName' },
            { title: 'Yêu cầu', dataIndex: 'quantityRequested' },
            { title: 'Duyệt', render: (_, line) => selected.status === 'REQUESTED'
              ? <InputNumber min={0} max={line.quantityRequested} precision={0}
                  value={approveValues[line.id] ?? line.quantityRequested}
                  onChange={(n) => setApproveValues((v) => ({ ...v, [line.id]: n ?? 0 }))} />
              : (line.quantityApproved ?? '—') },
            { title: 'Đã xuất', dataIndex: 'quantityShipped' },
            { title: 'Đã nhận', render: (_, line) => selected.status === 'SHIPPED'
              ? <InputNumber min={0} max={line.quantityShipped} precision={0}
                  value={receiveValues[line.id] ?? line.quantityShipped}
                  onChange={(n) => setReceiveValues((v) => ({ ...v, [line.id]: n ?? 0 }))} />
              : line.quantityReceived },
            { title: 'Hao hụt', render: (_, line) => selected.status === 'SHIPPED'
              ? <Input placeholder="Lý do nhận thiếu" maxLength={500} style={{ width: 160 }}
                  value={lossReasons[line.id] ?? ''} onChange={(e) => setLossReasons((v) => ({ ...v, [line.id]: e.target.value }))} /> : '—' },
          ]} />
        <Space wrap>
          {selected.status === 'DRAFT' && <Popconfirm title="Gửi phiếu yêu cầu?" onConfirm={() => void action(selected, 'request')}><Button type="primary" disabled={busy}>Gửi yêu cầu</Button></Popconfirm>}
          {selected.status === 'REQUESTED' && <Popconfirm title="Duyệt số lượng trên phiếu?" onConfirm={approve}><Button type="primary" disabled={busy}>Duyệt</Button></Popconfirm>}
          {selected.status === 'APPROVED' && <Popconfirm title="Xuất kho và trừ tồn theo FEFO?" onConfirm={() => void action(selected, 'ship')}><Button type="primary" disabled={busy}>Xuất kho</Button></Popconfirm>}
          {selected.status === 'SHIPPED' && <Popconfirm title="Xác nhận nhận hàng và nhập kho?" onConfirm={receive}><Button type="primary" disabled={busy}>Nhận hàng</Button></Popconfirm>}
          {['DRAFT', 'REQUESTED', 'APPROVED'].includes(selected.status) && <Popconfirm title="Hủy phiếu?" onConfirm={() => void action(selected, 'cancel')}><Button danger disabled={busy}>Hủy phiếu</Button></Popconfirm>}
        </Space>
      </Space>}
    </Modal>
  </div>
}
