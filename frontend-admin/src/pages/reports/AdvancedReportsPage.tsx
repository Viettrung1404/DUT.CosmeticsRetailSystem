import { Alert, Button, Card, Col, DatePicker, Empty, InputNumber, Row, Select, Space, Statistic, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { apiGet, errorText, money } from '../../api/sprint5Api'
import { BarPlot } from '../../components/analytics/MiniCharts'
import { SeriesChart } from '../../components/analytics/SeriesChart'
type Data = Record<string, any>
type Mode = 'rfm'|'segments'|'trends'|'forecast'|'hr'|'staff-kpi'
const names:Record<Mode,string>={rfm:'Phân tích khách hàng RFM',segments:'Phân nhóm khách hàng',trends:'Xu hướng mua hàng',forecast:'Dự báo doanh thu',hr:'Báo cáo nhân sự','staff-kpi':'Hiệu suất nhân viên'}
export const segments=[{value:'CHAMPIONS',label:'Khách hàng VIP'},{value:'LOYAL',label:'Trung thành'},{value:'NEW',label:'Khách mới'},{value:'AT_RISK',label:'Nguy cơ rời bỏ'},{value:'LOST',label:'Đã rời bỏ'},{value:'NEEDS_ATTENTION',label:'Cần quan tâm'}]
const label=(v:string)=>segments.find(s=>s.value===v)?.label??v
const table=(rows:Data[],fields:[string,string,boolean?][]) => <Table<Data> rowKey={(_,i)=>String(i)} dataSource={rows} scroll={{x:700}} pagination={{pageSize:15}} columns={fields.map(([title,key,currency])=>({title,render:(_:unknown,r:Data)=>currency?money(r[key]):String(r[key]??'—')}))}/>
const stats=(items:[string,string|number][]) => <Row gutter={[12,12]}>{items.map(([title,value])=><Col xs={24} sm={12} xl={6} key={title}><Card><Statistic title={title} value={value}/></Card></Col>)}</Row>
export default function AdvancedReportsPage({mode}:{mode:Mode}){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reload,refresh]=useState(0)
 const [dates,setDates]=useState<[dayjs.Dayjs,dayjs.Dayjs]>([dayjs().subtract(29,'day'),dayjs()])
 const [segment,setSegment]=useState<string>(),[limit,setLimit]=useState(100),[granularity,setGranularity]=useState('month'),[method,setMethod]=useState('sma'),[months,setMonths]=useState(3)
 useEffect(()=>{let active=true;setBusy(true);setError('');setData(null)
 const range={from:dates[0].format('YYYY-MM-DD'),to:dates[1].format('YYYY-MM-DD')}
 const params=mode==='rfm'?{segment,limit}:mode==='segments'?{}:mode==='forecast'?{method,months}:mode==='trends'?{...range,granularity}:range
 apiGet<Data>(mode==='segments'?'/admin/customers/segments':'/admin/reports/'+mode,params).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(errorText(e))}).finally(()=>{if(active)setBusy(false)})
 return()=>{active=false}},[mode,dates,segment,limit,granularity,method,months,reload])
 const customers:Data[]=data?.customers??[], groups:Data[]=data?.segments??[]
 const categories:Data[]=data?.categorySeries??[]
 const periods=[...new Set(categories.map(c=>String(c.period)))].sort()
 const categoryNames=[...new Set(categories.map(c=>String(c.categoryName)))].slice(0,8)
 const trendRows=periods.map(period=>({period,...Object.fromEntries(categoryNames.map(n=>[n,categories.filter(c=>c.period===period&&c.categoryName===n).reduce((s,c)=>s+Number(c.revenue),0)]))}))
 const heat:Data[]=data?.heatmap??[], maxHeat=Math.max(1,...heat.map(h=>Number(h.orders)))
 const staff:Data[]=Array.isArray(data)?data:data?.staffKpi??data?.rows??[]
 return <Space direction="vertical" size={16} style={{width:'100%'}}>
 <Typography.Title level={2}>{names[mode]}</Typography.Title>
 <Card><Space wrap>
 {['trends','hr','staff-kpi'].includes(mode)&&<DatePicker.RangePicker allowClear={false} value={dates} onChange={v=>{if(v?.[0]&&v[1])setDates([v[0],v[1]])}}/>}
 {mode==='rfm'&&<><Select allowClear placeholder="Tất cả nhóm RFM" style={{width:200}} options={segments} value={segment} onChange={setSegment}/><InputNumber min={1} max={1000} value={limit} onChange={v=>setLimit(v??100)}/></>}
 {mode==='trends'&&<Select value={granularity} onChange={setGranularity} options={[{value:'day',label:'Theo ngày'},{value:'month',label:'Theo tháng'}]}/>}
 {mode==='forecast'&&<><Select value={method} onChange={setMethod} options={[{value:'sma',label:'Trung bình trượt'},{value:'linear',label:'Hồi quy tuyến tính'}]}/><InputNumber min={1} max={12} value={months} onChange={v=>setMonths(v??3)}/> tháng</>}
 <Button loading={busy} onClick={()=>refresh(x=>x+1)}>Làm mới</Button></Space></Card>
 {error&&<Alert type="error" showIcon message={error}/>}
 <Card loading={busy}>{!data?<Empty description={error?'Không tải được báo cáo':'Chưa có dữ liệu'}/>:<>
 {(mode==='rfm'||mode==='segments')&&<Space direction="vertical" style={{width:'100%'}} size={16}>
 <Typography.Text>Khoảng phân tích: {String(data.windowFrom)} – {String(data.windowTo)} · Tổng {data.totalCustomers} khách</Typography.Text>
 {stats(groups.map(g=>[label(g.segment),g.customers??0]))}
 <BarPlot data={groups.map(g=>({...g,label:label(g.segment)}))} labelKey="label" valueKey="customers"/>
 {mode==='segments'&&<Button href="/admin/reports/customers">Xem danh sách và ma trận RFM</Button>}
 {mode==='rfm'&&<><Typography.Title level={4}>Ma trận R × F (khách trong danh sách đang tải)</Typography.Title><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'center'}}><thead><tr><th>F / R</th>{[1,2,3,4,5].map(r=><th key={r}>{r}</th>)}</tr></thead><tbody>{[5,4,3,2,1].map(f=><tr key={f}><th>{f}</th>{[1,2,3,4,5].map(r=>{const n=customers.filter(c=>c.rScore===r&&c.fScore===f).length;return <td key={r} style={{padding:12,background:'rgba(190,18,60,'+(n?0.15+0.7*n/Math.max(1,customers.length):0.03)+')'}}>{n}</td>})}</tr>)}</tbody></table></div>
 {table(customers.map(c=>({...c,segment:label(c.segment)})),[['Khách hàng','fullName'],['R','rScore'],['F','fScore'],['M','mScore'],['Số lần mua','frequency'],['Chi tiêu','monetary',true],['Nhóm','segment']])}</>}
 </Space>}
 {mode==='trends'&&<Space direction="vertical" size={16} style={{width:'100%'}}><SeriesChart rows={data.revenueSeries??[]} series={[{key:'revenue',label:'Doanh thu thuần'},{key:'grossProfit',label:'Lợi nhuận gộp'}]}/><Typography.Title level={4}>Xu hướng danh mục (tối đa 8 nhóm)</Typography.Title><SeriesChart rows={trendRows} series={categoryNames.map(key=>({key,label:key}))}/><Typography.Title level={4}>Heatmap số đơn theo giờ Việt Nam</Typography.Title><div style={{overflowX:'auto'}}><table style={{minWidth:850,textAlign:'center'}}><thead><tr><th>Ngày</th>{Array.from({length:24},(_,h)=><th key={h}>{h}h</th>)}</tr></thead><tbody>{[0,1,2,3,4,5,6].map(d=><tr key={d}><th>{d===6?'CN':'T'+(d+2)}</th>{Array.from({length:24},(_,h)=>{const n=Number(heat.find(x=>x.weekday===d&&x.hour===h)?.orders??0);return <td key={h} title={n+' đơn'} style={{padding:6,background:'rgba(190,18,60,'+(n/maxHeat*.75+.04)+')'}}>{n}</td>})}</tr>)}</tbody></table></div>{table(data.categories??[],[['Danh mục','categoryName'],['Số lượng','quantity'],['Doanh thu','revenue',true],['Tỷ trọng (%)','percent']])}</Space>}
 {mode==='forecast'&&<Space direction="vertical" style={{width:'100%'}}><Alert type="info" message={data.methodLabel+' · Khoảng tin cậy '+data.confidenceLevel+'% (ước tính, không phải cam kết)'}/><SeriesChart rows={[...(data.history??[]).map((r:Data)=>({period:r.period,actual:r.revenue})),...(data.forecast??[]).map((r:Data)=>({period:r.period,prediction:r.revenue,lower:r.lower,upper:r.upper}))]} series={[{key:'actual',label:'Thực tế'},{key:'prediction',label:'Dự báo'},{key:'lower',label:'Cận dưới'},{key:'upper',label:'Cận trên'}]} band={{lower:'lower',upper:'upper'}}/>{table(data.forecast??[],[['Tháng','period'],['Dự báo','revenue',true],['Cận dưới','lower',true],['Cận trên','upper',true]])}</Space>}
 {mode==='hr'&&<Space direction="vertical" style={{width:'100%'}}>{stats([['Tổng nhân viên',data.totalEmployees],['Đang làm việc',data.activeEmployees],['Đã nghỉ',data.resignedEmployees],['Tỷ lệ hồ sơ nghỉ việc',data.resignationRatePercent+'%']])}<Typography.Text type="secondary">Tỷ lệ nghỉ việc tính trên tổng hồ sơ hiện có, không phải tỷ lệ nghỉ trong kỳ.</Typography.Text><Typography.Title level={4}>Theo phòng ban</Typography.Title><BarPlot data={data.byDepartment??[]} labelKey="name" valueKey="count"/><Typography.Title level={4}>Theo cửa hàng</Typography.Title><BarPlot data={data.byStore??[]} labelKey="name" valueKey="count"/>{stats([['Có mặt',data.attendance?.present??0],['Đi muộn',data.attendance?.late??0],['Vắng',data.attendance?.absent??0]])}</Space>}
 {(mode==='staff-kpi'||(mode==='hr'&&Array.isArray(data.staffKpi)))&&table(staff,[['Nhân viên','fullName'],['Đơn','orders'],['Doanh thu','revenue',true],['Trả hàng','returns',true],['Hoa hồng','commission',true],['Giá trị đơn TB','averageOrderValue',true]])}
 </>}</Card></Space>
}
