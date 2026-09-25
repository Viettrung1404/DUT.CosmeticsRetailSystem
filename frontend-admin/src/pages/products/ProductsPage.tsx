import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
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
import { getBrands } from '../../api/brandsApi'
import { getCategoryTree } from '../../api/categoriesApi'
import {
  createProduct,
  createProductVariant,
  deleteProduct,
  deleteProductVariant,
  getProduct,
  getProducts,
  getProductVariants,
  updateProduct,
  updateProductVariant,
} from '../../api/productsApi'
import { uploadImage } from '../../api/uploadApi'
import RichTextEditor from '../../components/common/RichTextEditor'
import type {
  Brand,
  Category,
  Product,
  ProductImagePayload,
  ProductPayload,
  ProductVariant,
  ProductVariantPayload,
} from '../../types/catalog'

interface ProductFormValues extends Omit<ProductPayload, 'images' | 'variants'> {
  variants?: ProductVariantPayload[]
}

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string | string[]; data?: { message?: string | string[] } }
      | undefined
    const value = body?.message ?? body?.data?.message
    if (Array.isArray(value)) return value.join(', ')
    return value ?? 'Có lỗi xảy ra'
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

function flattenCategories(nodes: Category[]): Category[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])])
}

function money(value?: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductsPage() {
  const [form] = Form.useForm<ProductFormValues>()
  const [variantForm] = Form.useForm<ProductVariantPayload>()
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [brandId, setBrandId] = useState<string>()
  const [status, setStatus] = useState<boolean>()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImagePayload[]>([])

  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [variantLoading, setVariantLoading] = useState(false)
  const [variantOpen, setVariantOpen] = useState(false)
  const [variantEditing, setVariantEditing] = useState<ProductVariant | null>(null)
  const [variantSaving, setVariantSaving] = useState(false)

  const categoryOptions = useMemo(
    () =>
      flattenCategories(categories).map((item) => ({
        label: item.name,
        value: item.id,
        disabled: !item.isActive,
      })),
    [categories],
  )

  const brandOptions = useMemo(
    () =>
      brands.map((item) => ({
        label: item.name,
        value: item.id,
        disabled: !item.isActive,
      })),
    [brands],
  )

  const loadLookups = async () => {
    try {
      const [categoryTree, brandResult] = await Promise.all([
        getCategoryTree(),
        getBrands({ page: 1, limit: 100, order: 'ASC' }),
      ])
      setCategories(categoryTree)
      setBrands(brandResult.data)
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const result = await getProducts({
        page,
        limit,
        search: search || undefined,
        categoryId,
        brandId,
        isActive: status,
      })
      setItems(result.data)
      setTotal(result.meta.itemCount)
      setSelectedIds([])
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLookups()
  }, [])

  useEffect(() => {
    void load()
  }, [page, limit, search, categoryId, brandId, status])

  const openCreate = () => {
    setEditing(null)
    setImages([])
    form.resetFields()
    form.setFieldsValue({
      isActive: true,
      isFeatured: false,
      variants: [
        {
          sku: '',
          price: 0,
          costPrice: 0,
          isActive: true,
        },
      ],
    })
    setOpen(true)
  }

  const openEdit = async (row: Product) => {
    setSaving(true)
    try {
      const product = await getProduct(row.id)
      setEditing(product)
      setImages(
        (product.images ?? []).map((image, index) => ({
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder ?? index,
          isPrimary: image.isPrimary,
        })),
      )
      form.setFieldsValue({
        categoryId: product.categoryId,
        brandId: product.brandId ?? null,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        option1Name: product.option1Name,
        option2Name: product.option2Name,
        option3Name: product.option3Name,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
      })
      setOpen(true)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const uploadProductImage = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.warning('Chỉ hỗ trợ JPG, PNG hoặc WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.warning('Ảnh tối đa 5 MB')
      return
    }

    setUploadingImages(true)
    try {
      const url = await uploadImage(file, 'products')
      setImages((current) => [
        ...current,
        {
          imageUrl: url,
          altText: form.getFieldValue('name') || file.name,
          sortOrder: current.length,
          isPrimary: current.length === 0,
        },
      ])
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setUploadingImages(false)
    }
  }

  const saveProduct = async () => {
    const values = await form.validateFields()
    if (!editing && (!values.variants || values.variants.length < 1)) {
      message.warning('Sản phẩm phải có ít nhất một biến thể')
      return
    }

    const normalizedImages = images.map((image, index) => ({
      ...image,
      sortOrder: index,
      isPrimary: image.isPrimary || (index === 0 && !images.some((item) => item.isPrimary)),
    }))

    setSaving(true)
    try {
      if (editing) {
        const { variants: _variants, ...updateValues } = values
        await updateProduct(editing.id, {
          ...updateValues,
          brandId: updateValues.brandId || null,
          salePrice: updateValues.salePrice ?? null,
          images: normalizedImages,
        })
        message.success('Cập nhật sản phẩm thành công')
      } else {
        await createProduct({
          ...values,
          brandId: values.brandId || null,
          salePrice: values.salePrice ?? null,
          variants: values.variants ?? [],
          images: normalizedImages,
        })
        message.success('Thêm sản phẩm thành công')
      }
      setOpen(false)
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const bulkSetStatus = async (isActive: boolean) => {
    if (!selectedIds.length) return
    setLoading(true)
    try {
      await Promise.all(selectedIds.map((id) => updateProduct(id, { isActive })))
      message.success(
        isActive
          ? `Đã bật ${selectedIds.length} sản phẩm`
          : `Đã ngừng kinh doanh ${selectedIds.length} sản phẩm`,
      )
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }

  const loadVariants = async (product: Product) => {
    setVariantProduct(product)
    setVariantLoading(true)
    try {
      const result = await getProductVariants(product.id)
      setVariants(result)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setVariantLoading(false)
    }
  }

  const openVariants = async (product: Product) => {
    await loadVariants(product)
  }

  const openVariantCreate = () => {
    if (!variantProduct) return
    setVariantEditing(null)
    variantForm.resetFields()
    variantForm.setFieldsValue({
      price: variantProduct.salePrice ?? variantProduct.basePrice,
      costPrice: 0,
      isActive: true,
    })
    setVariantOpen(true)
  }

  const openVariantEdit = (variant: ProductVariant) => {
    setVariantEditing(variant)
    variantForm.setFieldsValue({
      sku: variant.sku,
      barcode: variant.barcode,
      option1Value: variant.option1Value,
      option2Value: variant.option2Value,
      option3Value: variant.option3Value,
      price: variant.price,
      costPrice: variant.costPrice ?? 0,
      weight: variant.weight,
      unit: variant.unit,
      isActive: variant.isActive ?? true,
    })
    setVariantOpen(true)
  }

  const saveVariant = async () => {
    if (!variantProduct) return
    const values = await variantForm.validateFields()
    setVariantSaving(true)
    try {
      if (variantEditing?.id) {
        await updateProductVariant(variantEditing.id, values)
        message.success('Cập nhật biến thể thành công')
      } else {
        await createProductVariant(variantProduct.id, values)
        message.success('Thêm biến thể thành công')
      }
      setVariantOpen(false)
      await loadVariants(variantProduct)
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setVariantSaving(false)
    }
  }

  const columns = useMemo<ColumnsType<Product>>(
    () => [
      {
        title: 'Sản phẩm',
        dataIndex: 'name',
        width: 310,
        render: (_, row) => (
          <Space>
            {row.primaryImage ? (
              <Image
                src={row.primaryImage}
                width={52}
                height={52}
                preview={false}
                style={{ objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f5f5f5' }} />
            )}
            <div>
              <Typography.Text strong>{row.name}</Typography.Text>
              <br />
              <Typography.Text type="secondary">{row.sku}</Typography.Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Danh mục',
        dataIndex: 'categoryName',
        render: (value) => value || '—',
      },
      {
        title: 'Thương hiệu',
        dataIndex: 'brandName',
        render: (value) => value || '—',
      },
      {
        title: 'Giá',
        key: 'price',
        width: 150,
        render: (_, row) => (
          <div>
            <div>{money(row.salePrice ?? row.basePrice)}</div>
            {row.salePrice != null && (
              <Typography.Text delete type="secondary">
                {money(row.basePrice)}
              </Typography.Text>
            )}
          </div>
        ),
      },
      {
        title: 'Biến thể',
        key: 'variants',
        width: 90,
        align: 'center',
        render: (_, row) => row.variants?.length ?? 0,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        width: 130,
        render: (value) => value ? <Tag color="green">Đang bán</Tag> : <Tag>Đã ẩn</Tag>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 180,
        fixed: 'right',
        render: (_, row) => (
          <Space>
            <Button
              type="text"
              title="Biến thể"
              icon={<TagsOutlined />}
              onClick={() => void openVariants(row)}
            />
            <Button
              type="text"
              title="Sửa"
              icon={<EditOutlined />}
              onClick={() => void openEdit(row)}
            />
            <Popconfirm
              title="Ngừng kinh doanh sản phẩm?"
              onConfirm={async () => {
                try {
                  await deleteProduct(row.id)
                  message.success('Đã ngừng kinh doanh sản phẩm')
                  await load()
                } catch (error) {
                  message.error(errorText(error))
                }
              }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} disabled={!row.isActive} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  )

  const optionNames = Form.useWatch([], form)
  const watchedOption1 = optionNames?.option1Name
  const watchedOption2 = optionNames?.option2Name
  const watchedOption3 = optionNames?.option3Name

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Quản lý sản phẩm
          </Typography.Title>
          <Typography.Text type="secondary">
            Danh sách, lọc, bulk action, tạo/sửa sản phẩm, ảnh, SEO và quản lý biến thể.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm tên hoặc SKU"
            style={{ width: 250 }}
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
            showSearch
            optionFilterProp="label"
            placeholder="Danh mục"
            style={{ width: 190 }}
            options={categoryOptions}
            onChange={(value) => {
              setPage(1)
              setCategoryId(value)
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Thương hiệu"
            style={{ width: 190 }}
            options={brandOptions}
            onChange={(value) => {
              setPage(1)
              setBrandId(value)
            }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 150 }}
            options={[
              { label: 'Đang bán', value: true },
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

        {selectedIds.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Space wrap>
              <Typography.Text>Đã chọn {selectedIds.length} sản phẩm</Typography.Text>
              <Button onClick={() => void bulkSetStatus(true)}>Bật kinh doanh</Button>
              <Button danger onClick={() => void bulkSetStatus(false)}>Ngừng kinh doanh</Button>
            </Space>
          </>
        )}
      </Card>

      <Table<Product>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1150 }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys.map(String)),
        }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          showTotal: (value) => `Tổng ${value} sản phẩm`,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage)
            setLimit(nextLimit)
          },
        }}
      />

      <Modal
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void saveProduct()}
        confirmLoading={saving}
        width={1050}
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
          <Typography.Title level={5}>Thông tin cơ bản</Typography.Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}>
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[
                  { required: true, message: 'Nhập slug' },
                  { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug không hợp lệ' },
                ]}
              >
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="sku" label="SKU sản phẩm" rules={[{ required: true, message: 'Nhập SKU' }]}>
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                <Select showSearch optionFilterProp="label" options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="brandId" label="Thương hiệu">
                <Select allowClear showSearch optionFilterProp="label" options={brandOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="basePrice" label="Giá gốc" rules={[{ required: true, message: 'Nhập giá gốc' }]}>
                <InputNumber min={0} style={{ width: '100%' }} addonAfter="₫" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="salePrice" label="Giá khuyến mãi">
                <InputNumber min={0} style={{ width: '100%' }} addonAfter="₫" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="isActive" label="Đang bán" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="isFeatured" label="Nổi bật" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="shortDescription" label="Mô tả ngắn">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả chi tiết">
            <RichTextEditor />
          </Form.Item>

          <Divider />
          <Typography.Title level={5}>Hình ảnh</Typography.Title>
          <Upload.Dragger
            multiple
            accept="image/jpeg,image/png,image/webp"
            showUploadList={false}
            disabled={uploadingImages}
            beforeUpload={(file) => {
              void uploadProductImage(file as File)
              return false
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Kéo thả hoặc bấm để upload nhiều ảnh</p>
            <p className="ant-upload-hint">JPG / PNG / WEBP, tối đa 5 MB mỗi ảnh</p>
          </Upload.Dragger>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {images.map((image, index) => (
              <Card key={`${image.imageUrl}-${index}`} size="small" style={{ width: 150 }}>
                <Image src={image.imageUrl} width="100%" height={90} style={{ objectFit: 'cover' }} />
                <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                  <Button
                    size="small"
                    type={image.isPrimary ? 'primary' : 'default'}
                    block
                    onClick={() =>
                      setImages((current) =>
                        current.map((item, itemIndex) => ({
                          ...item,
                          isPrimary: itemIndex === index,
                        })),
                      )
                    }
                  >
                    {image.isPrimary ? 'Ảnh chính' : 'Đặt ảnh chính'}
                  </Button>
                  <Button
                    size="small"
                    danger
                    block
                    onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Xóa
                  </Button>
                </Space>
              </Card>
            ))}
          </div>

          <Divider />
          <Typography.Title level={5}>Thuộc tính & biến thể</Typography.Title>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="option1Name" label="Thuộc tính 1" tooltip="Ví dụ: Màu sắc">
                <Input placeholder="Màu sắc" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="option2Name" label="Thuộc tính 2" tooltip="Ví dụ: Dung tích">
                <Input placeholder="Dung tích" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="option3Name" label="Thuộc tính 3">
                <Input maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          {editing ? (
            <Typography.Text type="secondary">
              Biến thể của sản phẩm đã tồn tại được quản lý bằng nút thẻ (🏷) ở danh sách sản phẩm.
            </Typography.Text>
          ) : (
            <Form.List name="variants">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      title={`Biến thể #${index + 1}`}
                      extra={
                        fields.length > 1 ? (
                          <Button danger type="text" onClick={() => remove(field.name)}>Xóa</Button>
                        ) : null
                      }
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={6}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'sku']}
                            label="SKU"
                            rules={[{ required: true, message: 'Nhập SKU biến thể' }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item {...field} name={[field.name, 'barcode']} label="Mã vạch">
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'price']}
                            label="Giá bán"
                            rules={[{ required: true, message: 'Nhập giá bán' }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'costPrice']}
                            label="Giá vốn"
                            rules={[{ required: true, message: 'Nhập giá vốn' }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        {watchedOption1 && (
                          <Col xs={24} md={8}>
                            <Form.Item {...field} name={[field.name, 'option1Value']} label={watchedOption1}>
                              <Input />
                            </Form.Item>
                          </Col>
                        )}
                        {watchedOption2 && (
                          <Col xs={24} md={8}>
                            <Form.Item {...field} name={[field.name, 'option2Value']} label={watchedOption2}>
                              <Input />
                            </Form.Item>
                          </Col>
                        )}
                        {watchedOption3 && (
                          <Col xs={24} md={8}>
                            <Form.Item {...field} name={[field.name, 'option3Value']} label={watchedOption3}>
                              <Input />
                            </Form.Item>
                          </Col>
                        )}
                        <Col xs={12} md={6}>
                          <Form.Item {...field} name={[field.name, 'weight']} label="Khối lượng">
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item {...field} name={[field.name, 'unit']} label="Đơn vị">
                            <Input placeholder="g, ml..." />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Item {...field} name={[field.name, 'isActive']} label="Đang bán" valuePropName="checked">
                            <Switch defaultChecked />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ price: 0, costPrice: 0, isActive: true })}>
                    Thêm biến thể
                  </Button>
                </Space>
              )}
            </Form.List>
          )}

          <Divider />
          <Typography.Title level={5}>SEO</Typography.Title>
          <Form.Item name="metaTitle" label="Meta title">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="metaDescription" label="Meta description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="metaKeywords" label="Meta keywords">
            <Input maxLength={255} placeholder="son môi, mỹ phẩm, ..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={variantProduct ? `Biến thể — ${variantProduct.name}` : 'Biến thể'}
        open={!!variantProduct}
        onCancel={() => setVariantProduct(null)}
        footer={null}
        width={920}
        destroyOnHidden
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openVariantCreate}>
            Thêm biến thể
          </Button>
        </div>
        <Table<ProductVariant>
          rowKey={(row) => row.id ?? row.sku}
          loading={variantLoading}
          dataSource={variants}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            { title: 'SKU', dataIndex: 'sku' },
            { title: 'Mã vạch', dataIndex: 'barcode', render: (value) => value || '—' },
            {
              title: 'Thuộc tính',
              key: 'options',
              render: (_, row) => [row.option1Value, row.option2Value, row.option3Value].filter(Boolean).join(' / ') || '—',
            },
            { title: 'Giá bán', dataIndex: 'price', render: money },
            { title: 'Tồn kho', dataIndex: 'stockQuantity', width: 90 },
            {
              title: 'Trạng thái',
              dataIndex: 'isActive',
              render: (value) => value ? <Tag color="green">Đang bán</Tag> : <Tag>Đã ẩn</Tag>,
            },
            {
              title: 'Thao tác',
              key: 'actions',
              render: (_, row) => (
                <Space>
                  <Button type="text" icon={<EditOutlined />} onClick={() => openVariantEdit(row)} />
                  <Popconfirm
                    title="Ngừng bán biến thể?"
                    onConfirm={async () => {
                      if (!row.id || !variantProduct) return
                      try {
                        await deleteProductVariant(row.id)
                        message.success('Đã ngừng bán biến thể')
                        await loadVariants(variantProduct)
                      } catch (error) {
                        message.error(errorText(error))
                      }
                    }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} disabled={!row.isActive} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={variantEditing ? 'Sửa biến thể' : 'Thêm biến thể'}
        open={variantOpen}
        onCancel={() => setVariantOpen(false)}
        onOk={() => void saveVariant()}
        confirmLoading={variantSaving}
        width={720}
        destroyOnHidden
      >
        <Form form={variantForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="sku" label="SKU biến thể" rules={[{ required: true, message: 'Nhập SKU' }]}>
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="barcode" label="Mã vạch">
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            {variantProduct?.option1Name && (
              <Col xs={24} md={8}>
                <Form.Item name="option1Value" label={variantProduct.option1Name}>
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
            )}
            {variantProduct?.option2Name && (
              <Col xs={24} md={8}>
                <Form.Item name="option2Value" label={variantProduct.option2Name}>
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
            )}
            {variantProduct?.option3Name && (
              <Col xs={24} md={8}>
                <Form.Item name="option3Value" label={variantProduct.option3Name}>
                  <Input maxLength={100} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={12}>
              <Form.Item name="price" label="Giá bán" rules={[{ required: true, message: 'Nhập giá bán' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="costPrice" label="Giá vốn" rules={[{ required: true, message: 'Nhập giá vốn' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="weight" label="Khối lượng">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="unit" label="Đơn vị">
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="isActive" label="Đang bán" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
