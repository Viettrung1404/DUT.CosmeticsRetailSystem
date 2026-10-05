import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd'
import axios from 'axios'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const { Title, Text } = Typography

interface LoginValues {
  email: string
  password: string
  remember?: boolean
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/admin/products" replace />
  }

  const onFinish = async (values: LoginValues) => {
    setErrorMessage('')
    setSubmitting(true)

    try {
      await login({ email: values.email, password: values.password })
      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? '/admin/products'
      navigate(destination, { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | { message?: string; data?: { message?: string } }
          | undefined
        setErrorMessage(
          data?.message ??
            data?.data?.message ??
            'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
        )
      } else {
        setErrorMessage('Không thể kết nối đến hệ thống.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glowup-login-page">
      <section className="glowup-login-visual" aria-hidden="true">
        <div className="glowup-login-brand">
          <div className="glowup-brand-mark">GU</div>
          <div>
            <div style={{ fontSize: 17 }}>GlowUp</div>
            <div style={{ color: '#FDA4AF', fontSize: 10, marginTop: 2, letterSpacing: '.08em' }}>
              RETAIL MANAGEMENT
            </div>
          </div>
        </div>

        <div className="glowup-login-kicker">
          <div style={{ color: '#FB7185', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', marginBottom: 10 }}>
            ENTERPRISE ADMIN
          </div>
          <h2>Vận hành hệ thống bán lẻ mỹ phẩm rõ ràng và hiệu quả.</h2>
          <p>
            Không gian quản trị tập trung cho sản phẩm, danh mục, thương hiệu và biến thể trong toàn hệ thống GlowUp.
          </p>
        </div>

        <Text style={{ position: 'relative', zIndex: 1, color: '#94A3B8', fontSize: 11 }}>
          © 2026 GlowUp Cosmetics Retail System
        </Text>
      </section>

      <main className="glowup-login-form-side">
        <Card className="glowup-login-card">
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div className="glowup-brand-mark">GU</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>GlowUp Admin</div>
                <div style={{ color: '#9CA3AF', fontSize: 10 }}>Enterprise Portal</div>
              </div>
            </div>

            <Title level={2} className="glowup-login-title">
              Đăng nhập quản trị
            </Title>
            <Text type="secondary">
              Đăng nhập để truy cập hệ thống quản lý GlowUp.
            </Text>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              showIcon
              message={errorMessage}
              style={{ marginBottom: 20 }}
            />
          )}

          <Form<LoginValues>
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{ remember: true }}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="admin@glowup.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </Form.Item>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                margin: '-2px 0 20px',
              }}
            >
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              </Form.Item>
              <Button type="link" style={{ padding: 0, color: '#9F1239' }}>
                Quên mật khẩu?
              </Button>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              style={{ height: 42 }}
            >
              Đăng nhập
            </Button>
          </Form>

          <div className="glowup-login-footnote">
            <SafetyCertificateOutlined style={{ marginRight: 6 }} />
            Dành cho quản trị viên và nhân viên được cấp quyền
          </div>
        </Card>
      </main>
    </div>
  )
}
