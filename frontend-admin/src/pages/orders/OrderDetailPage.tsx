import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Image,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  Input,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  cancelAdminOrder,
  confirmAdminOrder,
  getAdminOrderDetail,
  updateAdminOrderStatus,
} from '../../api/ordersApi'
import type { AdminOrderDetail, OrderStatus } from '../../types/orders'

const { Title, Text } = Typography
const { TextArea } = Input

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const statusColors: Record<string, string> = {
  PENDING: 'gold', CONFIRMED: 'blue', PROCESSING: 'purple', SHIPPING: 'cyan', DELIVERED: 'geekblue', COMPLETED: 'green', CANCELLED: 'red',
}

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

function shippingAddressText(address: Record<string, unknown> | null) {
  if (!address) return 'Không có thông tin giao hàng'
  const values = ['recipientName', 'phone', 'addressLine', 'ward', 'district', 'province']
    .map((key) => address[key])
    .filter(Boolean)
  return values.join(' · ') || Object.values(address).filter((value) => typeof value === 'string').join(' · ')
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [note, setNote] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [nextStatus, setNextStatus] = useState<OrderStatus | undefined>()

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      setOrder(await getAdminOrderDetail(id))
    } catch {
      messageApi.error('Không thể tải chi tiết đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [id])

  const runAction = async (action: () => Promise<AdminOrderDetail>, success: string) => {
    setActionLoading(true)
    try {
      const result = await action()
      setOrder(result)
      setConfirmOpen(false)
      setCancelOpen(false)
      setStatusOpen(false)
      setNote('')
      setCancelReason('')
      setNextStatus(undefined)
      messageApi.success(success)
    } catch {
      messageApi.error('Thao tác thất bại. Vui lòng kiểm tra trạng thái đơn và quyền tài khoản.')
    } finally {
      setActionLoading(false)
    }
  }

  const totals = useMemo(() => order ? [
    ['Tạm tính', order.subtotal],
    ['Giảm giá', -order.discountAmount],
    ['Phí vận chuyển', order.shippingFee],
    ['Thuế', order.taxAmount],
  ] as const : [], [order])

  if (loading) return <div style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>
  if (!order) return <Card><Empty description="Không tìm thấy đơn hàng" /><div style={{ textAlign: 'center' }}><Button onClick={() => navigate('/admin/orders')}>Quay lại danh sách</Button></div></Card>

  return (
    <div>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }} onClick={() => navigate('/admin/orders')}>Danh sách đơn hàng</Button>
          <Space align="center" wrap>
            <Title level={2} className="glowup-page-title" style={{ marginBottom: 0 }}>Đơn {order.orderNumber}</Title>
            <Tag color={statusColors[order.status]}>{statusLabels[order.status] ?? order.status}</Tag>
          </Space>
          <Text className="glowup-page-subtitle">Tạo lúc {dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')} · {order.store.name}</Text>
        </div>
        <Space wrap>
          {order.actions.canConfirm && <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setConfirmOpen(true)}>Xác nhận đơn</Button>}
          {order.actions.nextStatuses.length > 0 && <Button onClick={() => setStatusOpen(true)}>Cập nhật trạng thái</Button>}
          {order.actions.canCancel && <Button danger icon={<CloseCircleOutlined />} onClick={() => setCancelOpen(true)}>Hủy đơn</Button>}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="glowup-panel" title={<Space><ShoppingOutlined /> Sản phẩm trong đơn</Space>}>
            <List
              dataSource={order.items}
              renderItem={(item) => (
                <List.Item extra={<div style={{ textAlign: 'right' }}><strong>{money.format(item.totalPrice)}</strong><div><Text type="secondary">{item.quantity} × {money.format(item.unitPrice)}</Text></div></div>}>
                  <List.Item.Meta
                    avatar={item.imageUrl ? <Image width={54} height={54} style={{ objectFit: 'cover', borderRadius: 8 }} src={item.imageUrl} preview={false} /> : <Avatar shape="square" size={54} icon={<ShoppingOutlined />} />}
                    title={<Space direction="vertical" size={0}><span>{item.productName}</span><Text type="secondary" style={{ fontSize: 12 }}>{item.variantName || 'Mặc định'} · SKU {item.sku}</Text></Space>}
                    description={item.discountAmount > 0 ? `Giảm ${money.format(item.discountAmount)}` : undefined}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card className="glowup-panel" title="Lịch sử trạng thái" style={{ marginTop: 16 }}>
            <Timeline
              items={order.statusHistory.map((history) => ({
                color: history.status === 'CANCELLED' ? 'red' : history.status === 'COMPLETED' ? 'green' : '#BE123C',
                children: (
                  <div>
                    <Space><strong>{statusLabels[history.status] ?? history.status}</strong><Text type="secondary">{dayjs(history.createdAt).format('DD/MM/YYYY HH:mm')}</Text></Space>
                    {history.note && <div><Text type="secondary">{history.note}</Text></div>}
                    {history.changedBy && <div style={{ fontSize: 12 }}>Bởi {history.changedBy.fullName}</div>}
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="glowup-panel" title={<Space><UserOutlined /> Khách hàng</Space>}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Họ tên">{order.customer?.fullName ?? 'Khách lẻ'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{order.customer?.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{order.customer?.email ?? '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="glowup-panel" title={<Space><EnvironmentOutlined /> Giao hàng</Space>} style={{ marginTop: 16 }}>
            <Text>{shippingAddressText(order.shippingAddress)}</Text>
            {order.shipments.length > 0 && <><Divider /><Descriptions column={1} size="small"><Descriptions.Item label="Vận đơn">{order.shipments[0].shipmentCode}</Descriptions.Item><Descriptions.Item label="Đơn vị">{order.shipments[0].carrierCode}</Descriptions.Item><Descriptions.Item label="Tracking">{order.shipments[0].trackingCode ?? '—'}</Descriptions.Item></Descriptions></>}
          </Card>

          <Card className="glowup-panel" title={<Space><CreditCardOutlined /> Thanh toán</Space>} style={{ marginTop: 16 }}>
            {order.payments.length ? order.payments.map((payment) => <div key={payment.id} style={{ marginBottom: 10 }}><Space style={{ width: '100%', justifyContent: 'space-between' }}><span>{payment.paymentMethod}</span><Tag>{payment.status}</Tag></Space><div><strong>{money.format(payment.amount)}</strong></div></div>) : <Text type="secondary">Chưa có giao dịch thanh toán</Text>}
            <Divider />
            {totals.map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><Text type="secondary">{label}</Text><span>{money.format(value)}</span></div>)}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}><strong>Tổng cộng</strong><strong style={{ color: '#BE123C' }}>{money.format(order.totalAmount)}</strong></div>
          </Card>
        </Col>
      </Row>

      <Modal title="Xác nhận đơn hàng" open={confirmOpen} okText="Xác nhận" cancelText="Đóng" confirmLoading={actionLoading} onCancel={() => setConfirmOpen(false)} onOk={() => void runAction(() => confirmAdminOrder(order.id, note || undefined), 'Đã xác nhận đơn hàng')}>
        <Text>Đơn <strong>{order.orderNumber}</strong> sẽ chuyển sang trạng thái Đã xác nhận.</Text>
        <TextArea style={{ marginTop: 16 }} rows={3} placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>

      <Modal title="Cập nhật trạng thái" open={statusOpen} okText="Cập nhật" cancelText="Đóng" confirmLoading={actionLoading} okButtonProps={{ disabled: !nextStatus }} onCancel={() => setStatusOpen(false)} onOk={() => nextStatus && void runAction(() => updateAdminOrderStatus(order.id, nextStatus, note || undefined), 'Đã cập nhật trạng thái đơn')}>
        <Select style={{ width: '100%', marginBottom: 16 }} placeholder="Chọn trạng thái kế tiếp" value={nextStatus} onChange={setNextStatus} options={order.actions.nextStatuses.map((status) => ({ value: status, label: statusLabels[status] ?? status }))} />
        <TextArea rows={3} placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>

      <Modal title="Hủy đơn hàng" open={cancelOpen} okText="Hủy đơn" okButtonProps={{ danger: true, disabled: cancelReason.trim().length < 3 }} cancelText="Đóng" confirmLoading={actionLoading} onCancel={() => setCancelOpen(false)} onOk={() => void runAction(() => cancelAdminOrder(order.id, cancelReason.trim()), 'Đã hủy đơn hàng')}>
        <Text type="secondary">Nhập lý do hủy để hệ thống ghi lịch sử và xử lý hoàn tồn/coupon/điểm theo backend.</Text>
        <TextArea style={{ marginTop: 16 }} rows={4} placeholder="Lý do hủy đơn..." value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
      </Modal>
    </div>
  )
}
