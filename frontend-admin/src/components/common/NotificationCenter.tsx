import { Badge, Button, Drawer, Alert, List, Space, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { apiGet, apiPut, errorText } from '../../api/sprint5Api'
type Notice={id:string;title?:string;body?:string;message?:string;isRead:boolean;createdAt:string}
type Result={items:Notice[];total:number;unreadCount:number;page:number;limit:number}
export default function NotificationCenter(){
 const [open,setOpen]=useState(false),[page,setPage]=useState(1),[data,setData]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const load=async()=>{setBusy(true);setError('');try{setData(await apiGet<Result>('/notifications',{page,limit:20}))}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 useEffect(()=>{void load()},[page,open])
 const read=async(id:string)=>{try{await apiPut('/notifications/'+id+'/read',{});await load()}catch(e){setError(errorText(e))}}
 return <><Badge count={data?.unreadCount??0} overflowCount={99}><Button type="text" shape="circle" aria-label="Thông báo" icon={<BellOutlined/>} onClick={()=>setOpen(true)}/></Badge><Drawer title="Trung tâm thông báo" open={open} onClose={()=>setOpen(false)} extra={<Button onClick={()=>void load()} loading={busy}>Làm mới</Button>}>{error&&<Alert type="error" message={error}/>}<List loading={busy} dataSource={data?.items??[]} pagination={{current:page,total:data?.total??0,pageSize:20,onChange:setPage,showSizeChanger:false}} renderItem={n=><List.Item actions={n.isRead?[]:[<Button key="read" size="small" onClick={()=>void read(n.id)}>Đánh dấu đã đọc</Button>]}><Space direction="vertical"><Typography.Text strong={!n.isRead}>{n.title??'Thông báo'}</Typography.Text><Typography.Text>{n.body??n.message??''}</Typography.Text><Typography.Text type="secondary">{new Date(n.createdAt).toLocaleString('vi-VN')}</Typography.Text></Space></List.Item>}/></Drawer></>
}
