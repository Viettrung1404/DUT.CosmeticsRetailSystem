import {
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/admin/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
  { key: '/admin/categories', icon: <TagsOutlined />, label: 'Danh mục' },
  { key: '/admin/brands', icon: <ShopOutlined />, label: 'Thương hiệu' },
]

const pageNames: Record<string, string> = {
  '/admin/products': 'Sản phẩm',
  '/admin/categories': 'Danh mục',
  '/admin/brands': 'Thương hiệu',
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const currentTitle = useMemo(
    () => pageNames[location.pathname] ?? 'Quản trị',
    [location.pathname],
  )

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={240}>
        <div
          style={{
            height: 64,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 18 : 20,
          }}
        >
          {collapsed ? 'GU' : 'GlowUp Admin'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 20px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            aria-label="Thu gọn menu"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
          />

          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Đăng xuất',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar src={user?.avatarUrl ?? undefined} icon={<UserOutlined />} />
              <Text>{user?.fullName || 'Admin'}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: 20 }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[{ title: 'Admin' }, { title: currentTitle }]}
          />

          <div
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
