// Local-only image preview server. Does not expose raw catalog snapshots or .env.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../.catalog-data');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let file,type;
  if(url.pathname==='/' || url.pathname==='/gallery.html'){file=path.join(ROOT,'gallery.html');type='text/html; charset=utf-8';}
  else if(url.pathname==='/demo'){file=path.resolve(ROOT,'../.demo-data/preview.html');type='text/html; charset=utf-8';}
  else if(/^\/images\/[a-f0-9]{24}\.webp$/.test(url.pathname)){file=path.join(ROOT,url.pathname);type='image/webp';}
  else{res.writeHead(404);return res.end();}
  if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':type,'Content-Length':fs.statSync(file).size,'Cache-Control':type==='image/webp'?'public,max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'});
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).pipe(res);
});
server.listen(4010,'127.0.0.1',()=>console.log('Catalog preview: http://localhost:4010'));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
