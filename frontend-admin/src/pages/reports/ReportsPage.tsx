import { Alert, Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, errorText, exportReport, money } from '../../api/sprint5Api'
import { BarPlot } from '../../components/analytics/MiniCharts'
import { SeriesChart } from '../../components/analytics/SeriesChart'
type RecordRow = Record<string,unknown>
interface Revenue { rows:RecordRow[]; totals:{orders:number;revenue:number;netRevenue?:number;grossProfit?:number;averageOrderValue:number}; comparison?:{from:string;to:string;totals:Record<string,number>;change:Record<string,number|null>} }
interface Products { bestSellers:RecordRow[]; slowMovers:RecordRow[]; byCategory:RecordRow[];slowMoverDays:number }
const {Title,Text}=Typography
const initialDates:[dayjs.Dayjs,dayjs.Dayjs]=[dayjs().subtract(29,'day'),dayjs()]
export default function ReportsPage({mode}:{mode:'revenue'|'products'}){
 const [msg,holder]=message.useMessage(),[dates,setDates]=useState(initialDates)
 const [period,setPeriod]=useState('day'),[storeId,setStoreId]=useState('')
 const [compare,setCompare]=useState(''),[chart,setChart]=useState<'line'|'bar'>('line'),[metric,setMetric]=useState('netRevenue')
 const [limit,setLimit]=useState(10),[loading,setLoading]=useState(false),[exporting,setExporting]=useState(false)
 const [revenue,setRevenue]=useState<Revenue|null>(null),[products,setProducts]=useState<Products|null>(null)
 const params={from:dates[0].format('YYYY-MM-DD'),to:dates[1].format('YYYY-MM-DD'),storeId:storeId.trim()||undefined,...(mode==='revenue'?{period,compare:compare||undefined}:{limit})}
 const load=useCallback(async()=>{setLoading(true);setRevenue(null);setProducts(null);try{
   if(mode==='revenue')setRevenue(await apiGet<Revenue>('/admin/reports/revenue',params))
   else setProducts(await apiGet<Products>('/admin/reports/products',params))
 }catch(e){msg.error(errorText(e))}finally{setLoading(false)}},[mode,dates,period,storeId,limit,compare,msg])
 useEffect(()=>{void load()},[load])
 const download=async(format:'pdf'|'xlsx')=>{setExporting(true);try{await exportReport(mode,format,params);msg.success('Đã tải báo cáo')}catch(e){msg.error(errorText(e))}finally{setExporting(false)}}
 const rows:(RecordRow & {key:number})[]=(revenue?.rows??[]).map((r,i)=>({key:i,...r}))
 const best:(RecordRow & {key:number;label:unknown;value:unknown})[]=(products?.bestSellers??[]).map((r,i)=>({key:i,...r,label:r.productName??r.name??r.sku??'Sản phẩm',value:r.revenue??r.quantity??r.unitsSold??0}))
 return <div>{holder}
  <div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">{mode==='revenue'?'Báo cáo doanh thu':'Phân tích sản phẩm'}</Title>
    <Text className="glowup-page-subtitle">Báo cáo tổng hợp từ Backend, chỉ hiển thị cửa hàng thuộc phạm vi tài khoản.</Text></div>
    <Space><Button onClick={()=>void load()} loading={loading}>Làm mới</Button><Button loading={exporting} onClick={()=>void download('xlsx')}>Excel</Button><Button loading={exporting} onClick={()=>void download('pdf')}>PDF</Button></Space>
  </div>
  <Card className="glowup-toolbar-card" style={{marginBottom:16}}><Space wrap>
    <DatePicker.RangePicker value={dates} allowClear={false} onChange={v=>{if(v?.[0]&&v[1])setDates([v[0],v[1]])}}/>
    <Input.Search placeholder="UUID cửa hàng (tùy chọn)" defaultValue={storeId} onSearch={setStoreId} style={{width:250}}/>
    {mode==='revenue'?<Select value={period} onChange={setPeriod} style={{width:145}} options={['day','week','month','quarter','year'].map(x=>({value:x,label:({day:'Ngày',week:'Tuần',month:'Tháng',quarter:'Quý',year:'Năm'} as Record<string,string>)[x]}))}/>
    :<Select value={limit} onChange={setLimit} style={{width:140}} options={[5,10,20,50].map(x=>({value:x,label:`Top ${x}`}))}/>}
  {mode==='revenue'&&<><Select value={compare} onChange={setCompare} options={[{value:'',label:'Không so sánh'},{value:'previous',label:'Kỳ trước'},{value:'last_year',label:'Cùng kỳ năm trước'}]}/><Select value={chart} onChange={setChart} options={[{value:'line',label:'Biểu đồ đường'},{value:'bar',label:'Biểu đồ cột'}]}/><Select value={metric} onChange={setMetric} options={[{value:'netRevenue',label:'Doanh thu thuần'},{value:'grossProfit',label:'Lợi nhuận'},{value:'orders',label:'Số đơn'},{value:'cost',label:'Giá vốn'}]}/></>}
  </Space></Card>
  {mode==='revenue'?<>
    <Row gutter={[12,12]} style={{marginBottom:16}}>{[{title:'Số đơn',value:revenue?.totals.orders??0},{title:'Doanh thu thuần',value:money(revenue?.totals.netRevenue??revenue?.totals.revenue??0)},{title:'Giá trị đơn TB',value:money(revenue?.totals.averageOrderValue??0)},{title:'Lợi nhuận gộp',value:money(revenue?.totals.grossProfit??0)}].map(v=>
      <Col xs={24} sm={12} xl={6} key={v.title}><Card><Statistic title={v.title} value={v.value} loading={loading}/></Card></Col>)}</Row>
    <Card title="Doanh thu qua các kỳ" loading={loading} style={{marginBottom:16}}><SeriesChart rows={rows} kind={chart} series={[{key:metric,label:({netRevenue:'Doanh thu thuần',grossProfit:'Lợi nhuận',orders:'Số đơn',cost:'Giá vốn'} as Record<string,string>)[metric]}]}/></Card>
    {revenue?.comparison&&<Card title={'So sánh với '+revenue.comparison.from+' – '+revenue.comparison.to} style={{marginBottom:16}}><SeriesChart kind="bar" rows={[{period:'Kỳ hiện tại',netRevenue:revenue.totals.netRevenue,grossProfit:revenue.totals.grossProfit},{period:'Kỳ đối chiếu',netRevenue:revenue.comparison.totals.netRevenue,grossProfit:revenue.comparison.totals.grossProfit}]} series={[{key:'netRevenue',label:'Doanh thu thuần'},{key:'grossProfit',label:'Lợi nhuận gộp'}]}/><Space wrap>{Object.entries(revenue.comparison.change).map(([k,v])=><Statistic key={k} title={(({orders:'Số đơn',netRevenue:'Doanh thu thuần',grossProfit:'Lợi nhuận',averageOrderValue:'Giá trị đơn TB',cancelRate:'Tỷ lệ hủy'} as Record<string,string>)[k]??k)} value={v===null?'Không có mốc so sánh':v+'%'}/>)}</Space></Card>}
    <Card title="Chi tiết doanh thu"><Table rowKey="key" loading={loading} dataSource={rows} scroll={{x:950}} pagination={{pageSize:20}} columns={[
      {title:'Kỳ',render:(_,r)=>String(r.period??r.date??'—')},{title:'Đơn',render:(_,r)=>String(r.orders??0)},
      {title:'Doanh thu',render:(_,r)=>money(r.revenue as number)},{title:'Doanh thu thuần',render:(_,r)=>money(r.netRevenue as number)},
      {title:'Giá vốn',render:(_,r)=>money(r.cost as number)},{title:'Lợi nhuận',render:(_,r)=>money(r.grossProfit as number)}]}/></Card>
  </>:<>
    <Row gutter={[16,16]} style={{marginBottom:16}}>
      <Col xs={24} lg={12}><Card title="Sản phẩm bán chạy" loading={loading}><BarPlot data={best} labelKey="label" valueKey="value"/></Card></Col>
      <Col xs={24} lg={12}><Card title={`Sản phẩm bán chậm (không bán ${products?.slowMoverDays??30} ngày)`} loading={loading}>
        <Table rowKey={(_,i)=>String(i)} size="small" dataSource={products?.slowMovers??[]} pagination={{pageSize:6}} columns={[
        {title:'Sản phẩm',render:(_,r)=>String(r.productName??r.name??r.sku??'—')},{title:'Tồn',render:(_,r)=>String(r.stock??r.quantity??'—')}]}/></Card></Col>
    </Row>
    <Card title="Leaderboard bán chạy"><Table rowKey="key" loading={loading} dataSource={best} pagination={{pageSize:20}} scroll={{x:760}} columns={[
      {title:'Sản phẩm',dataIndex:'label'}, {title:'Doanh thu',render:(_,r)=>money(r.revenue as number)},
      {title:'Số lượng',render:(_,r)=>String(r.quantity??r.unitsSold??0)},
      {title:'Lợi nhuận gộp',render:(_,r)=>money(r.grossProfit as number)}]}/></Card>
  </>}
  <Alert style={{marginTop:12}} type="info" showIcon message="Xuất Excel/PDF bằng API của Backend, yêu cầu quyền REPORT_EXPORT."/>
 </div>
}
