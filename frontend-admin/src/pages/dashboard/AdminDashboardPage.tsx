import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Typography, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, errorText, money } from '../../api/sprint5Api'
import { BarPlot, LinePlot, SharePlot } from '../../components/analytics/MiniCharts'
interface Day { date:string; orders:number; revenue:number }
interface Product { productId?:string; productName?:string; name?:string; quantity?:number; unitsSold?:number; revenue?:number }
interface Channel { channel:string; orders:number; revenue:number; percent:number }
interface Dashboard {date:string;today:{revenue:number;orders:number;averageOrderValue:number;newCustomers:number};last7Days:Day[];topProducts:Product[];channelShare:Channel[];pendingOrders:number;lowStockVariants:unknown[]|number}
const { Title, Text } = Typography
export default function AdminDashboardPage(){
  const [msg,holder]=message.useMessage()
  const [data,setData]=useState<Dashboard|null>(null)
  const [loading,setLoading]=useState(false),[error,setError]=useState('')
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await apiGet<Dashboard>('/admin/dashboard'))}
    catch(e){setError(errorText(e));msg.error(errorText(e))}finally{setLoading(false)}},[msg])
  useEffect(()=>{void load()},[load])
  const lowStock=Array.isArray(data?.lowStockVariants)?data.lowStockVariants.length:Number(data?.lowStockVariants??0)
  const products=(data?.topProducts??[]).map(p=>({...p,label:p.productName??p.name??'Sản phẩm',sold:p.quantity??p.unitsSold??0}))
  return <div>{holder}
    <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Tổng quan kinh doanh</Title>
      <Text className="glowup-page-subtitle">Dữ liệu phân tích theo phạm vi quyền của tài khoản — ngày {data?.date??'—'}.</Text></div>
      <Button onClick={()=>void load()} loading={loading}>Làm mới</Button></div>
    {error&&<Alert showIcon type="warning" message={error} style={{marginBottom:16}}/>}
    <Row gutter={[12,12]} style={{marginBottom:16}}>
      {[{label:'Doanh thu hôm nay',value:money(data?.today.revenue??0)}, {label:'Số đơn hôm nay',value:data?.today.orders??0}, {label:'Giá trị đơn TB',value:money(data?.today.averageOrderValue??0)}, {label:'Khách hàng mới',value:data?.today.newCustomers??0}].map(x=>
        <Col key={x.label} xs={24} sm={12} xl={6}><Card><Statistic title={x.label} value={x.value} loading={loading}/></Card></Col>)}
    </Row>
    <Row gutter={[16,16]} style={{marginBottom:16}}>
      <Col xs={24} xl={15}><Card title="Doanh thu 7 ngày (VND)" loading={loading}><LinePlot data={data?.last7Days??[]} xKey="date" yKey="revenue"/></Card></Col>
      <Col xs={24} xl={9}><Card title="Tỷ lệ doanh thu theo kênh" loading={loading}><SharePlot data={data?.channelShare??[]}/></Card></Col>
    </Row>
    <Row gutter={[16,16]} style={{marginBottom:16}}>
      <Col xs={24} lg={12}><Card title="Top 5 sản phẩm bán chạy" loading={loading}><BarPlot data={products} labelKey="label" valueKey="sold"/></Card></Col>
      <Col xs={24} lg={12}><Card title="Cảnh báo vận hành" loading={loading}><Space direction="vertical" size={16}>
        <Statistic title="Đơn chờ xử lý" value={data?.pendingOrders??0}/>
        <Statistic title="Mặt hàng dưới ngưỡng tồn kho" value={lowStock}/>
        <Link to="/admin/orders">Xem đơn hàng</Link><Link to="/admin/inventory">Xem tồn kho</Link>
      </Space></Card></Col>
    </Row>
    {Array.isArray(data?.lowStockVariants)&&data.lowStockVariants.length>0&&
      <Card title="Dữ liệu cảnh báo tồn kho từ Backend"><Table rowKey={(_,i)=>String(i)} dataSource={data.lowStockVariants as Record<string,unknown>[]}
        pagination={{pageSize:5}} columns={[
        {title:'Sản phẩm / SKU',render:(_,row)=>String(row.productName??row.sku??row.productVariantId??'—')},
        {title:'Tồn kho',render:(_,row)=>String(row.quantity??row.availableQuantity??'—')},
        {title:'Ngưỡng',render:(_,row)=>String(row.minQuantity??'—')}]}/></Card>}
  </div>
}
