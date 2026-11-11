import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, money, type Page, uuidRule } from '../../api/sprint4Api'

interface StocktakeLine { id: string; sku: string; productName: string; batchNumber: string | null; systemQuantity: number; actualQuantity: number; varianceQuantity: number; varianceReason: string | null }
interface Stocktake { id: string; stocktakeCode: string; storeId: string; storeName: string; status: string; totalVarianceValue: number; createdAt: string; items: StocktakeLine[] }
interface Count { productVariantId: string; batchId?: string; actualQuantity: number; varianceReason?: string; note?: string }
const { Title, Text } = Typography
export default function StocktakesPage() {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, status: undefined as string | undefined })
  const [rows, setRows] = useState<Stocktake[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Stocktake | null>(null)
  const [busy, setBusy] = useState(false)
  const [createForm] = Form.useForm()
  const [countForm] = Form.useForm<{ items: Count[] }>()
  const load = useCallback(async () => {
    setLoading(true)
    try { const page = await apiGet<Page<Stocktake>>('/admin/stocktakes', query); setRows(page.data ?? []); setTotal(page.meta?.itemCount ?? 0) }
    catch (error) { msg.error(errorText(error)) } finally { setLoading(false) }
  }, [msg, query])
  useEffect(() => { void load() }, [load])
  const detail = async (id: string) => {
    try { setSelected(await apiGet<Stocktake>(`/admin/stocktakes/${id}`)) }
    catch (error) { msg.error(errorText(error)) }
  }
  const create = async () => {
    try {
      const values = await createForm.validateFields()
      setBusy(true)
      await apiPost('/admin/stocktakes', values)
      setCreating(false); createForm.resetFields(); msg.success('Đã tạo phiếu kiểm kê'); await load()
    } catch (error) { if (!(error as { errorFields?: unknown }).errorFields) msg.error(errorText(error)) }
    finally { setBusy(false) }
  }
  const action = async (kind: 'complete' | 'cancel') => {
    if (!selected) return
    setBusy(true)
    try {
      await apiPut(`/admin/stocktakes/${selected.id}/${kind}`)
      msg.success('Đã cập nhật phiếu kiểm kê'); await load(); await detail(selected.id)
    } catch (error) { msg.error(errorText(error)) } finally { setBusy(false) }
  }
  const record = async () => {
    if (!selected) return
    try {
      const values = await countForm.validateFields()
      setBusy(true)
      await apiPost(`/admin/stocktakes/${selected.id}/items`, values)
      msg.success('Đã ghi số đếm thực tế'); await load(); await detail(selected.id)
      countForm.resetFields()
    } catch (error) { if (!(error as { errorFields?: unknown }).errorFields) msg.error(errorText(error)) }
    finally { setBusy(false) }
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Kiểm kê tồn kho</Title>
      <Text className="glowup-page-subtitle">Đếm hàng thực tế, ghi nhận chênh lệch và chốt cân bằng.</Text></div>
      <Space><Button onClick={() => void load()}>Làm mới</Button><Button type="primary" onClick={() => { createForm.resetFields(); setCreating(true) }}>Tạo kiểm kê</Button></Space></div>
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
      <Select placeholder="Trạng thái" allowClear style={{ width: 190 }} value={query.status}
        options={['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => ({ label: s, value: s }))}
        onChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))} />
    </Card>
    <Card className="glowup-table-card"><Table<Stocktake> rowKey="id" loading={loading} dataSource={rows} scroll={{ x: 900 }}
      pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
      onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
      columns={[
        { title: 'Mã phiếu', dataIndex: 'stocktakeCode', render: (v: string, row) => <Button type="link" onClick={() => void detail(row.id)}>{v}</Button> },
        { title: 'Cửa hàng', dataIndex: 'storeName' }, { title: 'Ngày tạo', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
        { title: 'Chênh lệch giá trị', dataIndex: 'totalVarianceValue', render: (v: number) => money(v) },
        { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'COMPLETED' ? 'green' : 'blue'}>{v}</Tag> },
        { title: 'Thao tác', render: (_, row) => <Button onClick={() => void detail(row.id)}>Chi tiết</Button> },
      ]} /></Card>
    <Modal title="Tạo phiếu kiểm kê" open={creating} onCancel={() => setCreating(false)} onOk={() => void create()}
      okText="Tạo phiếu" confirmLoading={busy}>
      <Form form={createForm} layout="vertical">
        <Form.Item label="UUID cửa hàng kiểm kê" name="storeId" rules={[{ required: true }, { pattern: uuidRule, message: 'Nhập UUID cửa hàng hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={selected ? `Kiểm kê ${selected.stocktakeCode}` : 'Chi tiết'} open={Boolean(selected)}
      onCancel={() => setSelected(null)} footer={null} width={940}>
      {selected && <Space direction="vertical" style={{ width: '100%' }} size={14}>
        <Text><strong>{selected.storeName}</strong> · <Tag>{selected.status}</Tag></Text>
        <Table<StocktakeLine> rowKey="id" size="small" pagination={false} scroll={{ x: 700 }} dataSource={selected.items}
          columns={[
            { title: 'SKU', dataIndex: 'sku' }, { title: 'Sản phẩm', dataIndex: 'productName' },
            { title: 'Lô', dataIndex: 'batchNumber', render: (v: string | null) => v ?? '—' },
            { title: 'Tồn sổ', dataIndex: 'systemQuantity' }, { title: 'Thực đếm', dataIndex: 'actualQuantity' },
            { title: 'Chênh lệch', dataIndex: 'varianceQuantity', render: (v: number) => <Text type={v === 0 ? undefined : 'danger'}>{v}</Text> },
          ]} />
        {['DRAFT', 'IN_PROGRESS'].includes(selected.status) && <>
          <Text strong>Ghi số lượng kiểm kê</Text>
          <Form form={countForm} layout="vertical">
            <Form.List name="items" initialValue={[{}]}>
              {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name }) => <Space key={key} align="start" wrap>
                  <Form.Item name={[name, 'productVariantId']} rules={[{ required: true }, { pattern: uuidRule, message: 'UUID biến thể không hợp lệ' }]}>
                    <Input placeholder="UUID biến thể" style={{ width: 230 }} /></Form.Item>
                  <Form.Item name={[name, 'batchId']} rules={[{ pattern: uuidRule, message: 'UUID lô không hợp lệ' }]}>
                    <Input placeholder="UUID lô (nếu có)" style={{ width: 220 }} /></Form.Item>
                  <Form.Item name={[name, 'actualQuantity']} rules={[{ required: true, message: 'Nhập số đếm' }]}>
                    <InputNumber min={0} precision={0} placeholder="Số đếm" /></Form.Item>
                  <Form.Item name={[name, 'varianceReason']}>
                    <Select allowClear placeholder="Lý do" style={{ width: 150 }}
                      options={['DAMAGED', 'EXPIRED', 'THEFT', 'MISPLACED'].map((s) => ({ value: s, label: s }))} /></Form.Item>
                  <Button disabled={fields.length === 1} onClick={() => remove(name)}>Xóa</Button>
                </Space>)}
                <Button onClick={() => add({})}>+ Thêm dòng kiểm kê</Button>
              </Space>}
            </Form.List>
          </Form>
          <Space wrap>
            <Button type="primary" loading={busy} onClick={() => void record()}>Lưu số đếm</Button>
            <Popconfirm title="Chốt kiểm kê sẽ điều chỉnh tồn kho. Bạn chắc chắn?" onConfirm={() => void action('complete')}>
              <Button loading={busy}>Chốt kiểm kê</Button>
            </Popconfirm>
            <Popconfirm title="Hủy phiếu kiểm kê?" onConfirm={() => void action('cancel')}><Button danger loading={busy}>Hủy phiếu</Button></Popconfirm>
          </Space>
          <Text type="secondary">Nếu có chênh lệch, Backend yêu cầu người chốt khác người lập.</Text>
        </>}
      </Space>}
    </Modal>
  </div>
}
