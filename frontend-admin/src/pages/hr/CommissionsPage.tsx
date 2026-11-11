import { Button, Card, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, errorText, money } from '../../api/sprint4Api'
interface Commission { id:string; employeeName:string; employeeCode:string; orderNumber:string; amount:number; rate:number; periodMonth:number; periodYear:number; status:string }
interface Summary { employeeId:string; employeeName:string; orderCount:number; totalAmount:number }
interface Result { items:Commission[]; summary:Summary[]; meta:{itemCount:number} }
const { Title,Text }=Typography
export default function CommissionsPage(){
 const [msg,holder]=message.useMessage()
 const [query,setQuery]=useState({page:1,limit:20,month:new Date().getMonth()+1,year:new Date().getFullYear(),status:undefined as string|undefined})
 const [rows,setRows]=useState<Commission[]>([]),[summary,setSummary]=useState<Summary[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Result>('/admin/commissions',query);setRows(p.items??[]);setSummary(p.summary??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const finalize=async()=>{setBusy(true);try{const v=await apiPost<{finalizedCount:number}>('/admin/commissions/finalize',{month:query.month,year:query.year});msg.success(`Chốt hoa hồng thành công: ${v.finalizedCount??0} dòng`);await load()}catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Hoa hồng nhân viên</Title><Text className="glowup-page-subtitle">Đối chiếu hoa hồng theo nhân viên và chốt tháng đã kết thúc.</Text></div><Space><Button onClick={()=>void load()}>Làm mới</Button>
 <Popconfirm title="Chốt hoa hồng tháng đã kết thúc?" description="Không thể chốt lại tháng đã chốt." onConfirm={()=>void finalize()}><Button type="primary" loading={busy}>Chốt tháng</Button></Popconfirm></Space></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Space wrap>
 <Select style={{width:110}} value={query.month} options={Array.from({length:12},(_,i)=>({value:i+1,label:`Tháng ${i+1}`}))} onChange={month=>setQuery(q=>({...q,page:1,month}))}/>
 <InputNumber value={query.year} min={2000} max={2100} precision={0} onChange={year=>year&&setQuery(q=>({...q,page:1,year}))}/>
 <Select allowClear style={{width:170}} value={query.status} placeholder="Trạng thái" options={['PENDING','PAID','CANCELLED'].map(s=>({value:s,label:s}))} onChange={status=>setQuery(q=>({...q,page:1,status}))}/>
 </Space></Card>
 <Card title="Tổng hợp theo nhân viên" style={{marginBottom:16}}><Table<Summary> rowKey="employeeId" dataSource={summary} pagination={false} columns={[{title:'Nhân viên',dataIndex:'employeeName'},{title:'Số đơn',dataIndex:'orderCount'},{title:'Hoa hồng',dataIndex:'totalAmount',render:(v:number)=>money(v)}]}/></Card>
 <Card className="glowup-table-card" title="Chi tiết hoa hồng"><Table<Commission> rowKey="id" loading={loading} dataSource={rows} scroll={{x:850}}
 pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}}
 onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Nhân viên',dataIndex:'employeeName'},{title:'Mã đơn',dataIndex:'orderNumber'},{title:'Tỷ lệ',dataIndex:'rate',render:(v:number)=>`${v}%`},{title:'Hoa hồng',dataIndex:'amount',render:(v:number)=>money(v)},{title:'Trạng thái',dataIndex:'status',render:(v:string)=><Tag color={v==='PAID'?'green':v==='CANCELLED'?'red':'gold'}>{v}</Tag>}]} /></Card>
 </div>
}
