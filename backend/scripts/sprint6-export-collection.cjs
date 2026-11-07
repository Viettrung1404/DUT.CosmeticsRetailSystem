const fs = require('node:fs');
const spec = JSON.parse(fs.readFileSync('docs/api/openapi.json', 'utf8'));
function item(name, method, path, body, {publicRoute = false, idempotent = false, tests = []} = {}) {
  const specPath = '/api/v1' + path.replace(/\{\{(\w+)\}\}/g, (_, key) => '{' + ({orderId:'id',returnId:'id',productSlug:'slug'}[key] ?? key) + '}');
  if (!spec.paths[specPath]?.[method.toLowerCase()]) throw new Error(`Request is missing from OpenAPI: ${method} ${specPath}`);
  const headers = body ? [{key:'Content-Type',value:'application/json'}] : [];
  if(idempotent) headers.push({key:'Idempotency-Key',value:'{{idempotencyKey}}',description:'Generate once per command; keep the same key and body for a retry.'});
  return {name,request:{method,header:headers,url:'{{baseUrl}}'+path,...(publicRoute?{auth:{type:'noauth'}}:{}),...(body?{body:{mode:'raw',raw:JSON.stringify(body,null,2),options:{raw:{language:'json'}}}}:{})},...(tests.length?{event:[{listen:'test',script:{type:'text/javascript',exec:tests}}]}:{})};
}
const saveSession = ["if (pm.response.code === 200) { const d = pm.response.json().data; if(d.accessToken) pm.environment.set('accessToken',d.accessToken); if(d.refreshToken) pm.environment.set('refreshToken',d.refreshToken); if(d.challenge) pm.environment.set('oauthChallenge',d.challenge); }"];
const selected = [{variantId:'{{variantId}}',quantity:1}];
const challenge = {challenge:'{{oauthChallenge}}',clientNonce:'{{clientNonce}}'};
const collection = {info:{name:'GlowUp end-user — Sprint 6',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',description:'Import into Apidog as Postman v2.1, or import openapi.json. Fill placeholders in a local environment. External provider credentials are never included. Manual sequence: password login → catalog → preview → confirm quoteVersion → COD checkout; RMA requires Admin completion/inspection. Do not bulk-run writes against production.'},auth:{type:'bearer',bearer:[{key:'token',value:'{{accessToken}}',type:'string'}]},variable:[{key:'baseUrl',value:'http://localhost:3000/api/v1'}],item:[
  {name:'01 Auth/session',item:[
    item('Password login','POST','/auth/login',{email:'{{email}}',password:'{{password}}'},{publicRoute:true,tests:saveSession}),
    item('Current user','GET','/auth/me'),
    item('Rotate refresh token','POST','/auth/refresh-token',{refreshToken:'{{refreshToken}}'},{publicRoute:true,tests:saveSession}),
    item('Logout current session','POST','/auth/logout',{refreshToken:'{{refreshToken}}'},{publicRoute:true}),
  ]},
  {name:'02 OAuth (provider app required)',item:[
    item('Google token exchange','POST','/auth/oauth/google',{idToken:'{{googleIdToken}}',clientNonce:'{{clientNonce}}'},{publicRoute:true,tests:saveSession}),
    item('Facebook classic token exchange','POST','/auth/oauth/facebook',{accessToken:'{{facebookAccessToken}}',clientNonce:'{{clientNonce}}'},{publicRoute:true,tests:saveSession}),
    item('Send email proof','POST','/auth/oauth/email',{...challenge,email:'{{email}}'},{publicRoute:true}),
    item('Complete new account','POST','/auth/oauth/complete',{...challenge,verificationToken:'{{emailVerificationToken}}'},{publicRoute:true,tests:saveSession}),
    item('Link to logged-in owner','POST','/auth/oauth/link',{...challenge,verificationToken:'{{emailVerificationToken}}'},{tests:saveSession}),
  ]},
  {name:'03 Purchase (COD only)',item:[
    item('Public catalog','GET','/customer/products',undefined,{publicRoute:true}),
    item('Product detail','GET','/customer/products/{{productSlug}}',undefined,{publicRoute:true}),
    item('Preview selected items','POST','/orders/preview',{items:selected,usePoints:0},{tests:["if(pm.response.code===200) pm.environment.set('quoteVersion',pm.response.json().data.quoteVersion);"]}),
    item('Create COD order after quote confirmation','POST','/orders',{items:selected,paymentMethod:'COD',quoteVersion:'{{quoteVersion}}',shippingAddress:{recipientName:'Test recipient',phone:'0900000000',addressLine:'Synthetic test address',city:'Da Nang'}},{idempotent:true,tests:["if(pm.response.code===201) { const d=pm.response.json().data; pm.environment.set('orderId',d.id || d.orderId); }"]}),
    item('My order','GET','/orders/{{orderId}}'),
    item('My order tracking','GET','/orders/{{orderId}}/tracking'),
  ]},
  {name:'04 Return/exchange (requires eligible completed order)',item:[
    item('Request REFUND','POST','/returns',{orderId:'{{orderId}}',type:'REFUND',reason:'DEFECTIVE',items:[{orderItemId:'{{orderItemId}}',quantity:1}]},{idempotent:true}),
    item('Request EXCHANGE','POST','/returns',{orderId:'{{orderId}}',type:'EXCHANGE',reason:'WRONG_ITEM',items:[{orderItemId:'{{orderItemId}}',quantity:1}],replacements:[{productVariantId:'{{replacementVariantId}}',quantity:1}]},{idempotent:true}),
    item('View return and quote','GET','/returns/{{returnId}}'),
    item('Accept inspected exchange quote','POST','/returns/{{returnId}}/exchange/accept',{quoteVersion:1,paymentMethod:'COD'},{idempotent:true}),
  ]},
  {name:'05 SEO/readiness',item:[item('Sitemap index','GET','/sitemap.xml',undefined,{publicRoute:true}),item('Robots','GET','/robots.txt',undefined,{publicRoute:true}),item('Readiness','GET','/health/ready',undefined,{publicRoute:true})]},
]};
fs.writeFileSync('docs/api/end-user.postman_collection.json',JSON.stringify(collection,null,2)+'\n');
for(const name of ['local','staging']) {
  const values={baseUrl:name==='local'?'http://localhost:3000/api/v1':'https://api.example.test/api/v1',email:'',password:'',accessToken:'',refreshToken:'',googleIdToken:'',facebookAccessToken:'',clientNonce:'',oauthChallenge:'',emailVerificationToken:'',variantId:'',replacementVariantId:'',productSlug:'',quoteVersion:'',orderId:'',orderItemId:'',returnId:'',idempotencyKey:''};
  fs.writeFileSync(`docs/api/${name}.postman_environment.json`,JSON.stringify({name:`GlowUp ${name} placeholders`,values:Object.entries(values).map(([key,value])=>({key,value,enabled:true,type:'default'})),_postman_variable_scope:'environment'},null,2)+'\n');
}
console.log('Apidog-compatible collection and placeholder environments exported; every request checked against OpenAPI.');
