import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import PagePlaceholder from './components/common/PagePlaceholder'
import LoginPage from './pages/auth/LoginPage'
import ProductsPage from './pages/products/ProductsPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<PagePlaceholder title="Quản lý danh mục" description="Nằm ở branch FE Admin Categories." />} />
          <Route path="brands" element={<PagePlaceholder title="Quản lý thương hiệu" description="Nằm ở branch FE Admin Brands." />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
