import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, errorText, money, type Page } from '../../api/sprint5Api'
interface Coupon {id:string;code:string;discountType:string;discountValue:number;usedCount:number;maxUses:number|null;isActive:boolean;startDate:string;endDate:string}
interface Values {code?:string;discountType:string;discountValue:number;dates:[dayjs.Dayjs,dayjs.Dayjs];maxUses?:number;maxUsesPerCustomer?:number;minOrderAmount?:number;quantity?:number;prefix?:string}
const {Title,Text}=Typography
export default function CouponsPage(){
 const [msg,holder]=message.useMessage(),[rows,setRows]=useState<Coupon[]>([]),[total,setTotal]=useState(0)
 const [query,setQuery]=useState({page:1,limit:20,search:undefined as string|undefined}),[search,setSearch]=useState('')
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[mode,setMode]=useState<'one'|'bulk'|null>(null)
 const [form]=Form.useForm<Values>()
 const load=useCallback(async()=>{setLoading(true);try{const r=await apiGet<Page<Coupon>>('/admin/coupons',query);setRows(r.data??[]);setTotal(r.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const open=(m:'one'|'bulk')=>{form.resetFields();form.setFieldsValue({discountType:'PERCENTAGE',discountValue:10,dates:[dayjs(),dayjs().add(30,'day')],maxUsesPerCustomer:1,...(m==='bulk'?{quantity:10}: {})});setMode(m)}
 const save=async()=>{try{const v=await form.validateFields();setBusy(true);const {dates,quantity,prefix,...other}=v
 const body={...other,startDate:dates[0].toISOString(),endDate:dates[1].toISOString(),...(mode==='bulk'?{quantity,prefix}:{})}
 await apiPost(mode==='bulk'?'/admin/coupons/bulk':'/admin/coupons',body);msg.success('Đã tạo mã ưu đãi');setMode(null);await load()
 }catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 const toggle=async(r:Coupon)=>{try{await apiPut(`/admin/coupons/${r.id}/${r.isActive?'deactivate':'activate'}`);msg.success('Đã cập nhật mã');await load()}catch(e){msg.error(errorText(e))}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Voucher & mã giảm giá</Title><Text className="glowup-page-subtitle">Tạo mã đơn lẻ hoặc sinh nhiều mã có điều kiện áp dụng.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button onClick={()=>open('bulk')}>Sinh hàng loạt</Button><Button type="primary" onClick={()=>open('one')}>Tạo mã</Button></Space></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Input.Search style={{width:270}} placeholder="Tìm theo mã" value={search} onChange={e=>setSearch(e.target.value)} onSearch={()=>setQuery(q=>({...q,page:1,search:search||undefined}))}/></Card>
 <Card className="glowup-table-card"><Table<Coupon> rowKey="id" loading={loading} dataSource={rows} scroll={{x:900}}
 pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Mã voucher',dataIndex:'code',render:(v:string)=><strong>{v}</strong>},{title:'Loại',dataIndex:'discountType'},{title:'Giá trị',render:(_,r)=>r.discountType==='PERCENTAGE'?`${r.discountValue}%`:money(r.discountValue)},
 {title:'Lượt dùng',render:(_,r)=>`${r.usedCount}/${r.maxUses??'∞'}`},{title:'Hạn cuối',dataIndex:'endDate',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},
 {title:'Trạng thái',render:(_,r)=><Tag color={r.isActive?'green':'default'}>{r.isActive?'Đang bật':'Đã tắt'}</Tag>},
 {title:'Thao tác',render:(_,r)=><Popconfirm title="Đổi trạng thái mã giảm giá?" onConfirm={()=>void toggle(r)}><Button>{r.isActive?'Tắt':'Bật'}</Button></Popconfirm>}]} /></Card>
 <Modal open={mode!==null} title={mode==='bulk'?'Sinh voucher hàng loạt':'Tạo voucher'} onCancel={()=>setMode(null)} onOk={()=>void save()} okText="Tạo" confirmLoading={busy} width={670}>
 <Form form={form} layout="vertical">
 {mode==='one'?<Form.Item name="code" label="Mã (để trống để tự sinh)" rules={[{pattern:/^[A-Za-z0-9]{4,30}$/,message:'4–30 ký tự chữ/số'}]}><Input maxLength={30}/></Form.Item>
 :<Space><Form.Item name="quantity" label="Số mã" rules={[{required:true}]}><InputNumber min={1} max={500} precision={0}/></Form.Item><Form.Item name="prefix" label="Tiền tố"><Input maxLength={10}/></Form.Item></Space>}
 <Space wrap align="start"><Form.Item name="discountType" label="Loại giảm" rules={[{required:true}]}><Select style={{width:180}} options={['PERCENTAGE','FIXED_AMOUNT'].map(x=>({value:x,label:x}))}/></Form.Item>
 <Form.Item name="discountValue" label="Giá trị" rules={[{required:true}]}><InputNumber min={0}/></Form.Item></Space>
 <Form.Item name="dates" label="Khoảng hiệu lực" rules={[{required:true}]}><DatePicker.RangePicker showTime/></Form.Item>
 <Space wrap><Form.Item name="minOrderAmount" label="Giá trị đơn tối thiểu"><InputNumber min={0}/></Form.Item><Form.Item name="maxUses" label="Tổng lượt dùng"><InputNumber min={1} precision={0}/></Form.Item><Form.Item name="maxUsesPerCustomer" label="Lượt/khách"><InputNumber min={1} max={100} precision={0}/></Form.Item></Space>
 </Form></Modal></div>
}
