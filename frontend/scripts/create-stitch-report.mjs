import {readdir,writeFile} from 'node:fs/promises';
const folder=new URL('../test-results/stitch-review/',import.meta.url);
const files=await readdir(folder);
const sources=files.filter(file=>file.endsWith('-source.png')).sort();
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const sections=sources.map(source=>{
 const name=source.replace('-source.png','');
 const actual=files.includes(`${name}-corrected.png`)?`${name}-corrected.png`:`${name}-actual.png`;
 if(!files.includes(actual))return '';
 return `<section id="${name}"><h2>${name}</h2><div class="pair"><figure><figcaption>Stitch code.html</figcaption><a href="${source}"><img loading="lazy" src="${source}" alt="${escape(name)} Stitch"></a></figure><figure><figcaption>Ứng dụng · dữ liệu backend thật</figcaption><a href="${actual}"><img loading="lazy" src="${actual}" alt="${escape(name)} app"></a></figure></div></section>`;
}).join('');
await writeFile(new URL('review.html',folder),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Đối chiếu Stitch FE-03–06</title><style>body{font:14px/1.5 system-ui;margin:24px;background:#faedf0;color:#412e27}h1{font-size:26px}section{margin:40px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;max-height:900px;overflow:auto;background:white;border:1px solid #e5d7db;border-radius:12px}figcaption{position:sticky;top:0;background:white;padding:12px;font-weight:700}img{width:100%;display:block}a{color:#9d394f}@media(max-width:767px){.pair{grid-template-columns:1fr}}</style><h1>Đối chiếu Stitch FE-03–06</h1><p>Ảnh cùng kích thước viewport. Header/sidebar/footer theo nguồn chung trong planning; nội dung và trạng thái thực khác dữ liệu mẫu. Bấm ảnh để xem đầy đủ. Đây là artifact review, không phải xác nhận nghiệm thu cuối.</p>${sections}</html>`);
console.log(`Created test-results/stitch-review/review.html (${sources.length} reference screenshots).`);
