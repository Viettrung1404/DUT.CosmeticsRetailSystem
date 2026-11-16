import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import RichTextEditor from '../../components/common/RichTextEditor'
import { apiDelete, apiGet, apiPost, apiPut, errorText, type Page } from '../../api/sprint5Api'
interface Post {id:string;title:string;slug:string;content:string;status:string;excerpt:string|null;featuredImage:string|null;blogCategoryId:string|null;metaTitle:string|null;metaDescription:string|null;createdAt:string}
interface Category {id:string;name:string;slug:string;description:string|null}
const {Title,Text}=Typography
export default function BlogPage(){
 const [msg,holder]=message.useMessage()
 const [query,setQuery]=useState({page:1,limit:20,status:undefined as string|undefined,search:undefined as string|undefined}),[search,setSearch]=useState('')
 const [rows,setRows]=useState<Post[]>([]),[total,setTotal]=useState(0),[categories,setCategories]=useState<Category[]>([])
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[editor,setEditor]=useState<Post|'new'|null>(null)
 const [schedule,setSchedule]=useState<Post|null>(null),[publishAt,setPublishAt]=useState<dayjs.Dayjs|null>(null)
 const [catOpen,setCatOpen]=useState(false),[catName,setCatName]=useState('')
 const [form]=Form.useForm()
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Post>>('/admin/blog/posts',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 const loadCategories=useCallback(async()=>{try{const p=await apiGet<Page<Category>>('/admin/blog/categories',{page:1,limit:100});setCategories(p.data??[])}catch(e){msg.error(errorText(e))}},[msg])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{void loadCategories()},[loadCategories])
 const open=async(row:Post|'new')=>{form.resetFields();if(row==='new'){setEditor('new');return}try{const p=await apiGet<Post>(`/admin/blog/posts/${row.id}`);setEditor(p);form.setFieldsValue(p)}catch(e){msg.error(errorText(e))}}
 const save=async()=>{try{const values=await form.validateFields();setBusy(true);if(editor==='new')await apiPost('/admin/blog/posts',values);else if(editor)await apiPut(`/admin/blog/posts/${editor.id}`,values);msg.success('Đã lưu bài viết');setEditor(null);await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 const action=async(post:Post,kind:'publish'|'archive')=>{try{await apiPut(`/admin/blog/posts/${post.id}/${kind}`);msg.success('Đã cập nhật trạng thái bài');await load()}catch(e){msg.error(errorText(e))}}
 const plan=async()=>{if(!schedule||!publishAt)return;try{setBusy(true);await apiPut(`/admin/blog/posts/${schedule.id}/schedule`,{publishAt:publishAt.toISOString()});msg.success('Đã hẹn giờ đăng');setSchedule(null);await load()}catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 const deletePost=async(post:Post)=>{try{await apiDelete(`/admin/blog/posts/${post.id}`);msg.success('Đã xóa bài nháp');await load()}catch(e){msg.error(errorText(e))}}
 const addCategory=async()=>{if(catName.trim().length<2)return;try{await apiPost('/admin/blog/categories',{name:catName.trim()});setCatName('');setCatOpen(false);await loadCategories();msg.success('Đã tạo danh mục')}catch(e){msg.error(errorText(e))}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Quản lý Blog</Title><Text className="glowup-page-subtitle">Soạn bài, chỉnh sửa SEO và lên lịch xuất bản.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button onClick={()=>setCatOpen(true)}>Danh mục blog</Button><Button type="primary" onClick={()=>void open('new')}>Viết bài</Button></Space></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Space wrap>
 <Input.Search value={search} onChange={e=>setSearch(e.target.value)} onSearch={()=>setQuery(q=>({...q,page:1,search:search||undefined}))} style={{width:280}} placeholder="Tìm bài viết"/>
 <Select value={query.status} allowClear placeholder="Trạng thái" style={{width:170}} options={['DRAFT','SCHEDULED','PUBLISHED','ARCHIVED'].map(x=>({value:x,label:x}))} onChange={status=>setQuery(q=>({...q,page:1,status}))}/></Space></Card>
 <Card className="glowup-table-card"><Table<Post> rowKey="id" loading={loading} dataSource={rows} scroll={{x:1050}} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Bài viết',render:(_,r)=><div><strong>{r.title}</strong><div><Text type="secondary">{r.slug}</Text></div></div>},
 {title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag color={v==='PUBLISHED'?'green':v==='SCHEDULED'?'blue':'default'}>{v}</Tag>},
 {title:'Ngày tạo',dataIndex:'createdAt',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},
 {title:'Thao tác',render:(_,r)=><Space wrap><Button onClick={()=>void open(r)}>Sửa</Button>
 {r.status==='DRAFT'&&<><Popconfirm title="Đăng bài ngay?" onConfirm={()=>void action(r,'publish')}><Button type="primary">Đăng</Button></Popconfirm>
 <Button onClick={()=>{setSchedule(r);setPublishAt(dayjs().add(1,'day'))}}>Hẹn giờ</Button>
 <Popconfirm title="Xóa bản nháp?" onConfirm={()=>void deletePost(r)}><Button danger>Xóa</Button></Popconfirm></>}
 {['PUBLISHED','SCHEDULED'].includes(r.status)&&<Popconfirm title="Lưu trữ bài này?" onConfirm={()=>void action(r,'archive')}><Button>Gỡ bài</Button></Popconfirm>}</Space>}]} /></Card>
 <Modal title={editor==='new'?'Viết bài Blog':'Sửa bài viết'} open={editor!==null} width={920} onCancel={()=>setEditor(null)} onOk={()=>void save()} okText="Lưu nháp / cập nhật" confirmLoading={busy} destroyOnHidden>
 <Form form={form} layout="vertical">
 <Form.Item name="title" label="Tiêu đề" rules={[{required:true,min:3}]}><Input maxLength={255}/></Form.Item>
 <Form.Item name="slug" label="Slug (tự sinh nếu để trống)"><Input maxLength={255}/></Form.Item>
 <Form.Item name="blogCategoryId" label="Danh mục blog"><Select allowClear options={categories.map(x=>({value:x.id,label:x.name}))}/></Form.Item>
 <Form.Item name="content" label="Nội dung" rules={[{required:true,message:'Nhập nội dung bài viết'}]}><RichTextEditor minHeight={300}/></Form.Item>
 <Form.Item name="excerpt" label="Tóm tắt"><Input.TextArea maxLength={1000}/></Form.Item>
 <Form.Item name="featuredImage" label="URL ảnh đại diện"><Input maxLength={1000}/></Form.Item>
 <Form.Item name="metaTitle" label="SEO title"><Input maxLength={255}/></Form.Item>
 <Form.Item name="metaDescription" label="SEO description"><Input.TextArea maxLength={500}/></Form.Item>
 </Form></Modal>
 <Modal title="Lên lịch đăng bài" open={Boolean(schedule)} onCancel={()=>setSchedule(null)} onOk={()=>void plan()} okText="Hẹn giờ" confirmLoading={busy}>
 <DatePicker showTime value={publishAt} onChange={setPublishAt} disabledDate={d=>d.isBefore(dayjs().startOf('day'))}/></Modal>
 <Modal title="Thêm danh mục Blog" open={catOpen} onCancel={()=>setCatOpen(false)} onOk={()=>void addCategory()} okText="Thêm">
 <Input value={catName} onChange={e=>setCatName(e.target.value)} maxLength={150} placeholder="Tên danh mục"/></Modal>
 </div>
}
