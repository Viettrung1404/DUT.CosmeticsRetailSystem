import {
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from '../../api/brandsApi'
import { uploadImage } from '../../api/uploadApi'
import type { Brand, BrandPayload } from '../../types/catalog'

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string; data?: { message?: string } }
      | undefined
    return body?.message ?? body?.data?.message ?? 'Có lỗi xảy ra'
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra'
}

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BrandsPage() {
  const [form] = Form.useForm<BrandPayload>()
  const [items, setItems] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<boolean | undefined>()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getBrands({
        page,
        limit,
        search: search || undefined,
        isActive: status,
      })
      setItems(result.data)
      setTotal(result.meta.itemCount)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [page, limit, search, status])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sortOrder: 0, isFeatured: false, isActive: true })
    setOpen(true)
  }

  const openEdit = (brand: Brand) => {
    setEditing(brand)
    form.setFieldsValue({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      bannerUrl: brand.bannerUrl,
      description: brand.description,
      countryOfOrigin: brand.countryOfOrigin,
      websiteUrl: brand.websiteUrl,
      sortOrder: brand.sortOrder,
      isFeatured: brand.isFeatured,
      isActive: brand.isActive,
      metaTitle: brand.metaTitle,
      metaDescription: brand.metaDescription,
    })
    setOpen(true)
  }

  const upload = async (file: File, field: 'logoUrl' | 'bannerUrl') => {
    setUploading(field === 'logoUrl' ? 'logo' : 'banner')
    try {
      const url = await uploadImage(file, 'brands')
      form.setFieldValue(field, url)
      message.success('Tải ảnh lên thành công')
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) {
        await updateBrand(editing.id, values)
        message.success('Cập nhật thương hiệu thành công')
      } else {
        await createBrand(values)
        message.success('Thêm thương hiệu thành công')
      }
      setOpen(false)
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo<ColumnsType<Brand>>(
    () => [
      {
        title: 'Thương hiệu',
        dataIndex: 'name',
        width: 280,
        render: (_, row) => (
          <Space size={10}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 9,
                background: '#F8FAFC',
                border: '1px solid #E5E7EB',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                flex: '0 0 auto',
              }}
            >
              {row.logoUrl ? (
                <Image
                  src={row.logoUrl}
                  alt={row.name}
                  width={36}
                  height={36}
                  preview={false}
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <Typography.Text strong style={{ fontSize: 11 }}>{row.name.slice(0, 2).toUpperCase()}</Typography.Text>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{row.name}</div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{row.slug}</Typography.Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Quốc gia',
        dataIndex: 'countryOfOrigin',
        width: 150,
        render: (value) => value ? <Tag>{value}</Tag> : '—',
      },
      {
        title: 'Website',
        dataIndex: 'websiteUrl',
        width: 190,
        ellipsis: true,
        render: (value) =>
          value ? (
            <a href={value} target="_blank" rel="noreferrer" style={{ color: '#9F1239' }}>
              <GlobalOutlined /> {value.replace(/^https?:\/\//, '')}
            </a>
          ) : '—',
      },
      {
        title: 'Nổi bật',
        dataIndex: 'isFeatured',
        width: 100,
        align: 'center',
        render: (value) =>
          value ? <StarFilled style={{ color: '#D97706' }} /> : <span style={{ color: '#D1D5DB' }}>☆</span>,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        width: 135,
        render: (value) => value ? <Tag color="green">Đang hợp tác</Tag> : <Tag>Đã ẩn</Tag>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, row) => (
          <Space size={2}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
            <Popconfirm
              title="Xóa thương hiệu?"
              description="Chỉ xóa được khi thương hiệu chưa có sản phẩm."
              onConfirm={async () => {
                try {
                  await deleteBrand(row.id)
                  message.success('Đã xóa thương hiệu')
                  await load()
                } catch (error) {
                  message.error(errorText(error))
                }
              }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  )

  const featuredCount = items.filter((item) => item.isFeatured).length
  const activeCount = items.filter((item) => item.isActive).length
  const countryCount = new Set(items.map((item) => item.countryOfOrigin).filter(Boolean)).size

  return (
    <>
      <div className="glowup-page-header">
        <div>
          <Typography.Title level={2} className="glowup-page-title">
            Quản lý thương hiệu
          </Typography.Title>
          <Typography.Text className="glowup-page-subtitle">
            Quản lý các thương hiệu mỹ phẩm đối tác và trạng thái hiển thị trong hệ thống.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm thương hiệu
        </Button>
      </div>

      <div className="glowup-stat-strip">
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Tổng thương hiệu</div>
          <div className="glowup-stat-value">{total}</div>
          <div className="glowup-stat-meta">Theo dữ liệu hiện tại</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Đang hoạt động</div>
          <div className="glowup-stat-value">{activeCount}</div>
          <div className="glowup-stat-meta">Trong trang đang xem</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Nổi bật</div>
          <div className="glowup-stat-value">{featuredCount}</div>
          <div className="glowup-stat-meta">Được ưu tiên hiển thị</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Quốc gia</div>
          <div className="glowup-stat-value">{countryCount}</div>
          <div className="glowup-stat-meta">Nguồn gốc thương hiệu</div>
        </div>
      </div>

      <Card className="glowup-toolbar-card" style={{ marginBottom: 14 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Tìm tên thương hiệu..."
            style={{ width: 280 }}
            onPressEnter={(event) => {
              setPage(1)
              setSearch(event.currentTarget.value.trim())
            }}
            onChange={(event) => {
              if (!event.target.value) {
                setPage(1)
                setSearch('')
              }
            }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 170 }}
            options={[
              { label: 'Đang hoạt động', value: true },
              { label: 'Đã ẩn', value: false },
            ]}
            onChange={(value) => {
              setPage(1)
              setStatus(value)
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Tải lại
          </Button>
        </Space>
      </Card>

      <Card className="glowup-table-card">
        <Table<Brand>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 980 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} thương hiệu`,
            onChange: (nextPage, nextLimit) => {
              setPage(nextPage)
              setLimit(nextLimit)
            },
          }}
        />
      </Card>

      <Modal
        title={editing ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        confirmLoading={saving}
        width={760}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (!editing && changed.name && !form.isFieldTouched('slug')) {
              form.setFieldValue('slug', toSlug(changed.name))
            }
          }}
        >
          <Form.Item name="name" label="Tên thương hiệu" rules={[{ required: true, message: 'Nhập tên thương hiệu' }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: 'Nhập slug' },
              { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang' },
            ]}
          >
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="countryOfOrigin" label="Quốc gia xuất xứ">
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item label="Logo">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                accept="image/jpeg,image/png,image/webp"
                showUploadList={false}
                beforeUpload={(file) => {
                  void upload(file as File, 'logoUrl')
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading === 'logo'}>
                  Upload logo
                </Button>
              </Upload>
              <Form.Item name="logoUrl" noStyle rules={[{ type: 'url' }]}>
                <Input placeholder="Hoặc nhập URL logo" />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, next) => prev.logoUrl !== next.logoUrl}>
                {({ getFieldValue }) =>
                  getFieldValue('logoUrl') ? (
                    <Image src={getFieldValue('logoUrl')} width={100} height={70} style={{ objectFit: 'contain' }} />
                  ) : null
                }
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item label="Banner">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                accept="image/jpeg,image/png,image/webp"
                showUploadList={false}
                beforeUpload={(file) => {
                  void upload(file as File, 'bannerUrl')
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading === 'banner'}>
                  Upload banner
                </Button>
              </Upload>
              <Form.Item name="bannerUrl" noStyle rules={[{ type: 'url' }]}>
                <Input placeholder="Hoặc nhập URL banner" />
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item name="websiteUrl" label="Website" rules={[{ type: 'url' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="isFeatured" label="Nổi bật" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" label="Hoạt động" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="metaTitle" label="SEO title">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="metaDescription" label="SEO description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
