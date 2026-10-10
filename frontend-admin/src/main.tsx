import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#BE123C',
          colorInfo: '#2563EB',
          colorSuccess: '#16A34A',
          colorWarning: '#F59E0B',
          colorError: '#DC2626',
          colorText: '#111827',
          colorTextSecondary: '#6B7280',
          colorBorder: '#E5E7EB',
          colorBgLayout: '#F5F6F8',
          colorBgContainer: '#FFFFFF',
          borderRadius: 10,
          controlHeight: 40,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Button: {
            primaryShadow: 'none',
            borderRadius: 8,
            fontWeight: 600,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Input: {
            activeBorderColor: '#BE123C',
            hoverBorderColor: '#9F1239',
          },
          Select: {
            activeBorderColor: '#BE123C',
            hoverBorderColor: '#9F1239',
          },
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#374151',
            rowHoverBg: '#FFF7F9',
          },
          Menu: {
            darkItemBg: '#111827',
            darkSubMenuItemBg: '#111827',
            darkItemSelectedBg: '#311820',
            darkItemSelectedColor: '#FFFFFF',
            darkItemHoverBg: '#1F2937',
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
