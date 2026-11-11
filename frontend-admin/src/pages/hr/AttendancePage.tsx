import { Button, Calendar, Card, DatePicker, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, errorText, type Page } from '../../api/sprint4Api'
interface Attendance { id:string; employeeId:string; employeeCode:string; employeeName:string; storeName:string|null; shiftName:string|null; date:string; checkInAt:string|null; checkOutAt:string|null; status:string|null }
const { Title,Text }=Typography
export default function AttendancePage(){
 const [msg,holder]=message.useMessage()
 const [query,setQuery]=useState({page:1,limit:20,from:dayjs().startOf('month').format('YYYY-MM-DD'),to:dayjs().endOf('month').format('YYYY-MM-DD')})
 const [rows,setRows]=useState<Attendance[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Attendance>>('/admin/attendance',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const check=async(kind:'check-in'|'check-out')=>{setBusy(true);try{await apiPost(`/admin/attendance/${kind}`);msg.success('Đã chấm công');await load()}catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 const events=useMemo(()=>new Map(rows.reduce<[string,Attendance[]][]>((arr,row)=>{const index=arr.findIndex(([date])=>date===row.date);if(index<0)arr.push([row.date,[row]]);else arr[index][1].push(row);return arr},[])),[rows])
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Chấm công</Title><Text className="glowup-page-subtitle">Theo dõi công theo ngày, tình trạng đi trễ và ca làm việc.</Text></div>
 <Space><Button onClick={()=>void load()}>Làm mới</Button><Button loading={busy} onClick={()=>void check('check-in')}>Chấm công vào</Button><Button loading={busy} onClick={()=>void check('check-out')}>Chấm công ra</Button></Space></div>
 <Card style={{marginBottom:16}}><Space wrap><DatePicker.MonthPicker value={dayjs(query.from)} onChange={(v)=>v&&setQuery(q=>({...q,page:1,from:v.startOf('month').format('YYYY-MM-DD'),to:v.endOf('month').format('YYYY-MM-DD')}))}/><Text type="secondary">Lịch tóm tắt số bản ghi trong trang hiện tại, không phải tổng toàn bộ nhân viên.</Text></Space></Card>
 <Card title="Lịch chấm công (dữ liệu trang hiện tại)" style={{marginBottom:16}}>
 <Calendar fullscreen={false} value={dayjs(query.from)}
 onSelect={d=>{setQuery(q=>({...q,page:1,from:d.startOf('month').format('YYYY-MM-DD'),to:d.endOf('month').format('YYYY-MM-DD')}))}}
 cellRender={(d,info)=>info.type==='date'&&events.has(d.format('YYYY-MM-DD'))?<Tag color="blue">{events.get(d.format('YYYY-MM-DD'))?.length}</Tag>:null}/></Card>
 <Card className="glowup-table-card"><Table<Attendance> rowKey="id" loading={loading} dataSource={rows} scroll={{x:1000}} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Ngày',dataIndex:'date',render:(v:string)=>dayjs(v).format('DD/MM/YYYY')},{title:'Nhân viên',render:(_,r)=><div>{r.employeeName}<div><Text type="secondary">{r.employeeCode}</Text></div></div>},{title:'Cửa hàng',dataIndex:'storeName'},{title:'Ca',dataIndex:'shiftName'},
 {title:'Vào',dataIndex:'checkInAt',render:(v:string|null)=>v?dayjs(v).format('HH:mm'):'—'},{title:'Ra',dataIndex:'checkOutAt',render:(v:string|null)=>v?dayjs(v).format('HH:mm'):'—'},{title:'Trạng thái',dataIndex:'status',render:(v:string|null)=><Tag color={v==='PRESENT'?'green':v==='LATE'?'orange':'default'}>{v??'Chưa chấm'}</Tag>}]} /></Card>
 </div>
}
