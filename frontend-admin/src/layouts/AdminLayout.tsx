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
  SafetyCertificateOutlined,
  AuditOutlined,
  BankOutlined,
  DeploymentUnitOutlined,
  FileDoneOutlined,
  ScheduleOutlined,
  DollarOutlined,
  SolutionOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Input,
  Layout,
  Menu,
  Space,
} from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationCenter from '../components/common/NotificationCenter'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: 'catalog-group',
    type: 'group' as const,
    label: 'DANH MỤC & SẢN PHẨM',
    children: [
      { key: '/admin/dashboard', icon: <BarChartOutlined />, label: 'Tổng quan vận hành' },
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
    key: 'advanced-ops-group',
    type: 'group' as const,
    label: 'QUẢN TRỊ & VẬN HÀNH',
    children: [
      { key: '/admin/inventory/transfers', icon: <DeploymentUnitOutlined />, label: 'Chuyển kho' },
      { key: '/admin/stocktakes', icon: <AuditOutlined />, label: 'Kiểm kê' },
      { key: '/admin/batches', icon: <InboxOutlined />, label: 'Lô hàng & HSD' },
      { key: '/admin/payments', icon: <DollarOutlined />, label: 'Lịch sử thanh toán' },
      { key: '/admin/reconciliation', icon: <FileDoneOutlined />, label: 'Đối soát' },
      { key: '/admin/employees', icon: <SolutionOutlined />, label: 'Nhân viên' },
      { key: '/admin/departments', icon: <TeamOutlined />, label: 'Phòng ban' },
      { key: '/admin/shifts', icon: <ScheduleOutlined />, label: 'Ca làm việc' },
      { key: '/admin/attendance', icon: <AuditOutlined />, label: 'Chấm công' },
      { key: '/admin/commissions', icon: <DollarOutlined />, label: 'Hoa hồng' },
      { key: '/admin/suppliers', icon: <BankOutlined />, label: 'Nhà cung cấp' },
      { key: '/admin/purchase-orders', icon: <ShoppingCartOutlined />, label: 'Đơn mua hàng (PO)' },
      { key: '/admin/supplier-payments', icon: <DollarOutlined />, label: 'Công nợ & thanh toán NCC' },
    ],
  },
  {
    key: 'insights-group',
    type: 'group' as const,
    label: 'BÁO CÁO & THỐNG KÊ',
    children: [
      { key: '/admin/reports/revenue', icon: <BarChartOutlined />, label: 'Báo cáo doanh thu' },
      { key: '/admin/reports/products', icon: <BarChartOutlined />, label: 'Phân tích sản phẩm' },
      { key: '/admin/reports/customers', icon: <BarChartOutlined />, label: 'Phân tích RFM' },
      { key: '/admin/customers/segments', icon: <TeamOutlined />, label: 'Phân nhóm khách hàng' },
      { key: '/admin/reports/trends', icon: <BarChartOutlined />, label: 'Xu hướng mua hàng' },
      { key: '/admin/reports/forecast', icon: <BarChartOutlined />, label: 'Dự báo doanh thu' },
      { key: '/admin/reports/staff-kpi', icon: <BarChartOutlined />, label: 'Hiệu suất nhân viên' },
      { key: '/admin/reports/hr', icon: <BarChartOutlined />, label: 'Báo cáo nhân sự' },
    ],
  },
  {
    key:'marketing-group', type:'group' as const, label:'MARKETING & NỘI DUNG', children:[
      { key: '/admin/marketing/email', icon: <BellOutlined />, label: 'Email Marketing' },
      { key: '/admin/promotions', icon: <TagsOutlined />, label: 'Khuyến mãi' },
      { key: '/admin/coupons', icon: <TagsOutlined />, label: 'Voucher' },
      { key: '/admin/reviews', icon: <AuditOutlined />, label: 'Đánh giá sản phẩm' },
      { key: '/admin/pages', icon: <FileDoneOutlined />, label: 'Trang nội dung' },
      { key: '/admin/blog', icon: <FileDoneOutlined />, label: 'Blog' },
      { key: '/admin/faqs', icon: <FileDoneOutlined />, label: 'FAQ' },
      { key: '/admin/banners', icon: <AppstoreOutlined />, label: 'Banner quảng cáo' },
      { key: '/admin/notifications/push', icon: <BellOutlined />, label: 'Gửi thông báo' },
      { key: '/admin/products/import', icon: <DatabaseOutlined />, label: 'Nhập sản phẩm Excel' },
    ],
  },
  {
    key: 'analytics-group',
    type: 'group' as const,
    label: 'HỆ THỐNG',
    children: [
      { key: '/admin/users', icon: <SafetyCertificateOutlined />, label: 'Người dùng & phân quyền' },
      { key: '/admin/settings/seo', icon: <SettingOutlined />, label: 'Cấu hình SEO' },
    ],
  },
]

function resolvePageName(pathname: string) {
  const match=menuItems.flatMap(g=>g.children).find(x=>x.key===pathname)
  if(match)return match.label
  if (pathname === '/admin/dashboard') return 'Tổng quan kinh doanh'
  const sprint5Names: Record<string, string> = {
    '/admin/reports/revenue': 'Báo cáo doanh thu',
    '/admin/reports/products': 'Phân tích sản phẩm',
    '/admin/promotions': 'Chương trình khuyến mãi',
    '/admin/coupons': 'Voucher & mã giảm giá',
    '/admin/reviews': 'Đánh giá sản phẩm',
    '/admin/pages': 'Trang nội dung',
    '/admin/blog': 'Quản lý Blog',
    '/admin/faqs': 'Câu hỏi thường gặp',
    '/admin/banners': 'Banner quảng cáo',
    '/admin/notifications/push': 'Thông báo đẩy',
    '/admin/products/import': 'Nhập sản phẩm Excel',
  }
  if (sprint5Names[pathname]) return sprint5Names[pathname]
  if (pathname === '/admin/products') return 'Quản lý sản phẩm'
  if (pathname === '/admin/categories') return 'Quản lý danh mục'
  if (pathname === '/admin/brands') return 'Quản lý thương hiệu'
  if (pathname === '/admin/orders') return 'Quản lý đơn hàng'
  if (pathname.startsWith('/admin/orders/')) return 'Chi tiết đơn hàng'
  if (pathname === '/admin/customers') return 'Quản lý khách hàng'
  if (pathname === '/admin/users') return 'Người dùng & phân quyền'
  const sprint4Names: Record<string, string> = {
    '/admin/inventory/transfers': 'Chuyển kho',
    '/admin/stocktakes': 'Kiểm kê tồn kho',
    '/admin/batches': 'Lô hàng & hạn sử dụng',
    '/admin/payments': 'Lịch sử thanh toán',
    '/admin/reconciliation': 'Đối soát thanh toán',
    '/admin/employees': 'Nhân viên',
    '/admin/departments': 'Phòng ban',
    '/admin/shifts': 'Ca làm việc',
    '/admin/attendance': 'Chấm công',
    '/admin/commissions': 'Hoa hồng',
    '/admin/suppliers': 'Nhà cung cấp',
    '/admin/purchase-orders': 'Đơn mua hàng (PO)',
    '/admin/supplier-payments': 'Công nợ nhà cung cấp',
  }
  if (sprint4Names[pathname]) return sprint4Names[pathname]
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
      <Sider trigger={null} collapsible collapsed={collapsed} collapsedWidth={80} width={252} breakpoint="lg" onBreakpoint={setCollapsed} className="glowup-sider">
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
            <span style={{fontSize:12}}>Phạm vi theo tài khoản</span>
            <NotificationCenter/>
            <Dropdown trigger={['click']} menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout }] }}>
              <Avatar src={user?.avatarUrl ?? undefined} icon={<UserOutlined />} style={{ cursor: 'pointer', background: '#BE123C' }} />
            </Dropdown>
          </Space>
        </Header>

        <Content className="glowup-content">
          <Breadcrumb className="glowup-breadcrumb" items={[{ title: <a onClick={()=>navigate('/admin/dashboard')}>Quản trị</a> }, ...(menuItems.find(g=>g.children.some(c=>c.key===selectedKey))?[{title:menuItems.find(g=>g.children.some(c=>c.key===selectedKey))?.label}]:[]), { title: currentTitle }]} />
          <div className="glowup-page-surface"><Outlet /></div>
        </Content>
      </Layout>
    </Layout>
  )
}
