import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import PagePlaceholder from './components/common/PagePlaceholder'
import LoginPage from './pages/auth/LoginPage'
import CategoriesPage from './pages/categories/CategoriesPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="categories" replace />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<PagePlaceholder title="Quản lý thương hiệu" description="Nằm ở branch FE Admin Brands." />} />
          <Route path="products" element={<PagePlaceholder title="Quản lý sản phẩm" description="Nằm ở branch FE Admin Products." />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
