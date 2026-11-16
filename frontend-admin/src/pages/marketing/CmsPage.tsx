import { Button, Card, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import RichTextEditor from '../../components/common/RichTextEditor'
import { apiDelete, apiGet, apiPost, apiPut, errorText, type Page } from '../../api/sprint5Api'
type Mode='pages'|'faqs'|'banners'
interface Item { id:string; title?:string;slug?:string;content?:string;metaTitle?:string;metaDescription?:string;isPublished?:boolean;question?:string;answer?:string;category?:string;isActive?:boolean;sortOrder?:number;imageUrl?:string;linkUrl?:string;position?:string;startDate?:string|null;endDate?:string|null }
const {Title,Text}=Typography
const labels={pages:'Trang nội dung',faqs:'Câu hỏi thường gặp',banners:'Banner quảng cáo'}
function buildPayload(mode:Mode,v:Record<string,unknown>){
 const x={...v};delete x.dates
 if(mode==='banners'&&Array.isArray(v.dates)){const dates=v.dates as dayjs.Dayjs[];x.startDate=dates[0]?.toISOString();x.endDate=dates[1]?.toISOString()}
 return x
}
export default function CmsPage({mode}:{mode:Mode}){
 const [msg,holder]=message.useMessage(),[query,setQuery]=useState({page:1,limit:20})
 const [items,setItems]=useState<Item[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[editor,setEditor]=useState<Item|'new'|null>(null)
 const [form]=Form.useForm()
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Item>>(`/admin/${mode}`,query);setItems(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[msg,mode,query])
 useEffect(()=>{void load()},[load])
 const open=async(row:Item|'new')=>{form.resetFields();if(row==='new'){setEditor('new');form.setFieldsValue({isActive:true,isPublished:false,position:'HOME_HERO',sortOrder:0});return}
 try{const detail=await apiGet<Item>(`/admin/${mode}/${row.id}`);setEditor(detail);form.setFieldsValue({...detail,dates:detail.startDate&&detail.endDate?[dayjs(detail.startDate),dayjs(detail.endDate)]:undefined})}catch(e){msg.error(errorText(e))}
 }
 const save=async()=>{try{const v=await form.validateFields();setBusy(true);const body=buildPayload(mode,v)
 if(editor==='new')await apiPost(`/admin/${mode}`,body);else if(editor)await apiPut(`/admin/${mode}/${editor.id}`,body)
 msg.success('Đã lưu thành công');setEditor(null);await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 const remove=async(row:Item)=>{try{await apiDelete(`/admin/${mode}/${row.id}`);msg.success('Đã xóa');await load()}catch(e){msg.error(errorText(e))}}
 const move=async(row:Item,offset:number)=>{const pos=items.findIndex(x=>x.id===row.id),dest=pos+offset;if(dest<0||dest>=items.length)return
 const next=[...items];[next[pos],next[dest]]=[next[dest],next[pos]]
 try{await apiPut(`/admin/${mode}/reorder`,{ids:next.map(i=>i.id)});msg.success('Đã cập nhật vị trí');await load()}catch(e){msg.error(errorText(e))}}
 return <div>{holder}
 <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">{labels[mode]}</Title><Text className="glowup-page-subtitle">Quản trị nội dung hiển thị trên website và ứng dụng khách hàng.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>void open('new')}>Thêm mới</Button></Space></div>
 <Card className="glowup-table-card"><Table<Item> rowKey="id" loading={loading} dataSource={items} scroll={{x:850}}
 pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Tên / nội dung',render:(_,r)=><div><strong>{r.title??r.question??r.position??'Không có tiêu đề'}</strong><div><Text type="secondary">{r.slug??r.category??r.linkUrl??''}</Text></div></div>},
 {title:'Trạng thái',render:(_,r)=><Tag color={r.isPublished||r.isActive?'green':'default'}>{r.isPublished?'Đã đăng':r.isActive?'Đang bật':'Nháp / ẩn'}</Tag>},
 {title:'Thao tác',render:(_,r)=><Space wrap><Button size="small" onClick={()=>void open(r)}>Sửa</Button>
 {mode!=='pages'&&<><Button size="small" onClick={()=>void move(r,-1)}>↑</Button><Button size="small" onClick={()=>void move(r,1)}>↓</Button></>}
 <Popconfirm title="Xóa nội dung này?" onConfirm={()=>void remove(r)}><Button size="small" danger>Xóa</Button></Popconfirm></Space>}]} /></Card>
 <Modal open={editor!==null} title={editor==='new'?'Tạo nội dung':'Sửa nội dung'} onCancel={()=>setEditor(null)} onOk={()=>void save()} okText="Lưu" confirmLoading={busy} width={820} destroyOnHidden>
 <Form form={form} layout="vertical">
 {mode==='pages'?<>
 <Form.Item label="Tiêu đề trang" name="title" rules={[{required:true,min:2}]}><Input maxLength={255}/></Form.Item>
 <Form.Item label="Slug" name="slug"><Input maxLength={255}/></Form.Item>
 <Form.Item label="Nội dung trang" name="content" rules={[{required:true,message:'Nhập nội dung'}]}><RichTextEditor minHeight={260}/></Form.Item>
 <Form.Item label="Tiêu đề SEO" name="metaTitle"><Input maxLength={255}/></Form.Item>
 <Form.Item label="Mô tả SEO" name="metaDescription"><Input.TextArea maxLength={500}/></Form.Item>
 <Form.Item name="isPublished" valuePropName="checked"><Checkbox>Xuất bản trang</Checkbox></Form.Item>
 </>:mode==='faqs'?<>
 <Form.Item label="Câu hỏi" name="question" rules={[{required:true,min:5}]}><Input maxLength={500}/></Form.Item>
 <Form.Item label="Câu trả lời" name="answer" rules={[{required:true}]}><Input.TextArea rows={5}/></Form.Item>
 <Form.Item label="Nhóm FAQ" name="category"><Input maxLength={100}/></Form.Item>
 <Form.Item label="Thứ tự" name="sortOrder"><InputNumber min={0} precision={0}/></Form.Item>
 <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hiển thị</Checkbox></Form.Item>
 </>:<>
 <Form.Item label="Tiêu đề" name="title"><Input maxLength={150}/></Form.Item>
 <Form.Item label="URL ảnh banner" name="imageUrl" rules={[{required:true,message:'Nhập URL ảnh đã tải lên'}]}><Input placeholder="https://..."/></Form.Item>
 <Form.Item label="Link khi bấm" name="linkUrl"><Input maxLength={1000}/></Form.Item>
 <Form.Item label="Vị trí" name="position" rules={[{required:true},{pattern:/^[A-Z_]{2,50}$/,message:'Ví dụ HOME_HERO'}]}><Select options={['HOME_HERO','HOME_MIDDLE','PRODUCT_LIST'].map(x=>({value:x,label:x}))} showSearch allowClear/></Form.Item>
 <Form.Item label="Thời gian hiển thị" name="dates"><DatePicker.RangePicker showTime/></Form.Item>
 <Form.Item label="Thứ tự" name="sortOrder"><InputNumber min={0} precision={0}/></Form.Item>
 <Form.Item name="isActive" valuePropName="checked"><Checkbox>Đang bật</Checkbox></Form.Item>
 </>}
 </Form></Modal></div>
}
