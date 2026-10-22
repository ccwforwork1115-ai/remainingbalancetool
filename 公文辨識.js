function fullwidthPunctuation(text){return text.replace(/[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0xfee0))}
function unquotedProjects(subject){
 const output=[],prefix=/^(?:有關|茲|本府|同意|核定|核准|補助|貴校|本校|各校|貴單位|辦理|推動|執行|申請|所提|所報|提報|申辦|之)/;
 for(const clause of subject.split(/[，,。；;！？!?]/)){
  if(!/^(?:有關|茲|本府|同意|核定|核准|補助|貴校|本校|貴單位)/.test(clause))continue;
  let clean=clause;while(prefix.test(clean))clean=clean.replace(prefix,'');
  const budget=clean.search(/(?:補助經費|經費補助|所需經費|所需款項|補助款|經費|款項)(?=新臺幣|計|共|為|業|已|案|一案|核定|核准|[\d壹貳參肆伍陸柒捌玖拾佰仟萬零]|$)/);
  if(budget>=0)clean=clean.slice(0,budget);
  clean=clean.replace(/(?:一案|乙案|予以核定|准予補助)$/,'');
  for(let part of clean.replace(/(計畫|方案|專案|活動|工程)(?:及|暨|與|、)/g,'$1\u0000').split('\u0000')){
   while(prefix.test(part))part=part.replace(prefix,'');
   const strong=part.match(/^(.{2,140}(?:計畫|方案|專案|活動|工程))(?:補助|經費|辦理|執行|核定|案|$)/);
   const fee=/^.{2,140}(?:交通費|鐘點費|出席費|膳費|住宿費|材料費|保險費)$/.test(part);
   const name=strong?strong[1]:(budget>=0||fee)?part:'';
   if(name.length>=4&&name.length<=160&&!/^(?:相關|旨揭|前揭|上開|該項|本項|本案|賸餘款|核銷|結報|繳回|請|款項)/.test(name)&&!/(?:要點|辦法|規定|事宜)$/.test(name)&&!output.includes(name))output.push(name);
  }
 }
 return output;
}
function parseDocument(text){
 const t=text.normalize('NFKC').replace(/[ \t\u3000]+/g,'').replace(/\r/g,''),flat=t.replace(/\n/g,'');
 const pattern='(?:中華民國|民國)?(\\d{2,4})年(\\d{1,2})月(\\d{1,2})日';
 const d=flat.match(new RegExp('發文日期[:：]?'+pattern))||flat.match(new RegExp(pattern));let day='';
 if(d){const y=+d[1]>1911?+d[1]-1911:+d[1];const value=`${y}年${+d[2]}月${+d[3]}日`;if(validDate(value))day=value}
 const n=t.replace(/:\n/g,':').match(/發文字號[:：]?([^\n]{0,40}?第[\d\-]+號)/)||t.match(/([^\n:：]{1,18}字第[\d\-]+號)/);
 const match=flat.match(/主旨[:：]?(.*)/),rawSubject=match?match[1].split(/(?:說明|辦法|正本|副本|附件)[:：]/)[0]:'',subject=rawSubject.replaceAll('特殊需求學生發所與輔導','特殊需求學生發掘與輔導').replaceAll('學前階段巡迴輔導教師巡迴了服務交通費','學前階段巡迴輔導教師巡迴服務交通費');
 let candidates=[];const add=value=>{value=value.replace(/^[\s:：，。；、"]+|[\s:：，。；、"]+$/g,'');if(value.length>=3&&value.length<=160&&!candidates.includes(value))candidates.push(value)};
 const pairs={'「':'」','『':'』','"':'"','“':'”'},stack=[],quotes=[];
 for(let i=0;i<subject.length;i++){const ch=subject[i];if(stack.length&&ch===stack[stack.length-1][1]){const [start]=stack.pop(),before=subject.slice(0,start);if(/(?:以下簡稱|以下稱|下稱|簡稱)[:：]?$/.test(before))continue;const title=subject.slice(start+1,i),year=before.match(/(\d{2,4}(?:學年度|年度|年)(?:\d{1,2}月?(?:至|到|[-~～])\d{1,2}月|\d{1,2}月)?)$/);quotes.push(year?year[1]+'「'+title+'」':title)}else if(pairs[ch])stack.push([i,pairs[ch]])}
 quotes.sort((a,b)=>b.length-a.length).filter(q=>/(?:計畫|方案|專案|活動|工程)/.test(q)).forEach(add);
 if(!candidates.length)quotes.filter(q=>q.length>=6&&!/(?:法規|要點|規定|辦法|注意事項)$/.test(q)).forEach(add);
 const label=t.match(/(?:專案名稱|計畫名稱)[:：]([^\n。；]{3,160})/);if(label)candidates=[...new Set([label[1].trim(),...candidates])];
 let method=candidates.length?'quoted':'';
 if(!candidates.length&&subject){unquotedProjects(subject).forEach(add);if(candidates.length)method='inferred'}
 if(!candidates.length&&subject){for(const m of subject.matchAll(/((?:\d{2,4}年(?:度|學年度)?|\d{2,3}學年度)[^，。；:：]{2,100}?(?:計畫|方案|專案|活動|工程))/g))add(m[1].replace(/^(\d{2,4}年(?:度|學年度)?)(?:核定|補助|辦理|推動)/,'$1'));if(candidates.length)method='inferred'}
 const project=candidates.length===1?candidates[0]:'';
 let hint=candidates.length>1?'主旨出現多個專案，請從下拉建議選擇或自行修正。':project?(method==='quoted'?'已從主旨擷取名稱，請核對是否為完整核定名稱。':'此名稱由主旨推測，請特別核對名稱是否完整。'):'未找到明確專案名稱，請補截主旨或手動填寫。';
 if(rawSubject.includes('特殊需求學生發所與輔導'))hint+=' 已依專案用語將「發所」校正為「發掘」，請對照截圖確認；辨識原文仍保留於文字區。';
 if(rawSubject.includes('學前階段巡迴輔導教師巡迴了服務交通費'))hint+=' 已依專案用語將「巡迴了服務」校正為「巡迴服務」，請對照截圖確認；辨識原文仍保留於文字區。';
 return {project:fullwidthPunctuation(project),date:day,number:fullwidthPunctuation(n?n[1]:''),subject:fullwidthPunctuation(subject),candidates:candidates.map(fullwidthPunctuation),hint,engine:'browser',...parseApprovedAmount(flat)};
}
const reviewFields=[['candidateProject','專案名稱'],['candidateDate','核定日期'],['candidateNumber','核定文號'],['candidateApproved','核定金額']];
function updateReviewState(editedId){
 let count=0;const missing=[];
 for(const[id,label]of reviewFields){const input=$(id),filled=!!input.value.trim();if(editedId===id)input.dataset.edited='true';if(filled)count++;else missing.push(label);input.closest('.review-field').dataset.state=filled?'filled':'missing';$(id+'State').textContent=filled?(input.dataset.edited==='true'?'已編輯 · 請核對':'已擷取 · 請核對'):'未擷取 · 可補填'}
 $('reviewCount').textContent=count+' / 4 項有資料';$('reviewSummary').textContent=missing.length?'請核對下方內容；'+missing.join('、')+'尚無資料，可在此補填。':'四項都有資料，請對照原公文確認內容；需要修改可直接編輯。';
 $('apply').disabled=count===0;$('apply').textContent=count?'確認並帶入這 '+count+' 項資料 ↓':'請先補填要帶入的資料';
}
function compactOCRText(text){return String(text).replace(/[^\S\r\n]+/g,'')}
function showDocumentResult(result){
 $('raw').value=compactOCRText($('raw').value);
 $('copyOCR').disabled=!$('raw').value.trim();$('copyOCRStatus').textContent='';$('ocrResults').hidden=false;$('candidateProject').value=result.project;$('candidateDate').value=result.date;$('candidateNumber').value=result.number;
 $('candidateApproved').value=result.approved?Number(result.approved).toLocaleString('zh-TW'):'';$('amountExtractHint').textContent=result.amountHint||'請核對核定金額。';
 $('amountOptions').replaceChildren(...(result.amountCandidates||[]).map(value=>{const option=document.createElement('option');option.value=Number(value).toLocaleString('zh-TW');return option}));
 $('subjectText').textContent=result.subject||'未辨識到主旨，請確認截圖包含「主旨」與後方文字。';$('subjectDetails').open=!result.project;
 $('projectExtractHint').textContent=result.hint;$('parserBadge').textContent=result.engine==='python'?'Python 已整理':'瀏覽器已整理';
 $('projectChoices').replaceChildren(...result.candidates.filter(value=>result.candidates.length>1).map(value=>{const button=document.createElement('button');button.type='button';button.textContent=value;button.onclick=()=>{$('candidateProject').value=value;extractionVersion++;updateReviewState('candidateProject')};return button}));
 reviewFields.forEach(([id])=>delete $(id).dataset.edited);updateReviewState();
 $('projectOptions').replaceChildren(...result.candidates.map(value=>{const option=document.createElement('option');option.value=value;return option}));
 const found=[result.project&&'專案名稱',result.date&&'日期',result.number&&'文號',result.approved&&'核定數'].filter(Boolean);
 $('status').textContent=found.length?'已擷取'+found.join('、')+'，請核對下方結果後套用。':'未找到明確資料，請補截到主旨或手動修正。';
}
function extract(){const result=parseDocument($('raw').value);showDocumentResult(result);return result}
let extractionVersion=0;
['candidateProject','candidateDate','candidateNumber','candidateApproved'].forEach(id=>$(id).addEventListener('input',()=>{extractionVersion++;updateReviewState(id)}));
async function extractWithPython(){
 const version=++extractionVersion,text=$('raw').value;const result=extract();
 if(document.documentElement.dataset.pythonApi!=='true')return result;
 try{
  const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('parser');const data=await response.json();
  if(version!==extractionVersion||$('raw').value!==text)return result;
  if(typeof data.project!=='string'||!Array.isArray(data.candidates))throw Error('format');
  showDocumentResult(data);return data;
 }catch{
  if(version===extractionVersion){$('parserBadge').textContent='瀏覽器已整理';$('status').textContent+=' 本機文字服務暫時無法連線，已使用瀏覽器整理結果。'}
  return result;
 }
}
$('extract').onclick=async()=>{if(!$('raw').value.trim()){$('status').textContent='請先貼上公文文字。';$('raw').focus();return}$('extract').disabled=true;try{await extractWithPython()}finally{$('extract').disabled=false}};
$('apply').onclick=()=>{
 const mapping=[['candidateProject','project'],['candidateDate','date'],['candidateNumber','number'],['candidateApproved','approved']],updates=mapping.filter(([from])=>$(from).value.trim());
 const amount=$('candidateApproved').value.trim();if(amount&&money(amount.normalize('NFKC'))===null){alert('核定數請填寫有效的整數元，例如4,815。');$('candidateApproved').focus();return}
 if(!updates.length){alert('尚無可套用的辨識結果');return}
 if(updates.some(([from,to])=>$(to).value.trim()&&$(from).value.trim()!==$(to).value.trim())&&!confirm('以這次辨識結果更新已有的專案資料？未辨識到的欄位會保留。'))return;
 for(const[from,to]of updates)$(to).value=to==='approved'?String(money($(from).value.trim().normalize('NFKC'))):fullwidthPunctuation($(from).value.trim());
 $('confirmed').checked=false;render();$('actionStatus').textContent='已帶入辨識資料，請核對專案名稱、日期與文號。';
 $('project-section').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
};
let imageFile=null,imageUrl=null,busy=false;
function selectImage(file){
 if(busy)return false;
 if(!file||!/^image\/(png|jpeg|webp|bmp)$/.test(file.type)){alert('請選取 PNG、JPEG、WebP 或 BMP 圖片');return false}
 if(file.size>15*1024*1024){alert('圖片請小於15MB');return false}
 imageFile=file;extractionVersion++;if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(file);$('photo').src=imageUrl;
 $('imagePanel').hidden=false;$('imageName').textContent=file.name||'貼上的公文截圖';$('ocr').disabled=false;$('ocrResults').hidden=true;$('copyOCR').disabled=true;$('copyOCRStatus').textContent='';
 ['candidateProject','candidateDate','candidateNumber','candidateApproved','raw'].forEach(id=>$(id).value='');$('subjectText').textContent='';$('status').textContent='圖片已就緒，正在準備辨識。';return true;
}
function receiveImage(file){if(selectImage(file))void $('ocr').onclick()}
$('image').onchange=e=>{if(e.target.files[0])receiveImage(e.target.files[0]);e.target.value=''};
$('dropZone').onclick=()=>{if(!busy)$('image').click()};
$('dropZone').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!busy)$('image').click()}};
$('replaceImage').onclick=()=>{if(!busy)$('image').click()};
['dragenter','dragover'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();if(!busy)$('dropZone').classList.add('drag-active')}));
['dragleave','drop'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.remove('drag-active')}));
$('dropZone').addEventListener('drop',e=>{if(!busy&&e.dataTransfer.files[0])receiveImage(e.dataTransfer.files[0])});
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()});document.addEventListener('drop',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()});
document.addEventListener('paste',e=>{const item=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();if(!busy)receiveImage(item.getAsFile())}});
let ocrLoader;
function loadOCR(){
 if(window.Tesseract)return Promise.resolve();if(ocrLoader)return ocrLoader;
 ocrLoader=new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(()=>{script.remove();ocrLoader=null;reject(Error('timeout'))},20000);script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();ocrLoader=null;reject(Error('load'))};document.head.append(script)});return ocrLoader;
}
$('ocr').onclick=async()=>{
 if(!imageFile||busy)return;busy=true;$('ocr').disabled=true;$('image').disabled=true;$('replaceImage').disabled=true;$('extract').disabled=true;$('dropZone').setAttribute('aria-disabled','true');$('ocr-section').setAttribute('aria-busy','true');$('ocr').textContent='辨識中…';let worker;
 try{
  $('status').textContent='正在載入繁體中文辨識引擎，首次使用可能需要一些時間…';await loadOCR();
  worker=await Tesseract.createWorker('chi_tra+eng',1,{logger:m=>{const labels={'loading tesseract core':'載入辨識引擎','loading language traineddata':'下載繁體中文語言檔','initializing api':'準備文字辨識','recognizing text':'辨識公文內容'};$('status').textContent=(labels[m.status]||'準備辨識中')+(m.progress!=null?' '+Math.round(m.progress*100)+'%':'')}});
  const result=await worker.recognize(imageFile);$('raw').value=compactOCRText(fullwidthPunctuation(result.data.text));await extractWithPython();
 }catch{
  $('status').textContent='辨識未完成。請確認網路後按「重新辨識」，也可選擇「直接登打」自行填寫資料。';
 }finally{
  if(worker)await worker.terminate().catch(()=>{});busy=false;$('ocr').disabled=false;$('image').disabled=false;$('replaceImage').disabled=false;$('extract').disabled=false;$('dropZone').setAttribute('aria-disabled','false');$('ocr-section').setAttribute('aria-busy','false');$('ocr').textContent='重新辨識';
 }
};

function setEntryMode(manual){
 $('ocrContent').hidden=manual;$('manualModeHint').hidden=!manual;
 $('modeManual').setAttribute('aria-pressed',String(manual));$('modeOCR').setAttribute('aria-pressed',String(!manual));
 if(manual)$('project').focus({preventScroll:true});
}
$('modeManual').onclick=()=>setEntryMode(true);$('modeOCR').onclick=()=>setEntryMode(false);
$('copyOCR').onclick=async()=>{
 const text=compactOCRText($('raw').value);$('raw').value=text;if(!text.trim())return;
 try{await navigator.clipboard.writeText(text);$('copyOCRStatus').textContent='已複製全部辨識文字。'}
 catch{$('raw').focus();$('raw').select();$('copyOCRStatus').textContent='已選取全部文字，請按 Ctrl+C 或使用裝置的複製功能。'}
};
