import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Typography, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut, errorText, uuidRule } from '../../api/sprint4Api'

interface Department { id:string; name:string; description:string|null; employeeCount:number }
interface Shift { id:string; name:string; storeId:string|null; storeName:string|null; startTime:string; endTime:string }
type Row = Department & Shift
const { Title,Text }=Typography
export default function HrSettingsPage({mode}:{mode:'departments'|'shifts'}){
 const isShift=mode==='shifts'
 const [msg,holder]=message.useMessage()
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false)
 const [selected,setSelected]=useState<Row|'new'|null>(null)
 const [form]=Form.useForm()
 const load=useCallback(async()=>{setLoading(true);try{setRows(await apiGet<Row[]>(`/admin/${mode}`))}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[mode,msg])
 useEffect(()=>{void load()},[load])
 const edit=(v:Row|'new')=>{form.resetFields();setSelected(v);if(v!=='new')form.setFieldsValue(v)}
 const save=async()=>{try{const v=await form.validateFields();setBusy(true);if(selected==='new')await apiPost(`/admin/${mode}`,v);else if(selected)await apiPut(`/admin/${mode}/${selected.id}`,v);msg.success('Đã lưu thành công');setSelected(null);await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 const remove=async(id:string)=>{try{await apiDelete(`/admin/${mode}/${id}`);msg.success('Đã xóa');await load()}catch(e){msg.error(errorText(e))}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">{isShift?'Ca làm việc':'Phòng ban'}</Title>
 <Text className="glowup-page-subtitle">Quản lý {isShift?'khung giờ ca và cửa hàng áp dụng':'cơ cấu phòng ban và số nhân viên'}.</Text></div>
 <Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>edit('new')}>Thêm {isShift?'ca':'phòng ban'}</Button></Space></div>
 <Card className="glowup-table-card"><Table<Row> rowKey="id" loading={loading} dataSource={rows} pagination={{pageSize:20}}
 columns={[{title:'Tên',dataIndex:'name'},...(isShift?[{title:'Bắt đầu',dataIndex:'startTime' as const},{title:'Kết thúc',dataIndex:'endTime' as const},{title:'Cửa hàng',dataIndex:'storeName' as const,render:(v:string|null)=>v||'Toàn chuỗi'}]:[{title:'Số nhân viên',dataIndex:'employeeCount' as const}]),
 {title:'Thao tác',render:(_:unknown,row:Row)=><Space><Button onClick={()=>edit(row)}>Sửa</Button>
 <Popconfirm title="Xóa mục này? Backend chỉ cho xóa khi không còn dữ liệu phụ thuộc." onConfirm={()=>void remove(row.id)}>
 <Button danger>Xóa</Button></Popconfirm></Space>}]} /></Card>
 <Modal title={selected==='new'?'Thêm mới':'Chỉnh sửa'} open={selected!==null} onCancel={()=>setSelected(null)} onOk={()=>void save()} confirmLoading={busy} okText="Lưu">
 <Form form={form} layout="vertical">
 <Form.Item label={isShift?'Tên ca':'Tên phòng ban'} name="name" rules={[{required:true,message:'Vui lòng nhập tên'}]}><Input maxLength={isShift?50:100}/></Form.Item>
 {isShift?<><Form.Item label="Giờ bắt đầu (HH:mm)" name="startTime" rules={[{required:true},{pattern:/^([01]\d|2[0-3]):[0-5]\d$/,message:'HH:mm'}]}><Input placeholder="08:00"/></Form.Item>
 <Form.Item label="Giờ kết thúc (HH:mm)" name="endTime" rules={[{required:true},{pattern:/^([01]\d|2[0-3]):[0-5]\d$/,message:'HH:mm'}]}><Input placeholder="17:00"/></Form.Item>
 {selected==='new' && <Form.Item label="UUID cửa hàng (bỏ trống nếu ca toàn chuỗi)" name="storeId" rules={[{pattern:uuidRule,message:'UUID không hợp lệ'}]}><Input/></Form.Item>}</>
 :<Form.Item label="Mô tả" name="description"><Input.TextArea maxLength={1000}/></Form.Item>}
 </Form></Modal></div>
}
