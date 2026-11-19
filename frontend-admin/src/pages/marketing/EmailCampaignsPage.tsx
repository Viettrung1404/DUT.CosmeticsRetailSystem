import { Alert, Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Statistic, Row, Col, Table, Tabs, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { apiGet, apiPost, apiPut, apiDelete, errorText, type Page } from '../../api/sprint5Api'
import { BarPlot } from '../../components/analytics/MiniCharts'
type Item=Record<string,any>
const groups=['CHAMPIONS','LOYAL','NEW','AT_RISK','LOST','NEEDS_ATTENTION']
export default function EmailCampaignsPage(){
 const [msg,holder]=message.useMessage(),[form]=Form.useForm<Item>()
 const [tab,setTab]=useState('campaigns'),[list,setList]=useState<Item[]>([]),[templates,setTemplates]=useState<Item[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[reload,refresh]=useState(0)
 const [editor,setEditor]=useState<Item|null>(null),[schedule,setSchedule]=useState<Item|null>(null),[when,setWhen]=useState<dayjs.Dayjs|null>(null),[stats,setStats]=useState<Item|null>(null)
 const audience=Form.useWatch('audience',form),html=Form.useWatch('content',form)
 const endpoint=tab==='campaigns'?'/admin/campaigns':'/admin/email-templates'
 useEffect(()=>{let active=true;setBusy(true);setError('');setList([])
 apiGet<Page<Item>>(endpoint,{page,limit:20,...(tab==='campaigns'?{channel:'EMAIL'}:{})}).then(v=>{if(active){setList(v.data);setTotal(v.meta.itemCount)}}).catch(e=>{if(active)setError(errorText(e))}).finally(()=>{if(active)setBusy(false)})
 return()=>{active=false}},[endpoint,tab,page,reload])
 const open=async(row:Item={})=>{setEditor({...row});form.resetFields();const value=row.audienceValue??{};form.setFieldsValue(tab==='templates'?{name:row.name,title:row.subject,content:row.html}:{name:row.name,title:row.title,content:row.content,audience:row.audienceType==='ALL'?'all':value.rfmSegments?.length?'rfm':value.tierIds?.length?'tier':value.customerTags?.length?'tags':'individual',recipients:value.rfmSegments??value.tierIds??value.customerTags??value.customerIds??[]})
 if(tab==='campaigns')try{setTemplates((await apiGet<Page<Item>>('/admin/email-templates',{page:1,limit:100})).data)}catch(e){msg.error(errorText(e))}}
 const run=async(fn:()=>Promise<unknown>)=>{setSaving(true);try{await fn();msg.success('Thao tác thành công');refresh(x=>x+1);return true}catch(e){msg.error(errorText(e));return false}finally{setSaving(false)}}
 const save=async()=>{let v:Item;try{v=await form.validateFields()}catch{return}
 const body=tab==='templates'?{name:v.name,subject:v.title,html:v.content}:{name:v.name,title:v.title,content:v.content,channel:'EMAIL',audienceType:v.audience==='all'?'ALL':v.audience==='tier'?'TIER':'CUSTOMERS',...(v.audience==='all'?{}:{audienceValue:{[({rfm:'rfmSegments',tier:'tierIds',tags:'customerTags',individual:'customerIds'} as Record<string,string>)[v.audience]]:v.recipients}})}
 if(await run(()=>editor?.id?apiPut(endpoint+'/'+editor.id,body):apiPost(endpoint,body)))setEditor(null)}
 return <Space direction="vertical" size={16} style={{width:'100%'}}>{holder}<Typography.Title level={2}>Email Marketing</Typography.Title>
 <Alert type="warning" showIcon message="Gửi và hẹn giờ có thể gửi thư thật. Chỉ thử với tài khoản thử nghiệm được phép."/>
 <Tabs activeKey={tab} onChange={v=>{setTab(v);setPage(1)}} items={[{key:'campaigns',label:'Chiến dịch'},{key:'templates',label:'Mẫu Email'}]}/>
 <Space><Button type="primary" onClick={()=>void open()}>Tạo {tab==='campaigns'?'chiến dịch':'mẫu email'}</Button><Button onClick={()=>refresh(x=>x+1)}>Làm mới</Button></Space>{error&&<Alert type="error" message={error}/>}
 <Card><Table<Item> rowKey="id" loading={busy} dataSource={list} scroll={{x:850}} pagination={{current:page,total,pageSize:20,showSizeChanger:false,onChange:setPage}} columns={[
 {title:'Tên',dataIndex:'name'},{title:'Tiêu đề',dataIndex:tab==='campaigns'?'title':'subject'},...(tab==='campaigns'?[{title:'Trạng thái',dataIndex:'status'},{title:'Người nhận',dataIndex:'recipientCount'},{title:'Lịch gửi',render:(_:unknown,r:Item)=>r.scheduledAt?dayjs(r.scheduledAt).format('DD/MM/YYYY HH:mm'):'—'}]:[]),
 {title:'Thao tác',render:(_,r)=><Space wrap>
 {(tab==='templates'||r.status==='DRAFT')&&<Button size="small" onClick={()=>void open(r)}>Sửa</Button>}
 {tab==='templates'?<Popconfirm title="Xóa mẫu email?" onConfirm={()=>run(()=>apiDelete(endpoint+'/'+r.id))}><Button size="small" danger disabled={saving}>Xóa</Button></Popconfirm>:<>
 <Button size="small" onClick={async()=>{try{setStats(await apiGet<Item>(endpoint+'/'+r.id+'/stats'))}catch(e){msg.error(errorText(e))}}}>Thống kê</Button>
 {r.status==='DRAFT'&&<Button size="small" onClick={()=>{setSchedule(r);setWhen(null)}}>Hẹn giờ</Button>}
 {['DRAFT','SCHEDULED'].includes(r.status)&&<><Popconfirm title="Gửi email thật tới đối tượng đã chọn?" onConfirm={()=>run(()=>apiPost(endpoint+'/'+r.id+'/send',{}))}><Button size="small" type="primary" disabled={saving}>Gửi ngay</Button></Popconfirm><Popconfirm title="Hủy chiến dịch?" onConfirm={()=>run(()=>apiPut(endpoint+'/'+r.id+'/cancel',{}))}><Button size="small" danger disabled={saving}>Hủy</Button></Popconfirm></>}
 </>}</Space>}]}/></Card>
 <Modal open={!!editor} title={tab==='campaigns'?'Soạn chiến dịch':'Mẫu Email'} width={800} forceRender onCancel={()=>{if(!saving)setEditor(null)}} onOk={()=>void save()} confirmLoading={saving} okText="Lưu">
 <Form form={form} layout="vertical">
 {tab==='campaigns'&&<Select allowClear placeholder="Nạp nội dung từ mẫu" style={{width:'100%',marginBottom:16}} options={templates.map(t=>({value:t.id,label:t.name}))} onChange={id=>{const t=templates.find(x=>x.id===id);if(t)form.setFieldsValue({title:t.subject,content:t.html})}}/>}
 <Form.Item name="name" label="Tên" rules={[{required:true,whitespace:true,max:tab==='campaigns'?200:150}]}><Input/></Form.Item>
 <Form.Item name="title" label="Tiêu đề email" rules={[{required:true,whitespace:true,max:255}]}><Input/></Form.Item>
 {tab==='campaigns'&&<><Form.Item name="audience" label="Đối tượng nhận" rules={[{required:true}]}><Select options={[{value:'individual',label:'Khách hàng cụ thể'},{value:'rfm',label:'Nhóm RFM'},{value:'tier',label:'Hạng thành viên'},{value:'tags',label:'Nhãn khách hàng'},{value:'all',label:'Tất cả khách đang hoạt động'}]} onChange={()=>form.setFieldValue('recipients',[])}/></Form.Item>
 {audience&&audience!=='all'&&<Form.Item name="recipients" label="Đối tượng" rules={[{required:true,type:'array',min:1}]}><Select mode={audience==='rfm'?'multiple':'tags'} options={audience==='rfm'?groups.map(v=>({value:v,label:v})):[]} tokenSeparators={[',']} placeholder={audience==='tags'?'Nhãn khách hàng':audience==='rfm'?'Chọn nhóm':'Nhập UUID'}/></Form.Item>}</>}
 <Form.Item name="content" label="Nội dung HTML (hỗ trợ {{fullName}}, {{email}})" rules={[{required:true,whitespace:true,max:50000}]}><Input.TextArea rows={10}/></Form.Item>
 <Typography.Text strong>Xem trước (không chạy script, không tải tài nguyên ngoài)</Typography.Text><iframe title="Email preview" sandbox="" style={{width:'100%',height:240,border:'1px solid #ddd'}} srcDoc={'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'+String(html??'')}/>
 </Form></Modal>
 <Modal open={!!schedule} title="Hẹn giờ gửi email" confirmLoading={saving} onCancel={()=>setSchedule(null)} onOk={async()=>{if(!when||!when.isAfter(dayjs())){msg.error('Chọn thời điểm trong tương lai');return}if(await run(()=>apiPut(endpoint+'/'+schedule?.id+'/schedule',{scheduledAt:when.toISOString()})))setSchedule(null)}}><Alert type="warning" message="Email sẽ được gửi thật vào thời điểm đã chọn."/><DatePicker showTime value={when} onChange={setWhen} style={{marginTop:12}}/></Modal>
 <Modal open={!!stats} title="Thống kê chiến dịch" footer={null} onCancel={()=>setStats(null)} width={720}>{stats&&<><Row gutter={[12,12]}>{[['Người nhận',stats.recipientCount],['Tỷ lệ mở',stats.engagement?stats.engagement.openRate+'%':'—'],['Tỷ lệ nhấp',stats.engagement?stats.engagement.clickRate+'%':'—']].map(([title,value])=><Col span={8} key={title}><Statistic title={title} value={value}/></Col>)}</Row><BarPlot data={Object.entries(stats.email??{}).map(([label,value])=>({label,value}))} labelKey="label" valueKey="value"/><Table rowKey="url" dataSource={stats.engagement?.topLinks??[]} columns={[{title:'Liên kết',dataIndex:'url'},{title:'Lượt nhấp',dataIndex:'clicks'}]}/></>}</Modal>
 </Space>
}
