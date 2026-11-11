import { Alert, Button, Card, Col, Row, Statistic, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, errorText, type Page } from '../../api/sprint4Api'
interface Inventory { id:string; store:{name:string}; variant:{sku:string;productName:string}; quantity:number; reservedQuantity:number; availableQuantity:number; minQuantity:number }
const {Title,Text}=Typography
export default function AdminDashboardPage(){
 const [msg,holder]=message.useMessage()
 const [loading,setLoading]=useState(false)
 const [low,setLow]=useState<Page<Inventory>|null>(null)
 const [out,setOut]=useState<Page<Inventory>|null>(null)
 const [error,setError]=useState('')
 const load=async()=>{
   setLoading(true);setError('')
   try{
     const [lowPage,outPage]=await Promise.all([
       apiGet<Page<Inventory>>('/admin/inventory',{page:1,limit:10,status:'LOW_STOCK'}),
       apiGet<Page<Inventory>>('/admin/inventory',{page:1,limit:10,status:'OUT_OF_STOCK'}),
     ])
     setLow(lowPage);setOut(outPage)
   }catch(e){const text=errorText(e);setError(text);msg.error(text)}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 return <div>{holder}
   <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Tổng quan vận hành</Title>
   <Text className="glowup-page-subtitle">Theo dõi cảnh báo tồn kho theo dữ liệu API thật trong phạm vi cửa hàng của tài khoản.</Text></div>
   <Button loading={loading} onClick={()=>void load()}>Làm mới</Button></div>
   {error&&<Alert type="warning" showIcon message={error} style={{marginBottom:16}}/>}
   <Row gutter={[16,16]} style={{marginBottom:16}}>
     <Col xs={24} md={12}><Card><Statistic title="Dòng tồn kho dưới hoặc bằng mức tối thiểu" value={low?.meta.itemCount ?? '—'} loading={loading}/></Card></Col>
     <Col xs={24} md={12}><Card><Statistic title="Dòng tồn kho hết hàng khả dụng" value={out?.meta.itemCount ?? '—'} loading={loading}/></Card></Col>
   </Row>
   <Card title="Các mặt hàng cần chú ý" extra={<Link to="/admin/inventory">Xem tồn kho</Link>}>
     <Table<Inventory> rowKey="id" loading={loading} dataSource={low?.data ?? []} pagination={false} scroll={{x:680}}
       columns={[
         {title:'Sản phẩm',render:(_,r)=><div><strong>{r.variant.productName}</strong><div><Text type="secondary">{r.variant.sku}</Text></div></div>},
         {title:'Cửa hàng',render:(_,r)=>r.store.name},
         {title:'Tồn',dataIndex:'quantity'},{title:'Giữ chỗ',dataIndex:'reservedQuantity'},{title:'Khả dụng',dataIndex:'availableQuantity'},
         {title:'Mức tối thiểu',dataIndex:'minQuantity'},
       ]}/>
     <Text type="secondary">Bảng hiển thị tối đa 10 dòng đầu; hai chỉ số lấy từ tổng phân trang Backend và có thể chồng lặp theo quy tắc lọc.</Text>
   </Card>
 </div>
}
