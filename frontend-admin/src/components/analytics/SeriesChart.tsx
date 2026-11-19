import { Empty, Space } from 'antd'
type Series={key:string;label:string}
type Row=Record<string,unknown>
const colors=['#be123c','#2563eb','#059669','#d97706','#7c3aed','#0891b2','#64748b','#a16207']
export function SeriesChart({rows,series,kind='line',band}:{rows:Row[];series:Series[];kind?:'line'|'bar';band?:{lower:string;upper:string}}){
 const values=rows.flatMap(r=>series.map(s=>r[s.key]).filter(v=>typeof v==='number'&&Number.isFinite(v)) as number[])
 if(!rows.length||!values.length)return <Empty description="Chưa có số liệu"/>
 const min=Math.min(0,...values),max=Math.max(min+1,...values),w=Math.max(700,rows.length*30),h=290,p=70,bottom=245
 const step=(w-p-20)/rows.length,x=(i:number)=>p+(i+.5)*step,y=(v:number)=>bottom-(v-min)/(max-min)*215
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null
 const fmt=(v:number)=>v.toLocaleString('vi-VN',{maximumFractionDigits:2})
 return <div><div style={{overflowX:'auto'}}><svg viewBox={'0 0 '+w+' '+h} style={{width:'100%',minWidth:Math.min(w,700)}} role="img" aria-label={series.map(s=>s.label).join(', ')}>
 {[0,1,2,3,4].map(i=>{const v=min+(max-min)*i/4;return <g key={i}><line x1={p} x2={w-20} y1={y(v)} y2={y(v)} stroke="#ddd" strokeDasharray="3 4"/><text x={p-5} y={y(v)+4} fontSize="11" textAnchor="end" fill="currentColor">{v.toLocaleString('vi-VN',{notation:'compact',maximumFractionDigits:1})}</text></g>})}
 {band&&(()=>{const points=rows.map((r,i)=>({i,lo:n(r[band.lower]),hi:n(r[band.upper])})).filter(v=>v.lo!==null&&v.hi!==null);return <polygon fill="#93c5fd" opacity=".3" points={[...points.map(v=>x(v.i)+','+y(v.hi!)),...points.slice().reverse().map(v=>x(v.i)+','+y(v.lo!))].join(' ')}/>})()}
 {series.map((s,j)=><g key={s.key}>{rows.map((r,i)=>{const v=n(r[s.key]);if(v===null)return null;const previous=i>0?n(rows[i-1][s.key]):null;const tip=String(r.period??i)+' · '+s.label+': '+fmt(v);return kind==='bar'?<rect key={i} x={x(i)-step*.4+j*step*.8/series.length} y={Math.min(y(0),y(v))} width={Math.max(1,step*.8/series.length-1)} height={Math.abs(y(v)-y(0))} fill={colors[j%colors.length]}><title>{tip}</title></rect>:<g key={i}>{previous!==null&&<line x1={x(i-1)} y1={y(previous)} x2={x(i)} y2={y(v)} stroke={colors[j%colors.length]} strokeWidth="2"/>}<circle cx={x(i)} cy={y(v)} r="4" fill={colors[j%colors.length]}><title>{tip}</title></circle></g>})}</g>)}
 {rows.map((r,i)=>i%Math.max(1,Math.ceil(rows.length/12))===0?<text key={i} x={x(i)} y={270} fontSize="10" textAnchor="middle" fill="currentColor">{String(r.period??'')}</text>:null)}
 </svg></div><Space wrap>{series.map((s,i)=><span key={s.key}><span style={{display:'inline-block',width:10,height:10,background:colors[i%colors.length],marginRight:6}}/>{s.label}</span>)}</Space></div>
}
