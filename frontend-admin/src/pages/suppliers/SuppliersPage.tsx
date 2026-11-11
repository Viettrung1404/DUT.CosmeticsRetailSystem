import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, type Page } from '../../api/sprint4Api'

interface Supplier { id: string; name: string; contactPerson: string | null; email: string | null; phone: string | null; address: string | null; taxCode: string | null; paymentTerms: string | null; rating: number | null; isActive: boolean }
interface SupplierForm { name: string; contactPerson?: string; email?: string; phone?: string; address?: string; taxCode?: string; paymentTerms?: string; isActive?: boolean }
interface Balance { totalReceived: number; totalPaid: number; balance: number; receiptsWithoutInvoice: number }
const { Title, Text } = Typography
export default function SuppliersPage() {
  const [msg, holder] = message.useMessage()
  const [query, setQuery] = useState({ page: 1, limit: 20, search: undefined as string | undefined, isActive: undefined as boolean | undefined })
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Supplier | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm<SupplierForm>()
  const [balance, setBalance] = useState<{ supplier: Supplier; data: Balance } | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { const page = await apiGet<Page<Supplier>>('/admin/suppliers', query); setRows(page.data ?? []); setTotal(page.meta?.itemCount ?? 0) }
    catch (error) { msg.error(errorText(error)) } finally { setLoading(false) }
  }, [msg, query])
  useEffect(() => { void load() }, [load])
  const open = (row: Supplier | 'new') => {
    setSelected(row)
    form.resetFields()
    if (row !== 'new') form.setFieldsValue({ name: row.name, contactPerson: row.contactPerson ?? '', email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '', taxCode: row.taxCode ?? '', paymentTerms: row.paymentTerms ?? '', isActive: row.isActive })
    else form.setFieldsValue({ isActive: true })
  }
  const save = async () => {
    try {
      const values = await form.validateFields()
      setBusy(true)
      if (selected === 'new') await apiPost('/admin/suppliers', values)
      else if (selected) await apiPut(`/admin/suppliers/${selected.id}`, values)
      msg.success('Đã lưu nhà cung cấp')
      setSelected(null); await load()
    } catch (error) { if (!(error as { errorFields?: unknown }).errorFields) msg.error(errorText(error)) }
    finally { setBusy(false) }
  }
  const viewBalance = async (supplier: Supplier) => {
    try {
      const data = await apiGet<Balance>(`/admin/suppliers/${supplier.id}/balance`)
      setBalance({ supplier, data })
    } catch (error) { msg.error(errorText(error)) }
  }
  const changeActive = async (supplier: Supplier) => {
    try {
      await apiPut(`/admin/suppliers/${supplier.id}`, { isActive: !supplier.isActive })
      msg.success('Đã cập nhật trạng thái hợp tác'); await load()
    } catch (error) { msg.error(errorText(error)) }
  }
  const rate = async (supplier: Supplier, rating: number) => {
    try { await apiPut(`/admin/suppliers/${supplier.id}/rating`, { rating }); msg.success('Đã đánh giá nhà cung cấp'); await load() }
    catch (error) { msg.error(errorText(error)) }
  }
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Nhà cung cấp</Title>
      <Text className="glowup-page-subtitle">Danh bạ đối tác, tình trạng hợp tác, đánh giá và công nợ.</Text></div>
      <Space><Button onClick={() => void load()}>Làm mới</Button><Button type="primary" onClick={() => open('new')}>Thêm nhà cung cấp</Button></Space></div>
    <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}><Space wrap>
      <Input.Search placeholder="Tên, mã số thuế, số điện thoại" style={{ width: 300 }} value={search} onChange={(e) => setSearch(e.target.value)}
        onSearch={() => setQuery((q) => ({ ...q, page: 1, search: search.trim() || undefined }))} />
      <Select allowClear placeholder="Trạng thái" style={{ width: 170 }} value={query.isActive}
        options={[{ label: 'Đang hợp tác', value: true }, { label: 'Ngừng hợp tác', value: false }]}
        onChange={(isActive) => setQuery((q) => ({ ...q, page: 1, isActive }))} />
      <Button onClick={() => { setSearch(''); setQuery({ page: 1, limit: 20, search: undefined, isActive: undefined }) }}>Xóa lọc</Button>
    </Space></Card>
    <Card className="glowup-table-card"><Table<Supplier> rowKey="id" dataSource={rows} loading={loading} scroll={{ x: 1050 }}
      pagination={{ current: query.page, pageSize: query.limit, total, showSizeChanger: true }}
      onChange={(p: TablePaginationConfig) => setQuery((q) => ({ ...q, page: p.current ?? 1, limit: p.pageSize ?? 20 }))}
      columns={[
        { title: 'Nhà cung cấp', dataIndex: 'name', render: (v: string, s) => <div><strong>{v}</strong><div><Text type="secondary">{s.taxCode || '—'}</Text></div></div> },
        { title: 'Liên hệ', render: (_, s) => <div>{s.contactPerson || '—'}<div>{s.phone || s.email || ''}</div></div> },
        { title: 'Đánh giá', dataIndex: 'rating', render: (v: number | null, s) => <Select size="small" placeholder="Chấm điểm" style={{ width: 110 }} value={v ?? undefined}
          options={[1,2,3,4,5].map((x) => ({ label: `${x} / 5`, value: x }))} onChange={(rating) => void rate(s, rating)} /> },
        { title: 'Trạng thái', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hợp tác' : 'Ngừng'}</Tag> },
        { title: 'Thao tác', render: (_, s) => <Space wrap>
          <Button size="small" onClick={() => open(s)}>Sửa</Button>
          <Button size="small" onClick={() => void viewBalance(s)}>Công nợ</Button>
          <Popconfirm title={s.isActive ? 'Ngừng hợp tác với nhà cung cấp?' : 'Khôi phục hợp tác?'} onConfirm={() => void changeActive(s)}>
            <Button size="small" danger={s.isActive}>{s.isActive ? 'Ngừng' : 'Khôi phục'}</Button>
          </Popconfirm>
        </Space> },
      ]} /></Card>
    <Modal title={selected === 'new' ? 'Thêm nhà cung cấp' : 'Sửa nhà cung cấp'} open={selected !== null}
      onCancel={() => setSelected(null)} onOk={() => void save()} confirmLoading={busy} okText="Lưu" width={650}>
      <Form form={form} layout="vertical">
        <Form.Item label="Tên nhà cung cấp" name="name" rules={[{ required: true, min: 2, max: 200 }]}><Input maxLength={200} /></Form.Item>
        <Form.Item label="Người liên hệ" name="contactPerson"><Input maxLength={100} /></Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Số điện thoại" name="phone" rules={[{ pattern: /^([0-9+ ]{8,20})?$/, message: 'Số điện thoại không hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Mã số thuế" name="taxCode" rules={[{ pattern: /^([0-9-]{10,14})?$/, message: 'Mã số thuế không hợp lệ' }]}><Input /></Form.Item>
        <Form.Item label="Địa chỉ" name="address"><Input.TextArea maxLength={500} /></Form.Item>
        <Form.Item label="Điều khoản thanh toán" name="paymentTerms"><Input.TextArea maxLength={500} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={balance ? `Công nợ: ${balance.supplier.name}` : 'Công nợ'} open={Boolean(balance)}
      onCancel={() => setBalance(null)} footer={<Button onClick={() => setBalance(null)}>Đóng</Button>}>
      {balance && <Space direction="vertical">
        <Text>Đã nhận: {Number(balance.data.totalReceived).toLocaleString('vi-VN')} đ</Text>
        <Text>Đã thanh toán: {Number(balance.data.totalPaid).toLocaleString('vi-VN')} đ</Text>
        <Text strong>Dư nợ: {Number(balance.data.balance).toLocaleString('vi-VN')} đ</Text>
        {balance.data.receiptsWithoutInvoice > 0 && <Text type="warning">{balance.data.receiptsWithoutInvoice} phiếu nhận chưa có hóa đơn</Text>}
      </Space>}
    </Modal>
  </div>
}
