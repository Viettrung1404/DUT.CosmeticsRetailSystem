import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, money, type Page } from '../../api/sprint5Api'
interface Promo { id:string; name:string; description:string|null; type:Values['type']; value:number; startDate:string; endDate:string; minOrderAmount:number; maxDiscountAmount:number|null; isFlashSale:boolean; isActive:boolean; usedCount:number; usageLimit:number|null; applicableProducts:string[]|null; applicableCategories:string[]|null }
interface Values {name:string;description?:string;type:'PERCENTAGE'|'FIXED_AMOUNT'|'FREE_SHIPPING';value:number;dates:[dayjs.Dayjs,dayjs.Dayjs];minOrderAmount?:number;maxDiscountAmount?:number;isFlashSale?:boolean;usageLimit?:number;applicableProducts?:string[];applicableCategories?:string[]}
const {Title,Text}=Typography
export default function PromotionsPage(){
 const [msg,holder]=message.useMessage(),[rows,setRows]=useState<Promo[]>([]),[total,setTotal]=useState(0)
 const [query,setQuery]=useState({page:1,limit:20,search:undefined as string|undefined}),[search,setSearch]=useState('')
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[editor,setEditor]=useState<Promo|'new'|null>(null)
 const [form]=Form.useForm<Values>()
 const load=useCallback(async()=>{setLoading(true);try{const r=await apiGet<Page<Promo>>('/admin/promotions',query);setRows(r.data??[]);setTotal(r.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[msg,query])
 useEffect(()=>{void load()},[load])
 const open=(row:Promo|'new')=>{setEditor(row);form.resetFields();if(row==='new')form.setFieldsValue({type:'PERCENTAGE',value:10,dates:[dayjs(),dayjs().add(7,'day')],isFlashSale:false});else form.setFieldsValue({name:row.name,description:row.description??undefined,type:row.type,value:row.value,dates:[dayjs(row.startDate),dayjs(row.endDate)],minOrderAmount:row.minOrderAmount,maxDiscountAmount:row.maxDiscountAmount??undefined,usageLimit:row.usageLimit??undefined,isFlashSale:row.isFlashSale,applicableProducts:row.applicableProducts??[],applicableCategories:row.applicableCategories??[]})}
 const save=async()=>{try{const v=await form.validateFields();if(v.dates[1].isBefore(v.dates[0])){msg.error('Ngày kết thúc phải sau ngày bắt đầu');return}
 setBusy(true);const {dates,...values}=v;const payload={...values,startDate:dates[0].toISOString(),endDate:dates[1].toISOString()}
 if(editor==='new')await apiPost('/admin/promotions',payload);else if(editor)await apiPut(`/admin/promotions/${editor.id}`,payload)
 msg.success('Đã lưu chương trình khuyến mãi');setEditor(null);await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 const change=async(row:Promo)=>{try{await apiPut(`/admin/promotions/${row.id}/${row.isActive?'deactivate':'activate'}`);msg.success('Đã cập nhật trạng thái');await load()}catch(e){msg.error(errorText(e))}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Chương trình khuyến mãi</Title><Text className="glowup-page-subtitle">Thiết lập ưu đãi; Backend tính giá áp dụng khi đơn hàng đủ điều kiện.</Text></div>
 <Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>open('new')}>Tạo khuyến mãi</Button></Space></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Input.Search style={{width:280}} placeholder="Tên chương trình" value={search} onChange={e=>setSearch(e.target.value)} onSearch={()=>setQuery(q=>({...q,page:1,search:search||undefined}))}/></Card>
 <Card className="glowup-table-card"><Table<Promo> rowKey="id" loading={loading} dataSource={rows} scroll={{x:1000}}
 pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Chương trình',dataIndex:'name'},{title:'Loại',dataIndex:'type'},{title:'Giá trị',render:(_,r)=>r.type==='PERCENTAGE'?`${r.value}%`:money(r.value)},
 {title:'Bắt đầu',dataIndex:'startDate',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},{title:'Kết thúc',dataIndex:'endDate',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},
 {title:'Đã dùng',dataIndex:'usedCount'},{title:'Trạng thái',dataIndex:'isActive',render:(v:boolean)=><Tag color={v?'green':'default'}>{v?'Đang bật':'Đã tắt'}</Tag>},
 {title:'Thao tác',render:(_,r)=><Space><Button onClick={()=>open(r)}>Sửa</Button><Popconfirm title="Đổi trạng thái chương trình?" onConfirm={()=>void change(r)}><Button danger={r.isActive}>{r.isActive?'Tắt':'Bật'}</Button></Popconfirm></Space>}]} /></Card>
 <Modal open={editor!==null} title={editor==='new'?'Tạo khuyến mãi':'Sửa khuyến mãi'} onCancel={()=>setEditor(null)} onOk={()=>void save()} okText="Lưu" confirmLoading={busy} width={780}>
 <Form form={form} layout="vertical">
 <Form.Item name="name" label="Tên chương trình" rules={[{required:true,min:2}]}><Input maxLength={200}/></Form.Item>
 <Form.Item name="description" label="Mô tả"><Input.TextArea maxLength={2000}/></Form.Item>
 <Space wrap align="start">
 <Form.Item name="type" label="Loại giảm" rules={[{required:true}]}><Select style={{width:185}} options={['PERCENTAGE','FIXED_AMOUNT','FREE_SHIPPING'].map(v=>({label:v,value:v}))}/></Form.Item>
 <Form.Item name="value" label="Giá trị" rules={[{required:true}]}><InputNumber min={0} precision={2}/></Form.Item>
 <Form.Item name="dates" label="Hiệu lực" rules={[{required:true}]}><DatePicker.RangePicker showTime/></Form.Item></Space>
 <Space wrap align="start"><Form.Item name="minOrderAmount" label="Đơn tối thiểu"><InputNumber min={0}/></Form.Item>
 <Form.Item name="maxDiscountAmount" label="Giảm tối đa"><InputNumber min={0}/></Form.Item>
 <Form.Item name="usageLimit" label="Giới hạn sử dụng"><InputNumber min={1} precision={0}/></Form.Item>
 <Form.Item name="isFlashSale" label="Flash sale" valuePropName="checked"><Switch/></Form.Item></Space>
 <Form.Item name="applicableProducts" label="UUID sản phẩm áp dụng (để trống: tất cả)" tooltip="Chọn hoặc nhập UUID sản phẩm đã tồn tại"><Select mode="tags" tokenSeparators={[',',' ']} placeholder="UUID sản phẩm"/></Form.Item>
 <Form.Item name="applicableCategories" label="UUID danh mục áp dụng"><Select mode="tags" tokenSeparators={[',',' ']} placeholder="UUID danh mục"/></Form.Item>
 </Form></Modal></div>
}
