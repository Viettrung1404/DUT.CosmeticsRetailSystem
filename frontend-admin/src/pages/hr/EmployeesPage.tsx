import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { getRoles } from '../../api/adminUsersApi'
import { apiGet, apiPost, apiPut, errorText, money, type Page, uuidRule } from '../../api/sprint4Api'
interface Employee { id:string; employeeCode:string; fullName:string; email:string; phone:string|null; roleId:number; roleName:string; position:string; storeId:string|null; storeName:string|null; departmentId:string|null; departmentName:string|null; hireDate:string; salary:number|null; commissionRate:number; status:string }
interface NewEmployee { email:string; fullName:string; phone?:string; roleId:number; position:string; hireDate:string; employeeCode?:string; departmentId?:string; storeId?:string; salary?:number; commissionRate?:number; status?:string }
const { Title,Text }=Typography
export default function EmployeesPage(){
 const [msg,holder]=message.useMessage()
 const [query,setQuery]=useState({page:1,limit:20,search:undefined as string|undefined,status:undefined as string|undefined})
 const [search,setSearch]=useState(''),[roles,setRoles]=useState<{id:number;displayName:string}[]>([])
 const [rows,setRows]=useState<Employee[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false)
 const [selected,setSelected]=useState<Employee|'new'|null>(null),[busy,setBusy]=useState(false)
 const [form]=Form.useForm<NewEmployee>()
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Employee>>('/admin/employees',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{void getRoles().then((r)=>setRoles(r)).catch(()=>{})},[])
 const open=(row:Employee|'new')=>{setSelected(row);form.resetFields();if(row!=='new')form.setFieldsValue({fullName:row.fullName,phone:row.phone??'',position:row.position,departmentId:row.departmentId??undefined,storeId:row.storeId??undefined,hireDate:dayjs(row.hireDate).format('YYYY-MM-DD'),salary:row.salary??undefined,commissionRate:row.commissionRate,status:row.status})}
 const save=async()=>{try{const v=await form.validateFields();setBusy(true);if(selected==='new'){
 const r=await apiPost<{employee:Employee;activationEmailSent:boolean}>('/admin/employees',{...v,hireDate:new Date(v.hireDate).toISOString()})
 msg[r.activationEmailSent?'success':'warning'](r.activationEmailSent?'Đã tạo nhân viên và gửi email kích hoạt':'Đã tạo nhân viên nhưng chưa gửi được email kích hoạt')
 }else if(selected){const {email,roleId,employeeCode,...edit}=v;void email;void roleId;void employeeCode;await apiPut(`/admin/employees/${selected.id}`,{...edit,hireDate:new Date(v.hireDate).toISOString(),phone:v.phone??''});msg.success('Đã sửa nhân viên')}
 setSelected(null);await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Nhân viên</Title><Text className="glowup-page-subtitle">Hồ sơ nhân viên, chức danh, cửa hàng và hoa hồng.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>open('new')}>Thêm nhân viên</Button></Space></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Space wrap>
 <Input.Search placeholder="Mã NV, tên hoặc email" value={search} onChange={e=>setSearch(e.target.value)} onSearch={()=>setQuery(q=>({...q,page:1,search:search.trim()||undefined}))} style={{width:280}}/>
 <Select allowClear placeholder="Trạng thái" style={{width:160}} value={query.status} options={[{value:'ACTIVE',label:'Đang làm'},{value:'ON_LEAVE',label:'Nghỉ phép'},{value:'RESIGNED',label:'Đã nghỉ'}]} onChange={status=>setQuery(q=>({...q,page:1,status}))}/>
 </Space></Card>
 <Card className="glowup-table-card"><Table<Employee> rowKey="id" loading={loading} dataSource={rows} scroll={{x:1050}} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Mã NV',dataIndex:'employeeCode'},{title:'Họ tên',render:(_,r)=><div><strong>{r.fullName}</strong><div><Text type="secondary">{r.email}</Text></div></div>},{title:'Chức danh',dataIndex:'position'},{title:'Phòng ban',dataIndex:'departmentName',render:(v:string|null)=>v??'—'},{title:'Cửa hàng',dataIndex:'storeName',render:(v:string|null)=>v??'—'},{title:'Hoa hồng',dataIndex:'commissionRate',render:(v:number)=>`${v}%`},{title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag color={v==='ACTIVE'?'green':'orange'}>{v}</Tag>},{title:'Thao tác',render:(_,r)=><Button onClick={()=>open(r)}>Sửa</Button>}]} /></Card>
 <Modal title={selected==='new'?'Thêm nhân viên':'Sửa hồ sơ nhân viên'} open={selected!==null} onCancel={()=>setSelected(null)} onOk={()=>void save()} confirmLoading={busy} okText="Lưu" width={750}>
 <Form form={form} layout="vertical">
 {selected==='new'&&<><Form.Item label="Email" name="email" rules={[{required:true,type:'email',message:'Nhập email hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="Vai trò" name="roleId" rules={[{required:true,message:'Chọn vai trò'}]}><Select options={roles.map(r=>({label:r.displayName,value:r.id}))}/></Form.Item>
 <Form.Item label="Mã nhân viên (tự sinh nếu bỏ trống)" name="employeeCode" rules={[{pattern:/^[A-Za-z0-9-]{2,20}$/,message:'Mã 2–20 ký tự chữ, số hoặc -'}]}><Input/></Form.Item></>}
 <Form.Item label="Họ và tên" name="fullName" rules={[{required:true,min:2}]}><Input maxLength={100}/></Form.Item>
 <Form.Item label="Số điện thoại" name="phone" rules={[{pattern:/^([0-9]{10,11})?$/,message:'10–11 chữ số'}]}><Input/></Form.Item>
 <Form.Item label="Chức danh" name="position" rules={[{required:true,min:2}]}><Input maxLength={100}/></Form.Item>
 <Form.Item label="Ngày vào làm (YYYY-MM-DD)" name="hireDate" rules={[{required:true},{pattern:/^\d{4}-\d{2}-\d{2}$/,message:'Ngày không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="UUID phòng ban (tùy chọn)" name="departmentId" rules={[{pattern:uuidRule,message:'UUID không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="UUID cửa hàng chính (tùy chọn)" name="storeId" rules={[{pattern:uuidRule,message:'UUID không hợp lệ'}]}><Input/></Form.Item>
 <Form.Item label="Lương" name="salary"><InputNumber min={0} max={9999999999.99} precision={2} style={{width:'100%'}} formatter={v=>v===undefined?'':String(v)} /></Form.Item>
 <Form.Item label="Hoa hồng (%)" name="commissionRate"><InputNumber min={0} max={100} precision={2}/></Form.Item>
 {selected!=='new'&&<Form.Item label="Trạng thái" name="status"><Select options={['ACTIVE','ON_LEAVE','RESIGNED'].map(x=>({value:x,label:x}))}/></Form.Item>}
 </Form>
 </Modal></div>
}
