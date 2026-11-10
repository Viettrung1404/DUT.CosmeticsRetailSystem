import {
  CameraOutlined, DeleteOutlined, FullscreenExitOutlined, FullscreenOutlined,
  PlusOutlined, PrinterOutlined, ReloadOutlined, SearchOutlined, ShoppingCartOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Col, Divider, Input, InputNumber, Modal, Row, Select, Space, Spin, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentPosSession } from '../../api/operationsApi'
import {
  createPosCustomer, createPosOrder, getPosMyStores, getPosReceipt,
  lookupPosCustomer, previewPosOrder, scanPosProduct, searchPosProducts,
} from '../../api/posSalesApi'
import type { PosSession } from '../../types/operations'
import type { PosCartItem, PosCustomer, PosOrderInput, PosPreview, PosProduct, PosReceipt, PosStore } from '../../types/posSales'
import PosBarcodeScanner from './PosBarcodeScanner'

const { Title, Text } = Typography
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
const integer = (value: number | null) => Math.max(0, Math.floor(Number(value ?? 0)))
function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(body?.message)) return body.message.join(', ')
    if (body?.message) return body.message
    if (error.response?.status === 403) return 'Tài khoản không có quyền truy cập hoặc cửa hàng nằm ngoài phạm vi được cấp.'
  }
  return error instanceof Error ? error.message : 'Không thể thực hiện yêu cầu.'
}

export default function PosPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [stores, setStores] = useState<PosStore[]>([])
  const [storeId, setStoreId] = useState('')
  const [session, setSession] = useState<PosSession | null>(null)
  const [keyword, setKeyword] = useState('')
  const [barcode, setBarcode] = useState('')
  const [products, setProducts] = useState<PosProduct[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customer, setCustomer] = useState<PosCustomer | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [pointsToUse, setPointsToUse] = useState(0)
  const [preview, setPreview] = useState<PosPreview | null>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [cash, setCash] = useState(0)
  const [card, setCard] = useState(0)
  const [transfer, setTransfer] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [receipt, setReceipt] = useState<PosReceipt | null>(null)
  const [lastOrderId, setLastOrderId] = useState('')
  const [lastOrderNumber, setLastOrderNumber] = useState('')

  useEffect(() => {
    let active = true
    getPosMyStores()
      .then(items => {
        if (!active) return
        setStores(Array.isArray(items) ? items : [])
        if (items.length === 1) setStoreId(items[0].id)
      })
      .catch(e => { if (active) messageApi.error(errorMessage(e)) })
    return () => { active = false }
  }, [messageApi])

  const payload: PosOrderInput = useMemo(() => ({
    storeId,
    items: cart.map(line => ({ variantId: line.product.variantId, quantity: line.quantity })),
    ...(customer ? { customerId: customer.id } : {}),
    ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
    ...(pointsToUse > 0 ? { pointsToUse } : {}),
  }), [storeId, cart, customer, couponCode, pointsToUse])
  const signature = JSON.stringify(payload)
  const previewValid = preview !== null && previewKey === signature
  const totalReceived = cash + card + transfer
  const change = previewValid ? totalReceived - preview.total : 0
  const paymentValid = !!previewValid && !!preview?.canCheckout &&
    (preview.total === 0 ? totalReceived === 0 : totalReceived >= preview.total) &&
    (change <= 0 || cash >= change) &&
    [cash, card, transfer].every(value => Number.isInteger(value) && value >= 0 && value <= 1_000_000_000)

  const refreshSession = async (id = storeId) => {
    if (!id) { setSession(null); return }
    try {
      const current = await getCurrentPosSession(id)
      setSession(current?.status === 'OPEN' ? current : null)
    } catch (e) {
      setSession(null)
      messageApi.error(errorMessage(e))
    }
  }

  useEffect(() => {
    if (!storeId) return
    let active = true
    getCurrentPosSession(storeId).then(s => {
      if (active) setSession(s?.status === 'OPEN' ? s : null)
    }).catch(() => { if (active) setSession(null) })
    return () => { active = false }
  }, [storeId])

  const chooseStore = (id: string) => {
    setStoreId(id)
    setSession(null)
    setProducts([])
    setCart([])
    setCustomer(null)
    setCustomerPhone('')
    setCouponCode('')
    setPointsToUse(0)
    setPreview(null)
    setPayOpen(false)
    setReceipt(null)
    setPage(1)
  }

  const findProducts = async (nextPage = 1) => {
    if (!storeId) { messageApi.warning('Chọn cửa hàng trước khi tìm sản phẩm.'); return }
    if (!keyword.trim()) { messageApi.warning('Nhập tên sản phẩm hoặc SKU.'); return }
    setLoading(true)
    try {
      const result = await searchPosProducts(storeId, keyword.trim(), nextPage)
      setProducts(result.data ?? [])
      setTotal(result.meta?.itemCount ?? 0)
      setPage(nextPage)
    } catch (e) { messageApi.error(errorMessage(e)) }
    finally { setLoading(false) }
  }

  const addProduct = (product: PosProduct) => {
    if (!product.isSellable || product.sellableQuantity <= 0) {
      messageApi.warning(product.unavailableReason || 'Sản phẩm không còn số lượng có thể bán.')
      return
    }
    setCart(old => {
      const existing = old.find(item => item.product.variantId === product.variantId)
      if (existing) {
        if (existing.quantity >= product.sellableQuantity) {
          messageApi.warning('Không thể thêm quá tồn có thể bán.')
          return old
        }
        return old.map(item => item.product.variantId === product.variantId
          ? { ...item, product, quantity: item.quantity + 1 }
          : item)
      }
      if (old.length >= 100) { messageApi.warning('Giỏ hàng tối đa 100 dòng.'); return old }
      return [...old, { product, quantity: 1 }]
    })
  }

  const onScanned = useCallback((value: string) => {
    setScanOpen(false)
    setBarcode(value)
    if (!storeId) { messageApi.warning('Chọn cửa hàng trước khi quét mã.'); return }
    void scanPosProduct(storeId, value).then(product => {
      addProduct(product)
      messageApi.success('Đã đọc mã vạch: ' + value)
    }).catch(e => messageApi.error(errorMessage(e)))
  // addProduct dùng cập nhật state dạng functional, không phụ thuộc giỏ hàng tại thời điểm gọi.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, messageApi])

  const scanManual = () => {
    if (!barcode.trim()) return messageApi.warning('Nhập barcode trước khi tra cứu.')
    onScanned(barcode.trim())
  }

  const updateQuantity = (variantId: string, count: number | null) => {
    const quantity = integer(count)
    setCart(old => old.flatMap(item => {
      if (item.product.variantId !== variantId) return [item]
      if (quantity === 0) return []
      return [{ ...item, quantity: Math.min(999, quantity, item.product.sellableQuantity) }]
    }))
  }

  const lookup = async () => {
    if (!/^\+?\d{9,15}$/.test(customerPhone.trim())) {
      messageApi.warning('Nhập số điện thoại 9–15 chữ số.')
      return
    }
    setBusy(true)
    try {
      const found = await lookupPosCustomer(customerPhone.trim())
      setCustomer(found)
      messageApi.success('Đã tìm thấy khách hàng.')
    } catch (e) {
      setCustomer(null)
      messageApi.error(errorMessage(e))
    } finally { setBusy(false) }
  }

  const createCustomer = async () => {
    if (!/^\+?\d{9,15}$/.test(customerPhone.trim()) || !customerName.trim()) {
      messageApi.warning('Cần số điện thoại hợp lệ và họ tên.')
      return
    }
    setBusy(true)
    try {
      const created = await createPosCustomer(customerPhone.trim(), customerName.trim())
      setCustomer(created)
      setNewCustomerOpen(false)
      messageApi.success('Tạo khách tại quầy thành công.')
    } catch (e) { messageApi.error(errorMessage(e)) }
    finally { setBusy(false) }
  }

  const quote = async () => {
    if (!storeId || !session) { messageApi.warning('Phải mở ca bán tại cửa hàng này trước khi thanh toán.'); return }
    if (!cart.length) { messageApi.warning('Giỏ hàng đang trống.'); return }
    if ((couponCode.trim() || pointsToUse > 0) && !customer) {
      messageApi.warning('Cần chọn khách hàng khi dùng voucher hoặc điểm.')
      return
    }
    setBusy(true)
    try {
      const key = signature
      const result = await previewPosOrder(payload)
      setPreview(result)
      setPreviewKey(key)
      setCash(result.total)
      setCard(0)
      setTransfer(0)
      setPayOpen(true)
      if (!result.canCheckout) messageApi.warning('Có sản phẩm thiếu tồn. Vui lòng điều chỉnh giỏ.')
    } catch (e) { setPreview(null); messageApi.error(errorMessage(e)) }
    finally { setBusy(false) }
  }

  const checkout = async () => {
    if (!paymentValid || !previewValid) return
    setBusy(true)
    try {
      // Backend chịu trách nhiệm xác thực ca, tiền, voucher, điểm và trừ tồn trong transaction.
      const result = await createPosOrder({
        ...payload,
        payments: [
          ...(cash > 0 ? [{ method: 'CASH' as const, amount: cash }] : []),
          ...(card > 0 ? [{ method: 'CARD' as const, amount: card }] : []),
          ...(transfer > 0 ? [{ method: 'TRANSFER' as const, amount: transfer }] : []),
        ],
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      // KHÔNG gọi lại create order khi lấy biên lai thất bại để tránh tạo trùng giao dịch.
      setLastOrderId(result.orderId)
      setLastOrderNumber(result.orderNumber)
      setPayOpen(false)
      setCart([])
      setPreview(null)
      setCouponCode('')
      setPointsToUse(0)
      setCustomer(null)
      setCustomerPhone('')
      setNote('')
      messageApi.success('Bán hàng thành công: ' + result.orderNumber)
      try {
        const data = await getPosReceipt(result.orderId)
        setReceipt(data)
      } catch (receiptError) {
        messageApi.warning('Đơn đã thành công nhưng chưa tải được hóa đơn: ' + errorMessage(receiptError))
      }
      await refreshSession()
    } catch (e) { messageApi.error(errorMessage(e)) }
    finally { setBusy(false) }
  }

  const retryReceipt = async () => {
    if (!lastOrderId) return
    setBusy(true)
    try { setReceipt(await getPosReceipt(lastOrderId)) }
    catch (e) { messageApi.error(errorMessage(e)) }
    finally { setBusy(false) }
  }

  const columns: ColumnsType<PosProduct> = [
    { title: 'Sản phẩm / biến thể', key: 'name', render: (_, product) => (
      <Space direction="vertical" size={0}>
        <Text strong>{product.productName}</Text>
        <Text type="secondary">{product.variantName || 'Mặc định'} · {product.sku}</Text>
        {product.hasNearExpiryBatch && <Tag color="gold">Lô cận hạn</Tag>}
      </Space>
    ) },
    { title: 'Giá bán', dataIndex: 'price', width: 125, render: (value: number) => money(value) },
    { title: 'Có thể bán', dataIndex: 'sellableQuantity', width: 105, align: 'right' },
    { title: '', key: 'action', width: 95, render: (_, product) => (
      <Button size="small" type="primary" icon={<PlusOutlined />}
        disabled={!product.isSellable || product.sellableQuantity <= 0}
        onClick={() => addProduct(product)}>Thêm</Button>
    ) },
  ]

  return (
    <div style={fullscreen ? { position: 'fixed', inset: 0, zIndex: 1100, background: '#F5F6F8', overflowY: 'auto', padding: 24 } : undefined}>
      {contextHolder}
      <div className="glowup-page-header">
        <div>
          <Title level={2} className="glowup-page-title">Bán hàng tại quầy · POS</Title>
          <Text type="secondary">Tìm sản phẩm, áp ưu đãi, thu tiền và in biên lai ngay tại cửa hàng.</Text>
        </div>
        <Space wrap>
          <Link to="/admin/pos/sessions"><Button>Quản lý ca</Button></Link>
          <Button icon={<ReloadOutlined />} onClick={() => { void refreshSession(); if (keyword.trim()) void findProducts(page) }}>Làm mới</Button>
          <Button icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setFullscreen(value => !value)}>
            {fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          </Button>
        </Space>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Text strong>Cửa hàng đang bán</Text>
            <Select style={{ minWidth: 270 }} value={storeId || undefined} placeholder="Chọn cửa hàng" options={stores.map(s => ({ value: s.id, label: s.name + ' (' + s.code + ')' }))} onChange={chooseStore} />
            {session
              ? <Tag color="green">Ca đang mở: {session.sessionCode}</Tag>
              : <Tag color="orange">Chưa có ca mở</Tag>}
            {!stores.length && <Text type="secondary">Không có cửa hàng được gán hoặc chưa có quyền ORDER_POS_CREATE.</Text>}
          </Space>
          {!session && storeId && (
            <Alert type="warning" showIcon message="Chưa mở ca bán hàng" description={<span>Hãy mở ca tại <Link to="/admin/pos/sessions">Quản lý ca POS</Link> trước khi checkout.</span>} />
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={14}>
          <Card className="glowup-table-card" title="Tìm và quét sản phẩm" style={{ marginBottom: 16 }}>
            <Space wrap style={{ marginBottom: 16 }}>
              <Input style={{ width: 240 }} prefix={<SearchOutlined />} value={keyword} onChange={e => setKeyword(e.target.value)}
                onPressEnter={() => void findProducts()} placeholder="Tên sản phẩm / SKU" />
              <Button type="primary" loading={loading} onClick={() => void findProducts()}>Tìm kiếm</Button>
              <Input style={{ width: 195 }} value={barcode} onChange={e => setBarcode(e.target.value)} onPressEnter={scanManual} placeholder="Nhập / quét barcode" />
              <Button onClick={scanManual}>Tra mã</Button>
              <Button icon={<CameraOutlined />} onClick={() => setScanOpen(true)} disabled={!storeId}>Camera</Button>
            </Space>
            <Table<PosProduct> rowKey="variantId" columns={columns} dataSource={products} loading={loading}
              size="small" scroll={{ x: 550 }}
              pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: p => void findProducts(p) }}
              locale={{ emptyText: 'Nhập tên hoặc SKU để tìm sản phẩm đang bán.' }} />
          </Card>

          <Card title="Khách hàng & ưu đãi">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setCustomer(null) }}
                  onPressEnter={() => void lookup()} placeholder="Số điện thoại khách" style={{ width: 225 }} />
                <Button onClick={() => void lookup()} loading={busy}>Tra cứu</Button>
                <Button icon={<PlusOutlined />} onClick={() => setNewCustomerOpen(true)}>Tạo khách nhanh</Button>
              </Space>
              {customer ? (
                <Alert type="success" showIcon message={customer.fullName || 'Khách hàng'}
                  description={'SĐT: ' + (customer.phone || '—') + ' · Điểm: ' + customer.totalPoints.toLocaleString('vi-VN') + ' · Hạng: ' + (customer.tier?.name || '—')}
                  action={<Button size="small" onClick={() => { setCustomer(null); setPointsToUse(0); setCouponCode('') }}>Bỏ chọn</Button>} />
              ) : <Text type="secondary">Khách lẻ: không dùng voucher hoặc điểm thành viên.</Text>}
              <Space wrap>
                <Input placeholder="Mã voucher" value={couponCode} disabled={!customer} onChange={e => setCouponCode(e.target.value)} style={{ width: 175 }} />
                <span>Sử dụng điểm:</span>
                <InputNumber min={0} step={10000} precision={0} disabled={!customer} value={pointsToUse}
                  onChange={v => setPointsToUse(integer(v))} style={{ width: 150 }} />
              </Space>
              <Text type="secondary">Khuyến mãi tự động và giới hạn điểm được tính tại backend khi bấm Xem trước thanh toán.</Text>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title={<Space><ShoppingCartOutlined /> Giỏ hàng ({cart.length})</Space>}>
            {cart.length === 0 ? <Text type="secondary">Chọn sản phẩm từ danh sách bên trái.</Text> : cart.map(item => (
              <div key={item.product.variantId} style={{ borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div><Text strong>{item.product.productName}</Text><br /><Text type="secondary">{item.product.variantName || item.product.sku}</Text></div>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => updateQuantity(item.product.variantId, 0)} aria-label="Xóa sản phẩm" />
                  </Space>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <InputNumber min={1} max={Math.min(999, item.product.sellableQuantity)} precision={0} value={item.quantity}
                      onChange={v => updateQuantity(item.product.variantId, v)} style={{ width: 100 }} />
                    <Text strong>{money(item.quantity * item.product.price)}</Text>
                  </Space>
                </Space>
              </div>
            ))}
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text>Tạm tính tham khảo</Text>
                <Text strong>{money(cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0))}</Text>
              </Space>
              <Text type="secondary">Giá chính thức (sau giảm giá/điểm) được backend tính trong bước thanh toán.</Text>
              <Button type="primary" block size="large" disabled={!session || cart.length === 0} loading={busy} onClick={() => void quote()}>
                Xem trước & thanh toán
              </Button>
              {lastOrderId && (
                <Button block icon={<PrinterOutlined />} onClick={() => void retryReceipt()} loading={busy}>
                  Xem lại hóa đơn {lastOrderNumber}
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <PosBarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onScanned} />

      <Modal title="Tạo khách nhanh" open={newCustomerOpen} onCancel={() => setNewCustomerOpen(false)} onOk={() => void createCustomer()} confirmLoading={busy} okText="Tạo khách">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Số điện thoại</Text>
          <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="0901234567" />
          <Text>Họ và tên</Text>
          <Input value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100} />
        </Space>
      </Modal>

      <Modal width={650} title="Xác nhận thanh toán POS" open={payOpen} onCancel={() => { if (!busy) setPayOpen(false) }}
        footer={<Space><Button disabled={busy} onClick={() => setPayOpen(false)}>Đóng</Button>
          <Button type="primary" loading={busy} disabled={!paymentValid} onClick={() => void checkout()}>Xác nhận thu tiền & tạo đơn</Button></Space>}>
        {busy && <Spin size="small" />}
        {previewValid && preview ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {!preview.canCheckout && <Alert type="error" showIcon message="Không đủ tồn để bán" description={preview.shortages.map(s => s.productName + ': yêu cầu ' + s.requested + ', còn ' + s.sellable).join('; ')} />}
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Tạm tính</Text><Text>{money(preview.subtotal)}</Text></Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Khuyến mãi</Text><Text>-{money(preview.promotionDiscount)}</Text></Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Voucher</Text><Text>-{money(preview.couponDiscount)}</Text></Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Điểm sử dụng</Text><Text>-{money(preview.pointsDiscount)}</Text></Space>
            <Divider />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title level={4}>Cần thanh toán</Title><Title level={4} style={{ color: '#BE123C' }}>{money(preview.total)}</Title>
            </Space>
            <Text strong>Phương thức thu tiền (có thể kết hợp)</Text>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}><Text>Tiền mặt</Text><InputNumber style={{ width: '100%' }} min={0} max={1000000000} precision={0} value={cash} onChange={v => setCash(integer(v))} /></Col>
              <Col xs={24} sm={8}><Text>Thẻ</Text><InputNumber style={{ width: '100%' }} min={0} max={1000000000} precision={0} value={card} onChange={v => setCard(integer(v))} /></Col>
              <Col xs={24} sm={8}><Text>Chuyển khoản</Text><InputNumber style={{ width: '100%' }} min={0} max={1000000000} precision={0} value={transfer} onChange={v => setTransfer(integer(v))} /></Col>
            </Row>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Tổng khách đưa</Text><Text>{money(totalReceived)}</Text></Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text strong>Tiền thừa (chỉ tiền mặt)</Text><Text strong>{money(Math.max(change, 0))}</Text></Space>
            {totalReceived < preview.total && <Alert type="warning" showIcon message="Chưa thu đủ tiền" />}
            {change > cash && <Alert type="error" showIcon message="Chỉ tiền mặt được phép thu dư để trả lại tiền thừa." />}
            <Input.TextArea rows={2} maxLength={500} placeholder="Ghi chú đơn POS (không bắt buộc)" value={note} onChange={e => setNote(e.target.value)} />
            <Alert type="info" showIcon message="Giao dịch thật" description="Xác nhận sẽ ghi đơn hàng, thanh toán và trừ tồn kho trên backend. Chỉ bấm một lần." />
          </Space>
        ) : <Alert type="warning" message="Giỏ hoặc ưu đãi đã thay đổi. Hãy đóng và xem trước thanh toán lại." />}
      </Modal>

      <Modal title={'Biên lai ' + (receipt?.orderNumber || '')} width={460} open={!!receipt}
        onCancel={() => setReceipt(null)} footer={<Space><Button onClick={() => setReceipt(null)}>Đóng</Button><Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>In 80mm</Button></Space>}>
        {receipt && (
          <div id="pos-receipt" style={{ width: '100%', maxWidth: 340, margin: 'auto', fontSize: 12, color: '#111' }}>
            <h2 style={{ textAlign: 'center', margin: 0 }}>GLOWUP COSMETICS</h2>
            <p style={{ textAlign: 'center' }}>{receipt.store.name}<br />{receipt.store.code}</p>
            <p>Đơn: {receipt.orderNumber}<br />Ngày: {new Date(receipt.createdAt).toLocaleString('vi-VN')}<br />
              Thu ngân: {receipt.cashierName || '—'}<br />Ca: {receipt.sessionCode || '—'}<br />
              Khách: {receipt.customer?.fullName || 'Khách lẻ'}</p>
            <Divider dashed style={{ margin: '8px 0' }} />
            {receipt.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong>{item.productName}</strong> {item.variantName}<br />
                {item.quantity} × {money(item.unitPrice)}<span style={{ float: 'right' }}>{money(item.lineNetTotal)}</span>
              </div>
            ))}
            <Divider dashed style={{ margin: '8px 0' }} />
            <div>Tạm tính: {money(receipt.subtotal)}</div>
            <div>Khuyến mãi: -{money(receipt.promotionDiscount)}</div>
            <div>Voucher: -{money(receipt.couponDiscount)}</div>
            <div>Điểm: -{money(receipt.pointsDiscount)}</div>
            <h3>Tổng: {money(receipt.total)}</h3>
            {receipt.payments.map((p, i) => <div key={i}>{p.method}: {money(p.tenderedAmount ?? p.amount)}</div>)}
            <div>Tiền thừa: {money(receipt.change)}</div>
            <div>Điểm được cộng: {receipt.pointsEarned}</div>
            <p style={{ textAlign: 'center', marginTop: 16 }}>Cảm ơn quý khách!</p>
          </div>
        )}
      </Modal>
      <style>{'@media print { @page { size: 80mm auto; margin: 2mm; } body * { visibility: hidden !important; } #pos-receipt, #pos-receipt * { visibility: visible !important; } #pos-receipt { position: fixed !important; top: 0; left: 0; width: 76mm !important; max-width: 76mm !important; padding: 0 !important; margin: 0 !important; } }'}</style>
    </div>
  )
}
