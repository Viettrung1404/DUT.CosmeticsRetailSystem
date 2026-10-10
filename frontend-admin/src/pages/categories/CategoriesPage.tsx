import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
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
import type { TreeProps } from 'antd'
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

function flatten(nodes: Category[]): Category[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

function findParent(nodes: Category[], childId: string): Category | null {
  for (const node of nodes) {
    if ((node.children ?? []).some((child) => child.id === childId)) return node
    const found = findParent(node.children ?? [], childId)
    if (found) return found
  }
  return null
}

export default function CategoriesPage() {
  const [form] = Form.useForm<CategoryPayload>()
  const [tree, setTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [inlineId, setInlineId] = useState<string | null>(null)
  const [inlineName, setInlineName] = useState('')
  const [reordering, setReordering] = useState(false)
  const [treeSearch, setTreeSearch] = useState('')

  const allCategories = useMemo(() => flatten(tree), [tree])
  const activeCount = allCategories.filter((item) => item.isActive).length

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

  const saveInline = async (category: Category) => {
    const name = inlineName.trim()
    if (!name) {
      message.warning('Tên danh mục không được để trống')
      return
    }

    try {
      await updateCategory(category.id, {
        name,
        slug: category.slug === toSlug(category.name) ? toSlug(name) : category.slug,
      })
      message.success('Đã đổi tên danh mục')
      setInlineId(null)
      await load()
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const visibleTree = useMemo(() => {
    const keyword = treeSearch.trim().toLowerCase()
    if (!keyword) return tree

    const filterNodes = (nodes: Category[]): Category[] =>
      nodes.flatMap((node) => {
        const children = filterNodes(node.children ?? [])
        if (node.name.toLowerCase().includes(keyword) || children.length) {
          return [{ ...node, children }]
        }
        return []
      })

    return filterNodes(tree)
  }, [tree, treeSearch])

  const treeData = useMemo<DataNode[]>(() => {
    const mapNodes = (nodes: Category[]): DataNode[] =>
      nodes.map((node) => ({
        key: node.id,
        icon: <FolderOutlined />,
        title:
          inlineId === node.id ? (
            <Space size={4} onClick={(event) => event.stopPropagation()}>
              <Input
                size="small"
                autoFocus
                value={inlineName}
                style={{ width: 180 }}
                onChange={(event) => setInlineName(event.target.value)}
                onPressEnter={() => void saveInline(node)}
              />
              <Button
                size="small"
                type="text"
                icon={<CheckOutlined />}
                onClick={() => void saveInline(node)}
              />
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setInlineId(null)}
              />
            </Space>
          ) : (
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Space size={6}>
                <span>{node.name}</span>
                {!node.isActive && <Tag>Đã ẩn</Tag>}
              </Space>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  setInlineId(node.id)
                  setInlineName(node.name)
                }}
              />
            </div>
          ),
        children: mapNodes(node.children ?? []),
      }))
    return mapNodes(visibleTree)
  }, [visibleTree, inlineId, inlineName])

  const openCreate = (parentId?: string | null) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ parentId: parentId ?? null, sortOrder: 0, isActive: true })
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
    const payload = { ...values, parentId: values.parentId || null }
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

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    const dragId = info.dragNode.key.toString()
    const dropId = info.node.key.toString()
    if (dragId === dropId) return

    const dragged = allCategories.find((item) => item.id === dragId)
    const target = allCategories.find((item) => item.id === dropId)
    if (!dragged || !target) return

    const targetParent = findParent(tree, dropId)
    const dropToGap = info.dropToGap
    const nextParentId = dropToGap ? targetParent?.id ?? null : target.id
    const siblings = dropToGap ? targetParent?.children ?? tree : target.children ?? []

    let index = dropToGap ? siblings.findIndex((item) => item.id === dropId) : siblings.length
    if (dropToGap && info.dropPosition > 0) index += 1

    const reordered = siblings.filter((item) => item.id !== dragId).map((item) => item.id)
    reordered.splice(Math.max(0, index), 0, dragId)

    setReordering(true)
    try {
      await updateCategory(dragId, { parentId: nextParentId, sortOrder: Math.max(0, index) })
      await Promise.all(
        reordered.map((id, sortOrder) =>
          id === dragId ? Promise.resolve() : updateCategory(id, { sortOrder }),
        ),
      )
      message.success('Đã cập nhật vị trí danh mục')
      await load()
    } catch (error) {
      message.error(errorText(error))
      await load()
    } finally {
      setReordering(false)
    }
  }

  const selectedParent = selected?.parentId
    ? allCategories.find((item) => item.id === selected.parentId)
    : null

  return (
    <>
      <div className="glowup-page-header">
        <div>
          <Typography.Title level={2} className="glowup-page-title">
            Quản lý danh mục
          </Typography.Title>
          <Typography.Text className="glowup-page-subtitle">
            Tổ chức cây phân cấp danh mục đa tầng cho toàn bộ sản phẩm mỹ phẩm.
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

      <div className="glowup-stat-strip">
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Tổng danh mục</div>
          <div className="glowup-stat-value">{allCategories.length}</div>
          <div className="glowup-stat-meta">Toàn bộ cấp trong cây danh mục</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Đang hoạt động</div>
          <div className="glowup-stat-value">{activeCount}</div>
          <div className="glowup-stat-meta">Sẵn sàng gán sản phẩm</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Danh mục gốc</div>
          <div className="glowup-stat-value">{tree.length}</div>
          <div className="glowup-stat-meta">Nhánh cấp cao nhất</div>
        </div>
        <div className="glowup-stat-card">
          <div className="glowup-stat-label">Đang ẩn</div>
          <div className="glowup-stat-value">{allCategories.length - activeCount}</div>
          <div className="glowup-stat-meta">Không hiển thị trong catalog</div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            className="glowup-panel"
            loading={loading || reordering}
            title="Cấu trúc cây danh mục"
            extra={<Tag>{tree.length} nhánh</Tag>}
          >
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="Tìm nhanh tên danh mục..."
              value={treeSearch}
              onChange={(event) => setTreeSearch(event.target.value)}
              style={{ marginBottom: 14 }}
            />
            <Tree
              className="glowup-category-tree"
              showIcon
              blockNode
              defaultExpandAll
              draggable
              treeData={treeData}
              selectedKeys={selected ? [selected.id] : []}
              onDrop={handleDrop}
              onSelect={(keys) => {
                const id = keys[0]?.toString()
                setSelected(id ? allCategories.find((item) => item.id === id) ?? null : null)
              }}
            />
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              style={{ marginTop: 14 }}
              onClick={() => openCreate(selected?.id ?? null)}
            >
              {selected ? 'Thêm danh mục con' : 'Thêm danh mục gốc'}
            </Button>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card className="glowup-panel" title="Chi tiết danh mục">
            {selected ? (
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div>
                    <Space size={8} wrap>
                      <Tag color={selected.isActive ? 'green' : 'default'}>
                        {selected.isActive ? 'Đang hoạt động' : 'Đã ẩn'}
                      </Tag>
                      <Typography.Text type="secondary">Mã: {selected.id}</Typography.Text>
                    </Space>
                    <Typography.Title level={3} style={{ margin: '10px 0 2px' }}>
                      {selected.name}
                    </Typography.Title>
                    <Typography.Text type="secondary">/{selected.slug}</Typography.Text>
                  </div>
                  <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEdit(selected)}>
                      Chỉnh sửa
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(selected.id)}>
                      Thêm danh mục con
                    </Button>
                  </Space>
                </div>

                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <div className="glowup-stat-card">
                      <div className="glowup-stat-label">Danh mục cha</div>
                      <div style={{ marginTop: 7, fontWeight: 650 }}>
                        {selectedParent?.name ?? 'Danh mục gốc'}
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div className="glowup-stat-card">
                      <div className="glowup-stat-label">Thứ tự hiển thị</div>
                      <div style={{ marginTop: 7, fontWeight: 650 }}>{selected.sortOrder}</div>
                    </div>
                  </Col>
                </Row>

                <div>
                  <Typography.Text strong>Mô tả</Typography.Text>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 14,
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #EEF2F7',
                      color: '#4B5563',
                      lineHeight: 1.65,
                    }}
                  >
                    {selected.description || 'Chưa có mô tả cho danh mục này.'}
                  </div>
                </div>

                <div>
                  <Typography.Text strong>Xem trước kết quả tìm kiếm</Typography.Text>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 16,
                      borderRadius: 10,
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <div style={{ color: '#16A34A', fontSize: 12 }}>glowup.vn/danh-muc/{selected.slug}</div>
                    <div style={{ color: '#1D4ED8', fontSize: 16, fontWeight: 600, margin: '3px 0' }}>
                      {selected.metaTitle || `${selected.name} | GlowUp`}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.5 }}>
                      {selected.metaDescription || selected.description || 'Thông tin danh mục sản phẩm chính hãng tại GlowUp.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                    <Button danger icon={<DeleteOutlined />}>Ẩn danh mục</Button>
                  </Popconfirm>
                </div>
              </Space>
            ) : (
              <Empty description="Chọn một danh mục trong cây để xem chi tiết" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        confirmLoading={saving}
        width={720}
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
          <Row gutter={14}>
            <Col xs={24} md={12}>
              <Form.Item name="parentId" label="Danh mục cha">
                <Select
                  allowClear
                  placeholder="Danh mục gốc"
                  options={allCategories
                    .filter((item) => item.id !== editing?.id && item.isActive)
                    .map((item) => ({ label: item.name, value: item.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sortOrder" label="Thứ tự hiển thị">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
            <Input maxLength={150} />
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
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh URL" rules={[{ type: 'url' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="metaTitle" label="SEO title">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="metaDescription" label="SEO description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
