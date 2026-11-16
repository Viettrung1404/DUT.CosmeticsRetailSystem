import { Button, Card, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut, errorText, type Page } from '../../api/sprint5Api'
interface Review {id:string;productName:string;customerName:string|null;rating:number;title:string|null;content:string|null;isApproved:boolean;isVerifiedPurchase:boolean;adminReply:string|null;createdAt:string}
const {Title,Text}=Typography
export default function ReviewsPage(){
 const [msg,holder]=message.useMessage(),[rows,setRows]=useState<Review[]>([]),[total,setTotal]=useState(0)
 const [query,setQuery]=useState({page:1,limit:20,isApproved:undefined as boolean|undefined,rating:undefined as number|undefined})
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[target,setTarget]=useState<Review|null>(null),[reply,setReply]=useState('')
 const load=useCallback(async()=>{setLoading(true);try{const p=await apiGet<Page<Review>>('/admin/reviews',query);setRows(p.data??[]);setTotal(p.meta?.itemCount??0)}catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[query,msg])
 useEffect(()=>{void load()},[load])
 const act=async(row:Review,kind:'approve'|'reject'|'reply',content?:string)=>{setBusy(true);try{await apiPut(`/admin/reviews/${row.id}/${kind}`,{reply:content??undefined});msg.success('Đã cập nhật đánh giá');setTarget(null);await load()}catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Đánh giá sản phẩm</Title><Text className="glowup-page-subtitle">Duyệt, ẩn và phản hồi đánh giá. Backend tự tính lại rating sản phẩm.</Text></div><Button onClick={()=>void load()}>Làm mới</Button></div>
 <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Space wrap><Select allowClear placeholder="Duyệt / chờ" style={{width:180}} value={query.isApproved} options={[{label:'Đã duyệt',value:true},{label:'Chưa duyệt',value:false}]} onChange={isApproved=>setQuery(q=>({...q,page:1,isApproved}))}/>
 <Select allowClear placeholder="Số sao" style={{width:135}} value={query.rating} options={[1,2,3,4,5].map(i=>({label:`${i} sao`,value:i}))} onChange={rating=>setQuery(q=>({...q,page:1,rating}))}/></Space></Card>
 <Card className="glowup-table-card"><Table<Review> rowKey="id" dataSource={rows} loading={loading} scroll={{x:1100}} pagination={{current:query.page,pageSize:query.limit,total,showSizeChanger:true}} onChange={(p:TablePaginationConfig)=>setQuery(q=>({...q,page:p.current??1,limit:p.pageSize??20}))}
 columns={[{title:'Sản phẩm',dataIndex:'productName'},{title:'Khách hàng',dataIndex:'customerName',render:(v:string|null)=>v??'Ẩn danh'},
 {title:'Số sao',dataIndex:'rating',render:(v:number)=><Text style={{color:'#ca8a04'}}>{'★'.repeat(v)}</Text>},
 {title:'Nhận xét',render:(_,r)=><div><strong>{r.title}</strong><div style={{maxWidth:290,whiteSpace:'normal'}}>{r.content??'—'}</div></div>},
 {title:'Trạng thái',render:(_,r)=><Space direction="vertical"><Tag color={r.isApproved?'green':'orange'}>{r.isApproved?'Đã duyệt':'Chưa duyệt'}</Tag>{r.isVerifiedPurchase&&<Tag color="blue">Đã mua</Tag>}</Space>},
 {title:'Thao tác',render:(_,r)=><Space wrap>
 {!r.isApproved&&<Popconfirm title="Duyệt đánh giá này?" onConfirm={()=>void act(r,'approve')}><Button type="primary" size="small" disabled={busy}>Duyệt</Button></Popconfirm>}
 {r.isApproved&&<Popconfirm title="Ẩn đánh giá này?" onConfirm={()=>void act(r,'reject')}><Button danger size="small" disabled={busy}>Ẩn</Button></Popconfirm>}
 <Button size="small" onClick={()=>{setTarget(r);setReply(r.adminReply??'')}}>Phản hồi</Button></Space>}]} /></Card>
 <Modal title="Phản hồi đánh giá" open={Boolean(target)} onCancel={()=>setTarget(null)} footer={<Space><Button onClick={()=>setTarget(null)}>Hủy</Button><Popconfirm title="Lưu phản hồi công khai cho khách hàng?" onConfirm={()=>target&&void act(target,'reply',reply)}><Button type="primary" loading={busy}>Lưu phản hồi</Button></Popconfirm></Space>}>
 <Input.TextArea value={reply} onChange={e=>setReply(e.target.value)} maxLength={2000} rows={5}/></Modal></div>
}
