import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import PagePlaceholder from './components/common/PagePlaceholder'
import LoginPage from './pages/auth/LoginPage'
import BrandsPage from './pages/brands/BrandsPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="brands" replace />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="categories" element={<PagePlaceholder title="Quản lý danh mục" description="Nằm ở branch FE Admin Categories." />} />
          <Route path="products" element={<PagePlaceholder title="Quản lý sản phẩm" description="Nằm ở branch FE Admin Products." />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
