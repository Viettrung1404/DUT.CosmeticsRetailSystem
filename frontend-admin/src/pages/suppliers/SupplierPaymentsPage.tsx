import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, errorText, money, type Page, uuidRule } from '../../api/sprint4Api'
interface Payment { id:string; supplierName:string; poNumber:string|null; amount:number; paymentMethod:string; paymentDate:string; status:string; createdByName:string|null }
interface NewPayment { supplierId:string; purchaseOrderId?:string; amount:number; paymentMethod:'CASH'|'BANK_TRANSFER'; paymentDate:string; note?:string }
const { Title,Text }=Typography
export default function SupplierPaymentsPage(){
 const [msg,holder]=message.useMessage()
 const [query,setQuery]=useState({page:1,limit:20,supplierId:undefined as string|undefined})
 const [rows,setRows]=useState<Payment[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false)
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false)
 const [form]=Form.useForm<NewPayment>()
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Payment>>('/admin/supplier-payments',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const save=async()=>{try{const v=await form.validateFields();setBusy(true);await apiPost('/admin/supplier-payments',v);msg.success('Đã ghi nhận thanh toán nhà cung cấp');setOpen(false);form.resetFields();await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Thanh toán nhà cung cấp</Title><Text className="glowup-page-subtitle">Ghi nhận các khoản thanh toán, Backend kiểm tra không vượt quá công nợ.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>{form.resetFields();form.setFieldsValue({paymentDate:dayjs().format('YYYY-MM-DD'),paymentMethod:'BANK_TRANSFER'});setOpen(true)}}>Ghi thanh toán</Button></Space></div>
 <Card className="glowup-table-card"><Table<Payment> rowKey="id" loading={loading} dataSource={rows} scroll={{x:850}} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Nhà cung cấp',dataIndex:'supplierName'},{title:'PO',dataIndex:'poNumber',render:(v:string|null)=>v??'—'},{title:'Số tiền',dataIndex:'amount',render:(v:number)=>money(v)},{title:'Phương thức',dataIndex:'paymentMethod'},{title:'Ngày trả',dataIndex:'paymentDate',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},{title:'Trạng thái',dataIndex:'status'}]}/></Card>
 <Modal title="Ghi nhận thanh toán NCC" open={open} onCancel={()=>setOpen(false)} onOk={()=>void save()} okText="Xác nhận" confirmLoading={busy}><Form form={form} layout="vertical">
 <Form.Item label="UUID nhà cung cấp" name="supplierId" rules={[{required:true},{pattern:uuidRule,message:'UUID không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="UUID PO (tùy chọn)" name="purchaseOrderId" rules={[{pattern:uuidRule,message:'UUID không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="Số tiền" name="amount" rules={[{required:true,message:'Nhập số tiền'}]}><InputNumber min={1} precision={2} style={{width:'100%'}}/></Form.Item>
 <Form.Item label="Phương thức" name="paymentMethod" rules={[{required:true}]}><Select options={[{value:'BANK_TRANSFER',label:'Chuyển khoản'},{value:'CASH',label:'Tiền mặt'}]}/></Form.Item>
 <Form.Item label="Ngày thanh toán (YYYY-MM-DD)" name="paymentDate" rules={[{required:true},{pattern:/^\d{4}-\d{2}-\d{2}$/,message:'Ngày không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="Ghi chú" name="note"><Input.TextArea maxLength={500}/></Form.Item>
 </Form></Modal></div>
}
