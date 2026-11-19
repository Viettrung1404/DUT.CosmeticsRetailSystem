import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { apiGet, apiPut, errorText } from '../../api/sprint5Api'
type Values={siteName:string;siteDescription:string;defaultOgImage?:string|null;defaultKeywords?:string|null}
export default function SeoSettingsPage(){
 const [form]=Form.useForm<Values>(),[msg,holder]=message.useMessage(),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setReady(false);setError('');try{form.setFieldsValue(await apiGet<Values>('/admin/settings/seo'));setReady(true)}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const save=async(v:Values)=>{setBusy(true);try{await apiPut('/admin/settings/seo',{...v,defaultOgImage:v.defaultOgImage?.trim()||null,defaultKeywords:v.defaultKeywords?.trim()||null});msg.success('Đã lưu cấu hình SEO')}catch(e){msg.error(errorText(e))}finally{setBusy(false)}}
 return <Space direction="vertical" style={{width:'100%'}} size={16}>{holder}<Typography.Title level={2}>Cấu hình SEO toàn trang</Typography.Title>{error&&<Alert type="error" message={error}/>}<Card loading={busy&&!ready}><Form form={form} layout="vertical" onFinish={save} disabled={busy||!ready}><Form.Item name="siteName" label="Tên website" rules={[{required:true,whitespace:true,max:100}]}><Input/></Form.Item><Form.Item name="siteDescription" label="Mô tả website" rules={[{required:true,whitespace:true,max:300}]}><Input.TextArea rows={4} showCount maxLength={300}/></Form.Item><Form.Item name="defaultOgImage" label="Ảnh Open Graph mặc định (URL)" rules={[{validator:(_,v)=>!v||/^https?:\/\/[^\s]+$/i.test(v)?Promise.resolve():Promise.reject(new Error('URL phải bắt đầu bằng HTTP hoặc HTTPS'))}]}><Input/></Form.Item><Form.Item name="defaultKeywords" label="Từ khóa mặc định" rules={[{max:255}]}><Input/></Form.Item><Button htmlType="submit" type="primary" loading={busy}>Lưu cấu hình</Button></Form></Card><Button onClick={()=>void load()} loading={busy}>Tải lại cấu hình</Button></Space>
}
