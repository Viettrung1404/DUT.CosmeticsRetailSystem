import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import BrandsPage from './pages/brands/BrandsPage'
import CategoriesPage from './pages/categories/CategoriesPage'
import ProductsPage from './pages/products/ProductsPage'
import OrdersPage from './pages/orders/OrdersPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import CustomersPage from './pages/customers/CustomersPage'
import PosPage from './pages/pos/PosPage'
import PosSessionsPage from './pages/pos/PosSessionsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import InventoryReceivePage from './pages/inventory/InventoryReceivePage'
import UsersPage from './pages/users/UsersPage'
import TransfersPage from './pages/inventory/TransfersPage'
import StocktakesPage from './pages/inventory/StocktakesPage'
import BatchesPage from './pages/inventory/BatchesPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import PurchaseOrdersPage from './pages/suppliers/PurchaseOrdersPage'
import SupplierPaymentsPage from './pages/suppliers/SupplierPaymentsPage'
import FinancePage from './pages/finance/FinancePage'
import HrSettingsPage from './pages/hr/HrSettingsPage'
import EmployeesPage from './pages/hr/EmployeesPage'
import AttendancePage from './pages/hr/AttendancePage'
import CommissionsPage from './pages/hr/CommissionsPage'
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
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
    </Routes>
  )
}
