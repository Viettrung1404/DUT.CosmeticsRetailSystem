# FE Admin — Sprint 3 validation checklist

This branch builds on feat/admin-sprint3-integration (Sprint 1 + 2 + existing Sprint 3 pages).

## Runtime setup
- Backend must include POS Sales PR #46 and POS/Inventory PR #45 (both merged into develop).
- Because FE and BE share a monorepo, use two Git worktrees if you need FE on this branch and BE on develop.
- Backend: cd backend && npm ci && npm run prisma:generate && npm run start:dev.
- FE: cd frontend-admin && npm ci && npm run build && npm run dev.
- Login with a user assigned to an active selling store and with ORDER_POS_CREATE + PAYMENT_COLLECT; customer lookup needs CUSTOMER_VIEW; create customer needs CUSTOMER_CREATE_UPDATE.
- PO receiving needs PO_RECEIVE, inventory listing needs INVENTORY_VIEW, adjustments need INVENTORY_CHECK; historical POS sessions and reconcile need PAYMENT_RECONCILE.
- Backend .env must be configured. Do not commit secrets.

## POS live smoke test
1. Open /admin/pos; select a store returned by GET /pos/my-stores.
2. Open a POS session in /admin/pos/sessions; return to POS and refresh.
3. Search a real product by name or SKU; add variant; change quantity; test out-of-stock prevention.
4. Scan barcode via camera on a supported secure Chrome/Edge environment, or type a barcode into the fallback input.
5. Lookup existing customer by phone, then try quick-create with a different phone.
6. Apply coupon and points with customer selected; preview must reflect server-calculated price and shortages. Without a customer voucher/points are disabled.
7. Test CASH, CARD, TRANSFER, split payment, insufficient funds, change only from cash and zero-value order.
8. Submit once. The server must create POS order and deduct FEFO stock. Print receipt, then verify item totals and order number.
9. Refresh inventory; confirm stock falls. Close session, verify system cash and reconcile as a second authorized user.

## Inventory smoke test
- /admin/inventory: pagination, store/category/status filter, low stock / near-expiry badge, export.
- /admin/inventory/receive: select an eligible CONFIRMED/PARTIALLY_RECEIVED PO; confirm pre-filled pending items; receive partial/full quantities with batches and expiry dates; observe increased stock and updated PO status.
- Adjustment: positive with new batch, negative with FEFO; try quantities exceeding sellable stock and insufficient permissions.

## Important boundaries
- Native BarcodeDetector is feature-detected. Browsers without support must use the manual barcode input; a cross-browser fallback library is a future enhancement.
- Payments CARD/TRANSFER are POS-recorded tenders, not online VNPay/MoMo/ZaloPay gateway redirects.
- API existence and successful commits do not equal integration/E2E pass: verify actual DB, permissions, Swagger, printer setup and responsive design.
- Do not merge into develop until review and tests pass.
