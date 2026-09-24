import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategoryTree,
  updateCategory,
} from '../../api/categoriesApi'
import type { Category, CategoryPayload } from '../../types/catalog'

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string; data?: { message?: string } }
      | undefined
    return body?.message ?? body?.data?.message ?? 'Có lỗi xảy ra'
  }
  return 'Có lỗi xảy ra'
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

function flatten(nodes: Category[]): Category[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

function toTreeData(nodes: Category[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: (
      <Space>
        <span>{node.name}</span>
        {!node.isActive && <Tag>Đã ẩn</Tag>}
      </Space>
    ),
    children: toTreeData(node.children ?? []),
  }))
}

export default function CategoriesPage() {
  const [form] = Form.useForm<CategoryPayload>()
  const [tree, setTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)

  const allCategories = useMemo(() => flatten(tree), [tree])
  const treeData = useMemo(() => toTreeData(tree), [tree])

  const load = async () => {
    setLoading(true)
    try {
      const result = await getCategoryTree()
      setTree(result)
      if (selected) {
        const current = flatten(result).find((item) => item.id === selected.id)
        setSelected(current ?? null)
      }
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openCreate = (parentId?: string | null) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      parentId: parentId ?? null,
      sortOrder: 0,
      isActive: true,
    })
    setOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    form.setFieldsValue({
      parentId: category.parentId ?? null,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      parentId: values.parentId || null,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, payload)
        message.success('Cập nhật danh mục thành công')
      } else {
        await createCategory(payload)
        message.success('Thêm danh mục thành công')
      }
      setOpen(false)
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Quản lý danh mục
          </Typography.Title>
          <Typography.Text type="secondary">
            Cây danh mục đầy đủ, gồm cả danh mục đã ẩn.
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Tải lại
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(null)}>
            Thêm danh mục gốc
          </Button>
        </Space>
      </div>

      <Row gutter={20}>
        <Col xs={24} lg={10}>
          <Card loading={loading} title="Cây danh mục">
            <Tree
              blockNode
              defaultExpandAll
              treeData={treeData}
              selectedKeys={selected ? [selected.id] : []}
              onSelect={(keys) => {
                const id = keys[0]?.toString()
                setSelected(
                  id ? allCategories.find((item) => item.id === id) ?? null : null,
                )
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Chi tiết danh mục">
            {selected ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Typography.Title level={4} style={{ marginBottom: 2 }}>
                    {selected.name}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {selected.slug}
                  </Typography.Text>
                </div>

                <div>
                  Trạng thái:{' '}
                  {selected.isActive ? (
                    <Tag color="green">Hoạt động</Tag>
                  ) : (
                    <Tag>Đã ẩn</Tag>
                  )}
                </div>
                <div>Thứ tự: {selected.sortOrder}</div>
                <div>Mô tả: {selected.description || '—'}</div>

                <Space wrap>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openCreate(selected.id)}
                  >
                    Thêm danh mục con
                  </Button>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEdit(selected)}
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Ẩn danh mục?"
                    description="Backend sẽ chặn nếu còn danh mục con đang hoạt động."
                    onConfirm={async () => {
                      try {
                        await deleteCategory(selected.id)
                        message.success('Đã ẩn danh mục')
                        setSelected(null)
                        await load()
                      } catch (error) {
                        message.error(errorText(error))
                      }
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      Xóa mềm
                    </Button>
                  </Popconfirm>
                </Space>
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Chọn một danh mục trong cây để xem và chỉnh sửa.
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        confirmLoading={saving}
        width={700}
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
          <Form.Item name="parentId" label="Danh mục cha">
            <Select
              allowClear
              placeholder="Danh mục gốc"
              options={allCategories
                .filter((item) => item.id !== editing?.id && item.isActive)
                .map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: 'Nhập tên danh mục' }]}
          >
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: 'Nhập slug' },
              {
                pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
              },
            ]}
          >
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh URL" rules={[{ type: 'url' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked">
            <Switch />
          </Form.Item>
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
