import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Radio, Space, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { adjustInventory, receivePurchaseOrder } from '../../api/operationsApi'
import type { AdjustInventoryInput, ReceivePurchaseOrderInput } from '../../types/operations'

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
  const [mode, setMode] = useStateMode()
  const [receiveForm] = Form.useForm<ReceiveFormValue>()
  const [adjustForm] = Form.useForm<AdjustFormValue>()

  const submitReceive = async (value: ReceiveFormValue) => {
    const payload: ReceivePurchaseOrderInput = {
      purchaseOrderId: value.purchaseOrderId,
      note: value.note,
      items: value.items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantity: item.quantity,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate.format('YYYY-MM-DD'),
        manufactureDate: item.manufactureDate?.format('YYYY-MM-DD'),
      })),
    }
    try {
      await receivePurchaseOrder(payload)
      messageApi.success('Nhận hàng thành công')
      receiveForm.resetFields()
    } catch {
      messageApi.error('Không thể nhận hàng. Kiểm tra PO, số lượng và thông tin lô.')
    }
  }

  const submitAdjust = async (value: AdjustFormValue) => {
    const payload: AdjustInventoryInput = {
      storeId: value.storeId,
      productVariantId: value.productVariantId,
      quantity: value.quantity,
      reason: value.reason,
      batchId: value.batchId || undefined,
      batchNumber: value.batchNumber || undefined,
      expiryDate: value.expiryDate?.format('YYYY-MM-DD'),
      manufactureDate: value.manufactureDate?.format('YYYY-MM-DD'),
    }
    try {
      await adjustInventory(payload)
      messageApi.success('Điều chỉnh tồn kho thành công')
      adjustForm.resetFields()
    } catch {
      messageApi.error('Không thể điều chỉnh tồn kho. Kiểm tra số lượng, lô và phần hàng đang giữ chỗ.')
    }
  }

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div><Title level={2} className="glowup-page-title">Nhập / điều chỉnh kho</Title><Text className="glowup-page-subtitle">Nhận hàng theo PO hoặc điều chỉnh tồn kho theo đúng API Sprint 3 hiện có.</Text></div>
      </div>

      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid" style={{ marginBottom: 16 }}>
        <Radio.Button value="receive">Nhận hàng theo PO</Radio.Button>
        <Radio.Button value="adjust">Điều chỉnh tồn kho</Radio.Button>
      </Radio.Group>

      {mode === 'receive' ? (
        <Card title="Nhận hàng theo đơn đặt hàng">
          <Form form={receiveForm} layout="vertical" onFinish={submitReceive} initialValues={{ items: [{}] }}>
            <Form.Item name="purchaseOrderId" label="Purchase Order ID" rules={[{ required: true, message: 'Nhập purchaseOrderId' }]}>
              <Input placeholder="UUID của PO" />
            </Form.Item>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {fields.map(({ key, name }) => (
                    <Card key={key} size="small" title={`Dòng nhận hàng #${name + 1}`} extra={fields.length > 1 ? <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} /> : null}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 1.3fr 1.3fr', gap: 12 }}>
                        <Form.Item name={[name, 'purchaseOrderItemId']} label="PO Item ID" rules={[{ required: true }]}><Input placeholder="UUID dòng PO" /></Form.Item>
                        <Form.Item name={[name, 'quantity']} label="SL nhận" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name={[name, 'batchNumber']} label="Số lô" rules={[{ required: true }]}><Input placeholder="LOT2610A" /></Form.Item>
                        <Form.Item name={[name, 'expiryDate']} label="Hạn dùng" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name={[name, 'manufactureDate']} label="Ngày SX"><DatePicker style={{ width: '100%' }} /></Form.Item>
                      </div>
                    </Card>
                  ))}
                  <Button icon={<PlusOutlined />} onClick={() => add()} block>Thêm dòng nhận hàng</Button>
                </Space>
              )}
            </Form.List>

            <Form.Item name="note" label="Ghi chú kiểm hàng" style={{ marginTop: 16 }}><Input.TextArea rows={3} maxLength={500} placeholder="Hàng móp, thiếu, ghi chú chất lượng..." /></Form.Item>
            <Button type="primary" htmlType="submit">Xác nhận nhập kho</Button>
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
            <Button type="primary" htmlType="submit">Xác nhận điều chỉnh</Button>
          </Form>
        </Card>
      )}
    </div>
  )
}

function useStateMode() {
  const React = require('react') as typeof import('react')
  return React.useState<'receive' | 'adjust'>('receive')
}
