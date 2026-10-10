export type PageResult<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    itemCount: number
    pageCount: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

export type PosSessionStatus = 'OPEN' | 'CLOSED' | 'RECONCILED'

export type PosSession = {
  id: string
  sessionCode: string
  store: { id: string; code: string; name: string }
  cashier: { id: string; fullName: string }
  openedAt: string
  closedAt: string | null
  openingCash: number
  systemCash: number
  countedCash: number | null
  difference: number | null
  status: PosSessionStatus
  note: string | null
  approvedBy: { id: string; fullName: string | null } | null
}

export type PosSessionQuery = {
  page?: number
  limit?: number
  order?: 'ASC' | 'DESC'
  storeId?: string
  cashierId?: string
  status?: PosSessionStatus
  fromDate?: string
  toDate?: string
}

export type OpenPosSessionInput = { storeId: string; openingCash: number; note?: string }
export type ClosePosSessionInput = { countedCash: number; note?: string }

export type StockStatus = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'

export type InventoryItem = {
  id: string
  store: { id: string; code: string; name: string }
  variant: {
    id: string
    sku: string
    barcode: string | null
    optionLabel: string | null
    productId: string
    productName: string
  }
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  minQuantity: number
  isLowStock: boolean
  nearestExpiryDate: string | null
  hasNearExpiry: boolean
  updatedAt: string
}

export type InventoryQuery = {
  page?: number
  limit?: number
  order?: 'ASC' | 'DESC'
  storeId?: string
  categoryId?: string
  brandId?: string
  search?: string
  status?: StockStatus
}

export type PosInventoryQuery = {
  storeId: string
  page?: number
  limit?: number
  order?: 'ASC' | 'DESC'
  search?: string
}

export type ReceivePurchaseOrderInput = {
  purchaseOrderId: string
  items: Array<{
    purchaseOrderItemId: string
    quantity: number
    batchNumber: string
    expiryDate: string
    manufactureDate?: string
  }>
  note?: string
}

export type AdjustInventoryInput = {
  storeId: string
  productVariantId: string
  quantity: number
  reason: string
  batchId?: string
  batchNumber?: string
  expiryDate?: string
  manufactureDate?: string
}
