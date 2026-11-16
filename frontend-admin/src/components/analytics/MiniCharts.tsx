import { Empty, Space, Typography } from 'antd'
const { Text } = Typography
export function LinePlot({ data, xKey, yKey, height = 210 }: { data: Record<string, unknown>[]; xKey: string; yKey: string; height?: number }) {
  const valid = data.map((d) => Number(d[yKey] ?? 0))
  if (!valid.length) return <Empty description="Chưa có số liệu" />
  const max = Math.max(...valid, 1), width = 700, pad = 35, bottom = height - 30
  const coords = valid.map((v, i) => [pad + i * (width - pad * 2) / Math.max(valid.length - 1, 1), bottom - v / max * (height - 55)])
  return <div style={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`Biểu đồ ${yKey}`}>
    {[0, .25, .5, .75, 1].map(t => <g key={t}><line x1={pad} x2={width - pad} y1={bottom - t * (height - 55)} y2={bottom - t * (height - 55)} stroke="#d1d5db" strokeDasharray="3 5"/><text x="0" y={bottom - t*(height-55)+4} fontSize="10" fill="currentColor">{(max*t).toLocaleString('vi-VN', {notation:'compact'})}</text></g>)}
    <polyline points={coords.map(p=>p.join(',')).join(' ')} fill="none" stroke="#be123c" strokeWidth="3"/>
    {coords.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#be123c"><title>{String(data[i][xKey])}: {valid[i].toLocaleString('vi-VN')}</title></circle>)}
    {data.map((d,i)=>i%Math.max(1,Math.ceil(data.length/7))===0?<text key={i} x={coords[i][0]} y={height-8} fontSize="10" textAnchor="middle" fill="currentColor">{String(d[xKey]??'').slice(-10)}</text>:null)}
  </svg></div>
}
export function BarPlot({ data, labelKey, valueKey }: {data:Record<string,unknown>[]; labelKey:string; valueKey:string}) {
  if(!data.length)return <Empty description="Chưa có số liệu"/>
  const max=Math.max(1,...data.map(d=>Number(d[valueKey]??0)))
  return <Space direction="vertical" style={{width:'100%'}} size={10}>
    {data.slice(0,10).map((d,i)=><div key={i}><Text ellipsis style={{display:'block'}}>{String(d[labelKey]??'Không rõ')}</Text>
      <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{background:'#f1f5f9',height:15,flex:1,borderRadius:4}}>
        <div style={{width:`${Math.min(100,Number(d[valueKey]??0)/max*100)}%`,height:'100%',borderRadius:4,background:'#be123c'}}/></div><Text style={{minWidth:75,textAlign:'right'}}>{Number(d[valueKey]??0).toLocaleString('vi-VN')}</Text></div>
    </div>)}
  </Space>
}
export function SharePlot({ data }: {data:{channel:string;percent:number;revenue:number}[]}) {
  if (!data.length) return <Empty description="Chưa có số liệu"/>
  const colors=['#be123c','#2563eb','#16a34a','#ca8a04']
  return <Space direction="vertical" style={{width:'100%'}}>
    <div style={{height:24,display:'flex',borderRadius:8,overflow:'hidden'}}>
    {data.map((d,i)=><div key={i} title={`${d.channel}: ${d.percent}%`} style={{width:`${d.percent}%`,background:colors[i%colors.length]}}/>)}</div>
    {data.map((d,i)=><Space key={i}><span style={{background:colors[i%colors.length],width:10,height:10,borderRadius:3}}/><Text>{d.channel}: {d.percent}%</Text></Space>)}
  </Space>
}
