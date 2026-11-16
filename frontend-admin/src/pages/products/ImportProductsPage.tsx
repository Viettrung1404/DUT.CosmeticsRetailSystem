import { Alert, Button, Card, Space, Table, Typography, Upload, message } from 'antd'
import { useState } from 'react'
import { axiosClient } from '../../api/axiosClient'
import { errorText } from '../../api/sprint5Api'
interface ErrorRow {row:number;column:string;message:string}
interface Result {dryRun:boolean;valid:boolean;imported:boolean;summary:{products:{create:number;update:number};variants:{create:number;update:number}};errorCount:number;errors:ErrorRow[]}
const {Title,Text}=Typography
function unwrap<T>(value:unknown):T{if(value&&typeof value==='object'&&'success'in value&&'data'in value)return (value as {data:T}).data;return value as T}
export default function ImportProductsPage(){
 const [msg,holder]=message.useMessage(),[file,setFile]=useState<File|null>(null),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false)
 const download=async(format:'xlsx'|'csv')=>{try{const res=await axiosClient.get('/admin/products/import-template',{params:{format},responseType:'blob'});const url=URL.createObjectURL(res.data as Blob);const a=document.createElement('a');a.href=url;a.download=`mau-nhap-san-pham.${format}`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){msg.error(errorText(e))}}
 const execute=async(dryRun:boolean)=>{if(!file)return;setBusy(true);try{const body=new FormData();body.append('file',file)
 const res=await axiosClient.post('/admin/products/import',body,{params:{dryRun:String(dryRun)},headers:{'Content-Type':'multipart/form-data'}})
 const data=unwrap<Result>(res.data);setResult(data);if(data.valid)msg.success(dryRun?'File hợp lệ, chưa ghi dữ liệu':'Đã nhập sản phẩm');else msg.warning(`Có ${data.errorCount} lỗi, chưa ghi dữ liệu`)
 }catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 return <div>{holder}<div className="glowup-page-header"><div><Title level={2} className="glowup-page-title">Nhập sản phẩm hàng loạt</Title><Text className="glowup-page-subtitle">Excel/CSV: xem trước lỗi với dryRun trước khi ghi vào hệ thống.</Text></div>
 <Space><Button onClick={()=>void download('xlsx')}>Tải mẫu Excel</Button><Button onClick={()=>void download('csv')}>Tải mẫu CSV</Button></Space></div>
 <Card style={{marginBottom:16}}>
 <Upload.Dragger accept=".xlsx,.csv" maxCount={1} beforeUpload={f=>{setFile(f as File);setResult(null);return false}} fileList={file?[{uid:'file',name:file.name,status:'done'}]:[]} onRemove={()=>{setFile(null);setResult(null)}}>
 <p>Kéo thả hoặc chọn file Excel/CSV</p><Text type="secondary">Tối đa 2 MB, 1000 dòng. Dùng file mẫu do Backend cung cấp.</Text>
 </Upload.Dragger>
 <Space style={{marginTop:16}}><Button type="primary" disabled={!file||busy||Boolean(file&&file.size>2*1024*1024)} loading={busy} onClick={()=>void execute(true)}>1. Kiểm tra file (không ghi)</Button>
 <Button danger disabled={!file||!result?.valid||!result.dryRun||busy} loading={busy} onClick={()=>void execute(false)}>2. Xác nhận nhập dữ liệu</Button></Space>
 </Card>
 {result&&<Card title={result.valid?'Kết quả kiểm tra':'Chi tiết lỗi file'} style={{marginBottom:16}}>
 <Alert showIcon type={result.valid?'success':'error'} message={result.valid?(result.imported?'Đã nhập dữ liệu':'File hợp lệ; chưa ghi dữ liệu'):`Có ${result.errorCount} lỗi. Backend không ghi dòng nào.`} style={{marginBottom:12}}/>
 <Space wrap><Text>Sản phẩm tạo: {result.summary?.products.create??0}</Text><Text>Sản phẩm cập nhật: {result.summary?.products.update??0}</Text><Text>Biến thể tạo: {result.summary?.variants.create??0}</Text><Text>Biến thể cập nhật: {result.summary?.variants.update??0}</Text></Space>
 <Table<ErrorRow> rowKey={(_,i)=>String(i)} pagination={{pageSize:15}} dataSource={result.errors??[]} style={{marginTop:16}}
 rowClassName={()=> 'ant-table-row-error'} columns={[{title:'Dòng Excel',dataIndex:'row',width:110},{title:'Cột',dataIndex:'column',width:200},{title:'Thông báo lỗi',dataIndex:'message'}]}/>
 </Card>}
 </div>
}
