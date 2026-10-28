const sanitizeHtml=require('sanitize-html');
const clean=value=>sanitizeHtml(value||'',{allowedTags:[],allowedAttributes:{}}).replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ').trim();
const lines=html=>html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'').replace(/<h[1-6]\b[^>]*>/gi,'\n§ ').replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?>/gi,'\n').split('\n').map(clean).filter(Boolean);
const DICTIONARY=[
  ['Niacinamide','niacinamide','vitamin b3'],['Glycerin','glycerin','glycerol'],['Salicylic acid','salicylic acid','axit salicylic'],['Betaine','betaine'],['Panthenol','panthenol','vitamin b5'],
  ['Hyaluronic acid','hyaluronic acid','axit hyaluronic'],['Sodium Hyaluronate','sodium hyaluronate'],['Ceramide','ceramide'],['Retinol','retinol'],['Retinal','retinal'],['Bakuchiol','bakuchiol'],['Adenosine','adenosine'],['Allantoin','allantoin'],
  ['Tranexamic Acid','tranexamic acid','axit tranexamic'],['Kojic Acid','kojic acid','axit kojic'],['Ascorbic Acid','ascorbic acid'],['Vitamin C','vitamin c'],['Vitamin E','vitamin e','tocopherol'],['Lactic Acid','lactic acid','axit lactic'],['Glycolic Acid','glycolic acid','axit glycolic'],['Citric Acid','citric acid'],
  ['Squalane','squalane'],['Urea','urea'],['Collagen thủy phân','hydrolyzed collagen','collagen thủy phân'],['Collagen','collagen'],['Peptide','peptide'],['PDRN','pdrn'],['LHA','lha'],['BHA','bha'],['AHA','aha'],['PHA','pha'],
  ['Rau má','rau má','centella asiatica'],['Diếp cá','diếp cá','houttuynia cordata'],['Bí đao','bí đao','winter melon'],['Nha đam','nha đam','lô hội','aloe vera'],['Trà xanh','trà xanh','green tea'],['Tinh dầu tràm trà','tinh dầu tràm trà','tea tree oil'],['Nước cây bách','nước cây bách'],
  ['Chiết xuất hoa thược dược','hoa dahlia','dahlia variabilis','hoa thược dược'],['Dầu jojoba','dầu jojoba','jojoba oil'],['Bơ hạt mỡ','bơ hạt mỡ','shea butter'],['Dầu argan','dầu argan','argan oil'],['Dầu dừa','dầu dừa','coconut oil'],['Dầu olive','dầu olive','olive oil'],
  ['Chiết xuất yến mạch','yến mạch','oat extract'],['Chiết xuất hoa cúc','hoa cúc','chamomile'],['Mật ong','mật ong','honey extract'],['Keo ong','keo ong','propolis'],['Chiết xuất gạo','chiết xuất gạo','rice extract'],['Bột ngọc trai','bột ngọc trai','pearl powder'],['Cellulose','cellulose'],
  ['Zinc Oxide','zinc oxide'],['Titanium Dioxide','titanium dioxide'],['Dimethicone','dimethicone'],['Benzoyl Peroxide','benzoyl peroxide'],['Arbutin','arbutin'],['Glutathione','glutathione'],['Keratin','keratin'],['Biotin','biotin'],['Caffeine','caffeine'],['Dầu bạc hà','tinh dầu bạc hà','peppermint oil'],['Madecassoside','madecassoside'],
];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function splitList(text){let depth=0,current='',parts=[];for(let index=0;index<text.length;index++){const c=text[index];if(c==='(')depth++;if(c===')')depth=Math.max(0,depth-1);const numericComma=c===','&&/\d/.test(text[index-1]||'')&&/\d/.test(text[index+1]||'');if(!depth&&[',',';','&'].includes(c)&&!numericComma){parts.push(current);current='';}else current+=c;}parts.push(current);return parts.map(s=>s.trim()).filter(Boolean);}
function extractIngredients(html){
  const result=new Map();let active=false;
  function add(raw,evidence,key=true){
    let name=raw.replace(/^[§\s•*+–—-]+/,'').trim();let percentage=null;
    const prefix=name.match(/^(\d+(?:[.,]\d+)?\s*%)\s*(.+)$/);
    if(prefix){percentage=prefix[1].replace(/\s/g,'');name=prefix[2];}
    const suffix=name.match(/\s*\((\d+(?:[.,]\d+)?\s*%)\)/);
    if(suffix){percentage=suffix[1].replace(/\s/g,'');name=name.replace(suffix[0],'');}
    name=name.replace(/\s*\([\d,.]+\s*ppm\)/ig,'').replace(/[.\s]+$/g,'').trim();
    if(name.length<2||name.length>100||/[:;]|thuần chay|công thức|thử nghiệm|thành phần|công dụng|hướng dẫn|hiệu quả|ưu điểm|giúp |hỗ trợ |mang lại|mang đến|sản phẩm|phù hợp|sử dụng|khắc phục|giàu |khả năng|làm mịn|hoạt động|\b(?:apply|helps|provides|contains)\b/i.test(name))return;
    const bare=name.replace(/\s*\((?:vitamin [a-z0-9]+|bha|aha)\)\s*/ig,'').toLowerCase();
    const known=DICTIONARY.find(([, ...aliases])=>aliases.includes(bare));
    if(known)name=known[0];
    if(!known&&!/^(?:chiết xuất|phức hợp|tinh chất|tinh dầu|dầu |nước |bột |nhựa |rễ |nấm |axit |acid |vitamin |protein |amino acid|este axit)/i.test(name)&&!(/^[a-z0-9 (),/.+\-]+$/i.test(name)&&name.length<75))return;
    if(percentage&&!(Number(percentage.replace('%','').replace(',','.'))<=100))percentage=null;
    const k=name.toLocaleLowerCase();const previous=result.get(k);
    if(!previous)result.set(k,{ingredientName:name,percentage,isKeyIngredient:key,evidence,...(percentage&&{concentrationEvidence:evidence})});
    else if(percentage&&!previous.percentageConflict){
      if(previous.percentage&&previous.percentage!==percentage){previous.percentage=null;previous.percentageConflict=true;}
      else {previous.percentage=percentage;previous.concentrationEvidence=evidence;}
    }
  }
  for(let line of lines(html)){
    const isHeading=line.startsWith('§');line=line.replace(/^§\s*/,'');
    const header=line.match(/^(?:thành phần(?:\s+(?:chính|nổi bật|dưỡng|đầy đủ|chi tiết))?[^:]{0,80}|(?:full\s+)?ingredients)\s*(?::|$)/i);
    if(header){active=true;line=line.slice(header[0].length).trim();}
    else if(isHeading||/^(?:hướng dẫn|cách dùng|cách sử dụng|công dụng|hiệu quả|ưu điểm|bảng màu|loại da|làn da|loại tóc|với làn da|lưu ý|bảo quản|how to use|directions|benefits)(?:\s|:|$)/i.test(line)){active=false;continue;}
    if(!line)continue;
    // Avoid converting free-from claims into positive ingredients.
    if(/không (?:chứa|sử dụng|có)|free[ -]from|without|không thành phần/i.test(line))continue;
    const explicitlyContains=/\bcontains?\b|chứa |chiết xuất|thành phần/i.test(line);
    if(!active&&!explicitlyContains)continue;
    const content=line.replace(/^[-•*+–—]\s*/,'');
    if(active){
      const colon=content.indexOf(':');
      if(colon>0&&colon<100)add(content.slice(0,colon),line);
      const parts=splitList(content);
      const inci=parts.length>=3&&parts.every(s=>/^[a-z0-9\s(),/.%+\-]+$/i.test(s));
      if(inci){for(const part of parts)add(part,line,false);continue;}
      else if(/^\d+(?:[.,]\d+)?\s*%/.test(content)&&colon<0)add(content.split(/\s+(?:giúp|hỗ trợ|có tác dụng|được|là)\s+/i)[0],line);
    }
    const ingredientText=line.split(':')[0].split(/\s+(?:giúp|hỗ trợ|kích thích|mang lại|mang đến|làm mịn|hoạt động)\s+/i)[0];
    const lower=ingredientText.toLowerCase();
    for(const [name,...aliases] of DICTIONARY){
      const alias=aliases.find(a=>new RegExp(`(?:^|[^\\p{L}\\d])${escape(a)}(?:$|[^\\p{L}\\d])`,'iu').test(lower));
      if(!alias)continue;
      // Collagen is already represented more specifically by hydrolyzed collagen.
      if(name==='Collagen'&&/hydrolyzed collagen|collagen thủy phân/i.test(line))continue;
      let concentration=null;
      const before=line.match(new RegExp(`(\\d+(?:[.,]\\d+)?\\s*%)\\s*${escape(alias)}`,'i'));
      const after=line.match(new RegExp(`${escape(alias)}\\s*(?:[:(]\\s*)?(\\d+(?:[.,]\\d+)?\\s*%)`,'i'));
      concentration=before?.[1]||after?.[1];
      add((concentration?concentration+' ':'')+name,line);
    }
  }
  return [...result.values()];
}
const TAG_RULES=[
  ['da dầu',/da dầu|oily skin/i],['da khô',/da khô|dry skin/i],['da hỗn hợp',/da hỗn hợp|combination skin/i],['da thường',/da thường|normal skin/i],['da nhạy cảm',/da nhạy cảm|sensitive skin/i],['mọi loại da',/mọi loại da|all skin types/i],
  ['thuần chay',/thuần chay|\bvegan\b/i],['dưỡng ẩm',/dưỡng ẩm|cấp ẩm|giữ ẩm|hydrating|moisturi[sz]/i],['làm sáng',/làm sáng|dưỡng sáng|brightening/i],['làm dịu',/làm dịu|soothing/i],['kiềm dầu',/kiềm dầu|kiểm soát dầu|oil.control/i],['tẩy tế bào chết',/tẩy tế bào chết|exfoliat/i],['chống nắng',/chống nắng|sun protection/i],['chống nước',/chống nước|waterproof/i],['lâu trôi',/lâu trôi|long.wear|long.lasting/i],['dưỡng tóc',/dưỡng tóc|phục hồi tóc|hair treatment/i],
];
function extractTags(product){
  const text=lines(product.name+'\n'+product.description).flatMap(s=>s.split(/[.!?;]/)).map(s=>s.trim()).filter(Boolean);
  const tags=new Set([product.category.name.toLowerCase()]);
  for(const [tag,pattern] of TAG_RULES){
    if(text.some(line=>pattern.test(line)&&!/không phù hợp|không dành|không nên|not suitable|avoid use/i.test(line)))tags.add(tag);
  }
  return [...tags];
}
function extractOrigin(text){
  text=clean(text).split(/Beauty Box là nhà phân phối|Beauty Box sở hữu/)[0];
  const countries='Hàn Quốc|Nhật Bản|Việt Nam|Tây Ban Nha|Thái Lan|Trung Quốc|Canada|Anh Quốc|Đức|Pháp|Mỹ|Ý|Nga';
  const patterns=[
    new RegExp(`(?:là (?:một )?(?:thương hiệu|nhãn hiệu)|thương hiệu mỹ phẩm)[^.]{0,100}?(?:đến từ |từ |của |tại |thuần chay )?(${countries})(?=[ ,.]|$)`),
    new RegExp(`(?:ra đời|thành lập|khởi nguồn)[^.]{0,65}?(?:tại|ở|từ)[^.]{0,30}?(${countries})(?=[ ,.]|$)`),
  ];
  const found=patterns.map(p=>text.match(p)?.[1]).find(Boolean);
  return found?.toLowerCase()==='anh quốc'?'Anh':found||null;
}
function refineCategory(product){
  const name=product.name.replace(/^(?:\[[^\]]+\]|\([^)]*\))\s*/,'');
  if(/^bông tẩy trang/i.test(name))return {slug:'bong-tay-trang',name:'Bông tẩy trang',parent:'phu-kien'};
  if(/^(?:bộ )?cọ\s/i.test(name))return {slug:'co-trang-diem',name:'Cọ trang điểm',parent:'phu-kien'};
  if(/^(?:bộ )?(?:bông mút|mút đánh|mút trang điểm)/i.test(name))return {slug:'mut-trang-diem',name:'Mút trang điểm',parent:'phu-kien'};
  return product.category;
}
module.exports={extractIngredients,extractTags,extractOrigin,refineCategory,clean};
