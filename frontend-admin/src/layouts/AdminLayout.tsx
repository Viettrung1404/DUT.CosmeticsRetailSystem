import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Dropdown,
  Input,
  Layout,
  Menu,
  Select,
  Space,
} from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: 'catalog-group',
    type: 'group' as const,
    label: 'DANH MỤC & SẢN PHẨM',
    children: [
      { key: '/admin/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
      { key: '/admin/categories', icon: <TagsOutlined />, label: 'Danh mục' },
      { key: '/admin/brands', icon: <ShopOutlined />, label: 'Thương hiệu' },
    ],
  },
  {
    key: 'operations-group',
    type: 'group' as const,
    label: 'VẬN HÀNH',
    children: [
      { key: '/admin/orders', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
      { key: '/admin/customers', icon: <TeamOutlined />, label: 'Khách hàng' },
      { key: '/admin/pos', icon: <ShoppingCartOutlined />, label: 'POS' },
      { key: '/admin/pos/sessions', icon: <ShopOutlined />, label: 'Ca POS' },
      { key: '/admin/inventory', icon: <DatabaseOutlined />, label: 'Tồn kho' },
      { key: '/admin/inventory/receive', icon: <DatabaseOutlined />, label: 'Nhập / điều chỉnh kho' },
    ],
  },
  {
    key: 'analytics-group',
    type: 'group' as const,
    label: 'PHÂN TÍCH & HỆ THỐNG',
    children: [
      { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo', disabled: true },
      { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt', disabled: true },
    ],
  },
]

function resolvePageName(pathname: string) {
  if (pathname === '/admin/products') return 'Quản lý sản phẩm'
  if (pathname === '/admin/categories') return 'Quản lý danh mục'
  if (pathname === '/admin/brands') return 'Quản lý thương hiệu'
  if (pathname === '/admin/orders') return 'Quản lý đơn hàng'
  if (pathname.startsWith('/admin/orders/')) return 'Chi tiết đơn hàng'
  if (pathname === '/admin/customers') return 'Quản lý khách hàng'
  if (pathname === '/admin/pos') return 'POS tại cửa hàng'
  if (pathname === '/admin/pos/sessions') return 'Ca bán hàng POS'
  if (pathname === '/admin/inventory') return 'Quản lý tồn kho'
  if (pathname === '/admin/inventory/receive') return 'Nhập / điều chỉnh kho'
  return 'Quản trị'
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const currentTitle = useMemo(() => resolvePageName(location.pathname), [location.pathname])
  const selectedKey = location.pathname.startsWith('/admin/orders/')
    ? '/admin/orders'
    : location.pathname

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <Layout className="glowup-admin-shell">
      <Sider trigger={null} collapsible collapsed={collapsed} collapsedWidth={80} width={252} className="glowup-sider">
        <div className="glowup-brand">
          <div className="glowup-brand-mark">GU</div>
          {!collapsed && (
            <div className="glowup-brand-copy">
              <div className="glowup-brand-name">GlowUp</div>
              <div className="glowup-brand-subtitle">Enterprise Admin</div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) navigate(key)
          }}
        />

        <div style={{ marginTop: 'auto' }} />
        <Dropdown
          trigger={['click']}
          menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout }] }}
        >
          <div className="glowup-user-panel" style={{ cursor: 'pointer' }}>
            <Space size={10}>
              <Avatar size={34} src={user?.avatarUrl ?? undefined} icon={<UserOutlined />} style={{ background: '#BE123C' }} />
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 145 }}>
                    {user?.fullName || 'Quản trị viên'}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>{user?.roleName || 'Admin'}</div>
                </div>
              )}
            </Space>
          </div>
        </Dropdown>
      </Sider>

      <Layout style={{ minWidth: 0 }}>
        <Header className="glowup-header">
          <Space size={12} style={{ minWidth: 0 }}>
            <Button type="text" aria-label="Thu gọn menu" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((value) => !value)} />
            <div className="glowup-header-search">
              <Input prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />} placeholder="Tìm kiếm sản phẩm, đơn hàng, khách hàng..." suffix={<span style={{ color: '#9CA3AF', fontSize: 11 }}>⌘K</span>} />
            </div>
          </Space>

          <Space size={12}>
            <Select value="flagship" style={{ width: 220 }} options={[{ label: 'Chi nhánh Flagship Q1, TP.HCM', value: 'flagship' }]} />
            <Badge dot offset={[-2, 3]}><Button type="text" shape="circle" icon={<BellOutlined />} /></Badge>
            <Dropdown trigger={['click']} menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout }] }}>
              <Avatar src={user?.avatarUrl ?? undefined} icon={<UserOutlined />} style={{ cursor: 'pointer', background: '#BE123C' }} />
            </Dropdown>
          </Space>
        </Header>

        <Content className="glowup-content">
          <Breadcrumb className="glowup-breadcrumb" items={[{ title: 'Quản trị' }, { title: currentTitle }]} />
          <div className="glowup-page-surface"><Outlet /></div>
        </Content>
      </Layout>
    </Layout>
  )
}
