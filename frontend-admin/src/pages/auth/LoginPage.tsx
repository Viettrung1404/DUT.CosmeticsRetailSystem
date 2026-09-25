import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import axios from 'axios'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const { Title, Text } = Typography

interface LoginValues {
  email: string
  password: string
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
      await login(values)
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
    <div className="d-flex justify-content-center align-items-center min-vh-100 p-3">
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <Title level={2} style={{ marginBottom: 8 }}>
            GlowUp Admin
          </Title>
          <Text type="secondary">Đăng nhập hệ thống quản trị</Text>
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
              size="large"
              placeholder="admin@example.com"
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
              size="large"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
