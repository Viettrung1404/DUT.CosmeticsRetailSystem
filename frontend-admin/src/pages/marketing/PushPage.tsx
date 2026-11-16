import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, errorText, type Page } from '../../api/sprint5Api'
interface Campaign {id:string;name:string;title:string;channel:string;status:string;recipientCount:number;createdAt:string}
interface Values {title:string;message:string;target:'all'|'segment'|'individual';route:string;resourceId:string;customerIds?:string[];tierIds?:string[];rfmSegments?:string[]}
const {Title,Text}=Typography
export default function PushPage(){
 const [msg,holder]=message.useMessage(),[rows,setRows]=useState<Campaign[]>([]),[total,setTotal]=useState(0)
 const [query,setQuery]=useState({page:1,limit:20,channel:'PUSH'})
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[open,setOpen]=useState(false)
 const [form]=Form.useForm<Values>()
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Campaign>>('/admin/campaigns',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const send=async()=>{try{const v=await form.validateFields();setBusy(true);await apiPost('/admin/notifications/push',v);msg.success('Đã gửi yêu cầu phát thông báo');setOpen(false);form.resetFields();await load()}catch(e){if(!(e as {errorFields?:unknown}).errorFields)msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Thông báo đẩy</Title><Text className="glowup-page-subtitle">Gửi thông báo tới người dùng ứng dụng theo đối tượng.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button><Button type="primary" onClick={()=>{form.resetFields();form.setFieldsValue({target:'individual',route:'PRODUCT'});setOpen(true)}}>Soạn thông báo</Button></Space></div>
 <Alert style={{marginBottom:16}} type="warning" showIcon message="Gửi thông báo là hành động thật. Chỉ thử nghiệm với danh sách khách hàng test, không chọn tất cả khách hàng trên database chung."/>
 <Card><Table<Campaign> rowKey="id" loading={loading} dataSource={rows} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Chiến dịch',dataIndex:'name'},{title:'Tiêu đề',dataIndex:'title'},{title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag>{v}</Tag>},{title:'Người nhận',dataIndex:'recipientCount'}]}/></Card>
 <Modal title="Soạn thông báo đẩy" open={open} onCancel={()=>setOpen(false)} footer={<Space><Button onClick={()=>setOpen(false)}>Hủy</Button>
 <Popconfirm title="Xác nhận gửi thông báo cho đối tượng đã chọn?" onConfirm={()=>void send()}><Button type="primary" loading={busy}>Gửi thông báo</Button></Popconfirm></Space>} width={700}>
 <Form form={form} layout="vertical">
 <Form.Item label="Tiêu đề" name="title" rules={[{required:true}]}><Input maxLength={255}/></Form.Item>
 <Form.Item label="Nội dung" name="message" rules={[{required:true}]}><Input.TextArea rows={4} maxLength={2000}/></Form.Item>
 <Form.Item label="Người nhận" name="target" rules={[{required:true}]}><Select options={[{label:'Khách hàng cụ thể — nên dùng khi test',value:'individual'},{label:'Nhóm khách hàng',value:'segment'},{label:'Tất cả khách hàng',value:'all'}]}/></Form.Item>
 <Form.Item noStyle shouldUpdate={(before,after)=>before.target!==after.target}>{({getFieldValue})=>{
 const t=getFieldValue('target') as string;return t==='individual'?<Form.Item label="UUID khách hàng (ít nhất một)" name="customerIds" rules={[{required:true,type:'array',min:1}]}><Select mode="tags" placeholder="UUID khách test"/></Form.Item>:
 t==='segment'?<Form.Item label="Nhóm RFM" name="rfmSegments"><Select mode="multiple" options={['CHAMPIONS','LOYAL','NEW','AT_RISK','LOST','NEEDS_ATTENTION'].map(x=>({label:x,value:x}))}/></Form.Item>:null
 }}</Form.Item>
 <Form.Item label="Màn hình mở khi bấm" name="route" rules={[{required:true}]}><Input placeholder="Giá trị route do Backend hỗ trợ"/></Form.Item>
 <Form.Item label="UUID tài nguyên đi kèm" name="resourceId" rules={[{required:true},{pattern:/^[a-f0-9-]{36}$/i,message:'UUID không hợp lệ'}]}><Input/></Form.Item>
 </Form>
 </Modal></div>
}
