import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd'
import axios from 'axios'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './LoginPage.css'

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
    <div className="glowup-login-page glowup-login-page-simple">
      <aside className="glowup-login-art" aria-hidden="true">
        <div className="glowup-login-art-brand">
          <div className="glowup-brand-mark">GU</div>
          <div>
            <div className="glowup-login-art-name">GlowUp</div>
            <div className="glowup-login-art-subtitle">Cosmetics Retail System</div>
          </div>
        </div>

        <div className="glowup-login-art-scene">
          <span className="glowup-cosmetic glowup-cosmetic-bottle" />
          <span className="glowup-cosmetic glowup-cosmetic-tube" />
          <span className="glowup-cosmetic glowup-cosmetic-jar" />
        </div>

        <div className="glowup-login-art-caption">
          Quản trị sản phẩm · Danh mục · Thương hiệu
        </div>
      </aside>

      <main className="glowup-login-form-side glowup-login-form-side-simple">
        <Card className="glowup-login-card glowup-login-card-simple">
          <div className="glowup-login-form-brand">
            <div className="glowup-login-form-icon">GU</div>
            <div>
              <div className="glowup-login-form-name">GlowUp</div>
              <div className="glowup-login-form-badge">ADMIN</div>
            </div>
          </div>

          <div className="glowup-login-heading">
            <Title level={2} className="glowup-login-title">
              Đăng nhập quản trị
            </Title>
            <Text type="secondary">Đăng nhập để truy cập hệ thống quản lý GlowUp</Text>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              showIcon
              message={errorMessage}
              className="glowup-login-error"
            />
          )}

          <Form<LoginValues>
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{ remember: true }}
            className="glowup-login-form"
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
                prefix={<MailOutlined />}
                placeholder="admin@glowup.vn"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
            </Form.Item>

            <div className="glowup-login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              </Form.Item>
              <Button type="link" className="glowup-login-forgot">
                Quên mật khẩu?
              </Button>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              className="glowup-login-submit"
            >
              Đăng nhập
            </Button>
          </Form>
        </Card>
      </main>
    </div>
  )
}
