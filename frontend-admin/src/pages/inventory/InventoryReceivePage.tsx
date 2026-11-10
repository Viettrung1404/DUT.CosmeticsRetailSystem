import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Radio, Select, Space, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { adjustInventory, receivePurchaseOrder } from '../../api/operationsApi'
import type { AdjustInventoryInput, ReceivePurchaseOrderInput } from '../../types/operations'
import { getPurchaseOrderDetail, getReceivablePurchaseOrders } from '../../api/purchaseOrdersApi'
import type { PurchaseOrder } from '../../api/purchaseOrdersApi'

const { Title, Text } = Typography

type ReceiveFormValue = {
  purchaseOrderId: string
  note?: string
  items: Array<{
    purchaseOrderItemId: string
    quantity: number
    batchNumber: string
    expiryDate: dayjs.Dayjs
    manufactureDate?: dayjs.Dayjs
  }>
}

type AdjustFormValue = {
  storeId: string
  productVariantId: string
  quantity: number
  reason: string
  batchId?: string
  batchNumber?: string
  expiryDate?: dayjs.Dayjs
  manufactureDate?: dayjs.Dayjs
}

export default function InventoryReceivePage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [mode, setMode] = useState<'receive' | 'adjust'>('receive')
  const [submitting, setSubmitting] = useState(false)
  const [receiveForm] = Form.useForm<ReceiveFormValue>()
  const [adjustForm] = Form.useForm<AdjustFormValue>()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [poLoading, setPoLoading] = useState(false)
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null)
  const [poSearch, setPoSearch] = useState('')

  const loadPurchaseOrders = async (search = '') => {
    setPoLoading(true)
    try { setPurchaseOrders(await getReceivablePurchaseOrders(search)) }
    catch { messageApi.error('Không thể tải PO đã xác nhận. Kiểm tra quyền PO_RECEIVE.') }
    finally { setPoLoading(false) }
  }

  useEffect(() => {
    void loadPurchaseOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectPurchaseOrder = async (id: string) => {
    setPoLoading(true)
    try {
      const po = await getPurchaseOrderDetail(id)
      setSelectedPo(po)
      receiveForm.setFieldsValue({
        purchaseOrderId: po.id,
        items: po.items.filter(item => item.quantityOrdered > item.quantityReceived)
          .map(item => ({ purchaseOrderItemId: item.id, quantity: item.quantityOrdered - item.quantityReceived, batchNumber: '', expiryDate: undefined as unknown as dayjs.Dayjs })),
      })
    } catch { messageApi.error('Không thể tải chi tiết PO.') }
    finally { setPoLoading(false) }
  }

  const submitReceive = async (value: ReceiveFormValue) => {
    const payload: ReceivePurchaseOrderInput = {
      purchaseOrderId: value.purchaseOrderId,
      note: value.note?.trim() || undefined,
      items: value.items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantity: item.quantity,
        batchNumber: item.batchNumber.trim(),
        expiryDate: item.expiryDate.format('YYYY-MM-DD'),
        manufactureDate: item.manufactureDate?.format('YYYY-MM-DD'),
      })),
    }
    try {
      setSubmitting(true)
      await receivePurchaseOrder(payload)
      messageApi.success('Nhận hàng thành công')
      receiveForm.resetFields()
      setSelectedPo(null)
      await loadPurchaseOrders(poSearch)
    } catch {
      messageApi.error('Không thể nhận hàng. Kiểm tra PO, số lượng và thông tin lô.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitAdjust = async (value: AdjustFormValue) => {
    if (value.quantity === 0) {
      messageApi.warning('Số lượng điều chỉnh phải khác 0')
      return
    }
    const payload: AdjustInventoryInput = {
      storeId: value.storeId.trim(),
      productVariantId: value.productVariantId.trim(),
      quantity: value.quantity,
      reason: value.reason.trim(),
      batchId: value.batchId?.trim() || undefined,
      batchNumber: value.batchNumber?.trim() || undefined,
      expiryDate: value.expiryDate?.format('YYYY-MM-DD'),
      manufactureDate: value.manufactureDate?.format('YYYY-MM-DD'),
    }
    try {
      setSubmitting(true)
      await adjustInventory(payload)
      messageApi.success('Điều chỉnh tồn kho thành công')
      adjustForm.resetFields()
    } catch {
      messageApi.error('Không thể điều chỉnh tồn kho. Kiểm tra số lượng, lô và phần hàng đang giữ chỗ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">Nhập / điều chỉnh kho</Title>
          <Text className="glowup-page-subtitle">Nhận hàng theo PO hoặc điều chỉnh tồn kho theo đúng API Sprint 3 hiện có.</Text>
        </div>
      </div>

      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid" style={{ marginBottom: 16 }}>
        <Radio.Button value="receive">Nhận hàng theo PO</Radio.Button>
        <Radio.Button value="adjust">Điều chỉnh tồn kho</Radio.Button>
      </Radio.Group>

      {mode === 'receive' ? (
        <Card title="Nhận hàng theo đơn đặt hàng">
          <Form form={receiveForm} layout="vertical" onFinish={submitReceive} initialValues={{ items: [{}] }}>
            <Space wrap style={{ marginBottom: 12 }}>
              <Input placeholder="Tìm theo mã PO hoặc tên NCC" value={poSearch} onChange={e => setPoSearch(e.target.value)}
                onPressEnter={() => void loadPurchaseOrders(poSearch)} style={{ width: 260 }} />
              <Button loading={poLoading} onClick={() => void loadPurchaseOrders(poSearch)}>Tìm PO</Button>
            </Space>
            <Form.Item name="purchaseOrderId" label="Chọn đơn đặt hàng NCC" rules={[{ required: true, message: 'Hãy chọn PO đã xác nhận' }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn đơn có hàng cần nhận"
                loading={poLoading} onChange={value => { void selectPurchaseOrder(value) }}
                options={purchaseOrders.map(po => ({ value: po.id, label: po.poNumber + ' · ' + po.supplierName + ' · ' + po.status }))} />
            </Form.Item>
            {selectedPo && <Alert type="info" showIcon style={{ marginBottom: 14 }}
              message={'PO ' + selectedPo.poNumber + ' · ' + selectedPo.supplierName}
              description={'Kho: ' + selectedPo.storeName + '. Các dòng dưới đây được điền sẵn theo số lượng chưa nhận.'} />}

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {fields.map(({ key, name }) => (
                    <Card key={key} size="small" title={`Dòng nhận hàng #${name + 1}`} extra={fields.length > 1 ? <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} /> : null}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 1.3fr 1.3fr', gap: 12 }}>
                        <Form.Item name={[name, 'purchaseOrderItemId']} label="PO Item ID" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Chọn dòng trong PO" options={selectedPo?.items.map(item => ({
                          value: item.id, label: item.productName + ' (' + item.sku + '), còn ' + (item.quantityOrdered - item.quantityReceived),
                        })) ?? []} /></Form.Item>
                        <Form.Item name={[name, 'quantity']} label="SL nhận" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name={[name, 'batchNumber']} label="Số lô" rules={[{ required: true }]}><Input placeholder="LOT2610A" /></Form.Item>
                        <Form.Item name={[name, 'expiryDate']} label="Hạn dùng" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name={[name, 'manufactureDate']} label="Ngày SX"><DatePicker style={{ width: '100%' }} /></Form.Item>
                      </div>
                    </Card>
                  ))}
                  <Button icon={<PlusOutlined />} onClick={() => add()} block>Thêm dòng cùng PO (nếu chia nhiều lô)</Button>
                </Space>
              )}
            </Form.List>

            <Form.Item name="note" label="Ghi chú kiểm hàng" style={{ marginTop: 16 }}><Input.TextArea rows={3} maxLength={500} placeholder="Hàng móp, thiếu, ghi chú chất lượng..." /></Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>Xác nhận nhập kho</Button>
          </Form>
        </Card>
      ) : (
        <Card title="Điều chỉnh tồn kho">
          <Form form={adjustForm} layout="vertical" onFinish={submitAdjust}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="storeId" label="Store ID" rules={[{ required: true }]}><Input placeholder="UUID cửa hàng / kho" /></Form.Item>
              <Form.Item name="productVariantId" label="Product Variant ID" rules={[{ required: true }]}><Input placeholder="UUID biến thể" /></Form.Item>
              <Form.Item name="quantity" label="Số lượng điều chỉnh" extra="Âm = xuất, dương = nhập" rules={[{ required: true }]}><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="batchId" label="Batch ID (nếu xuất đúng lô)"><Input placeholder="Bỏ trống để backend tự FEFO" /></Form.Item>
              <Form.Item name="batchNumber" label="Số lô mới (nếu nhập)"><Input /></Form.Item>
              <Form.Item name="expiryDate" label="Hạn dùng lô mới"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="manufactureDate" label="Ngày sản xuất"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </div>
            <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Phải nhập lý do điều chỉnh' }]}><Input.TextArea rows={3} maxLength={500} placeholder="Ví dụ: Hủy hàng hết hạn, mất mát, hàng mẫu, giao bù..." /></Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>Xác nhận điều chỉnh</Button>
          </Form>
        </Card>
      )}
    </div>
  )
}
