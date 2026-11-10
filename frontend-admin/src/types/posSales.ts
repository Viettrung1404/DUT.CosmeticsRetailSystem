import type { PageResult } from './operations'

export type PosStore = { id: string; code: string; name: string }
export type PosProduct = {
  variantId: string
  productId: string
  productName: string
  variantName: string | null
  sku: string
  barcode: string | null
  price: number
  sellableQuantity: number
  hasNearExpiryBatch: boolean
  isSellable: boolean
  unavailableReason: string | null
}
export type PosCustomer = {
  id: string
  fullName: string | null
  phone: string | null
  hasAccount: boolean
  totalPoints: number
  tier?: { id?: string; name?: string } | null
}
export type PosCartItem = { product: PosProduct; quantity: number }
export type PosPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
export type PosPayment = { method: PosPaymentMethod; amount: number }
export type PosOrderInput = {
  storeId: string
  items: Array<{ variantId: string; quantity: number }>
  customerId?: string
  couponCode?: string
  pointsToUse?: number
}
export type PosPricedLine = {
  variantId: string
  productName: string
  variantName: string | null
  sku: string
  quantity: number
  unitPrice: number
  gross: number
  promotionName: string | null
  promotionDiscount: number
  couponDiscount: number
  pointsDiscount: number
  lineTotal: number
}
export type PosPreview = {
  lines: PosPricedLine[]
  subtotal: number
  promotionDiscount: number
  couponDiscount: number
  pointsDiscount: number
  pointsUsed: number
  total: number
  canCheckout: boolean
  shortages: Array<{
    variantId: string
    productName: string
    variantName: string | null
    requested: number
    sellable: number
  }>
  customer: { id: string; fullName: string | null; phone: string | null; totalPoints: number } | null
}
export type PosOrderCreated = Omit<PosPreview, 'canCheckout' | 'shortages'> & {
  orderId: string
  orderNumber: string
  createdAt: string
  totalReceived: number
  change: number
  payments: Array<{ method: string; amount: number; tenderedAmount: number | null }>
  pointsEarned: number
}
export type PosReceipt = {
  orderId: string
  orderNumber: string
  status: string
  createdAt: string
  store: { code: string; name: string }
  sessionCode: string | null
  cashierName: string | null
  customer: { id: string; fullName: string | null; phone: string | null } | null
  items: Array<{
    productName: string
    variantName: string
    quantity: number
    unitPrice: number
    discountAmount: number
    pointsDiscount: number
    lineTotal: number
    lineNetTotal: number
  }>
  subtotal: number
  promotionDiscount: number
  couponDiscount: number
  couponCode: string | null
  pointsUsed: number
  pointsDiscount: number
  total: number
  pointsEarned: number
  payments: PosOrderCreated['payments']
  totalReceived: number
  change: number
}
export type PosSearchResult = PageResult<PosProduct>
