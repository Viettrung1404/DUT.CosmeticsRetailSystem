import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const BrandsPage = lazy(() => import('./pages/brands/BrandsPage'))
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage'))
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'))
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'))
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'))
const PosPage = lazy(() => import('./pages/pos/PosPage'))
const PosSessionsPage = lazy(() => import('./pages/pos/PosSessionsPage'))
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'))
const InventoryReceivePage = lazy(() => import('./pages/inventory/InventoryReceivePage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))
const TransfersPage = lazy(() => import('./pages/inventory/TransfersPage'))
const StocktakesPage = lazy(() => import('./pages/inventory/StocktakesPage'))
const BatchesPage = lazy(() => import('./pages/inventory/BatchesPage'))
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/suppliers/PurchaseOrdersPage'))
const SupplierPaymentsPage = lazy(() => import('./pages/suppliers/SupplierPaymentsPage'))
const FinancePage = lazy(() => import('./pages/finance/FinancePage'))
const HrSettingsPage = lazy(() => import('./pages/hr/HrSettingsPage'))
const EmployeesPage = lazy(() => import('./pages/hr/EmployeesPage'))
const AttendancePage = lazy(() => import('./pages/hr/AttendancePage'))
const CommissionsPage = lazy(() => import('./pages/hr/CommissionsPage'))
const AdminDashboardPage = lazy(() => import('./pages/dashboard/AdminDashboardPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const PromotionsPage = lazy(() => import('./pages/marketing/PromotionsPage'))
const CouponsPage = lazy(() => import('./pages/marketing/CouponsPage'))
const ReviewsPage = lazy(() => import('./pages/marketing/ReviewsPage'))
const CmsPage = lazy(() => import('./pages/marketing/CmsPage'))
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'))
const PushPage = lazy(() => import('./pages/marketing/PushPage'))
const ImportProductsPage = lazy(() => import('./pages/products/ImportProductsPage'))
import ProtectedRoute from './routes/ProtectedRoute'

const AdvancedReportsPage = lazy(() => import('./pages/reports/AdvancedReportsPage'))
const EmailCampaignsPage = lazy(() => import('./pages/marketing/EmailCampaignsPage'))
const SeoSettingsPage = lazy(() => import('./pages/settings/SeoSettingsPage'))
export default function App() {
  return (
    <Suspense fallback={<div role="status" style={{padding:32}}>Đang tải trang…</div>}><Routes>
      <Route path="/admin/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="reports/revenue" element={<ReportsPage mode="revenue" />} />
          <Route path="reports/products" element={<ReportsPage mode="products" />} />
          <Route path="reports/customers" element={<AdvancedReportsPage mode="rfm" />} />
          <Route path="customers/segments" element={<AdvancedReportsPage mode="segments" />} />
          <Route path="reports/trends" element={<AdvancedReportsPage mode="trends" />} />
          <Route path="reports/forecast" element={<AdvancedReportsPage mode="forecast" />} />
          <Route path="reports/hr" element={<AdvancedReportsPage mode="hr" />} />
          <Route path="reports/staff-kpi" element={<AdvancedReportsPage mode="staff-kpi" />} />
          <Route path="marketing/email" element={<EmailCampaignsPage />} />
          <Route path="settings/seo" element={<SeoSettingsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="pages" element={<CmsPage mode="pages" />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="faqs" element={<CmsPage mode="faqs" />} />
          <Route path="banners" element={<CmsPage mode="banners" />} />
          <Route path="notifications/push" element={<PushPage />} />
          <Route path="products/import" element={<ImportProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="inventory/transfers" element={<TransfersPage />} />
          <Route path="stocktakes" element={<StocktakesPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="supplier-payments" element={<SupplierPaymentsPage />} />
          <Route path="payments" element={<FinancePage mode="payments" />} />
          <Route path="reconciliation" element={<FinancePage mode="reconciliation" />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="departments" element={<HrSettingsPage mode="departments" />} />
          <Route path="shifts" element={<HrSettingsPage mode="shifts" />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="commissions" element={<CommissionsPage />} />

          <Route path="pos" element={<PosPage />} />
          <Route path="pos/sessions" element={<PosSessionsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/receive" element={<InventoryReceivePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes></Suspense>
  )
}
