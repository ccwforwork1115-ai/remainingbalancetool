(async()=>{
const results=[];function test(name,value){results.push({name,pass:!!value})}
window.alert=()=>{};window.confirm=()=>true;
const fixtures=window.documentFixtures;
for(const c of fixtures){
 const local=parseDocument(c.text),response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:c.text})}),remote=await response.json();
 const matches=r=>['project','date','number','approved'].every(k=>!(k in c)||r[k]===c[k])&&(!('count'in c)||r.candidates.length===c.count)&&(!('amountCount'in c)||r.amountCandidates.length===c.amountCount)&&(!c.hintIncludes||r.hint.includes(c.hintIncludes))&&(!c.hintExcludes||!r.hint.includes(c.hintExcludes));
 test('瀏覽器：'+c.name,matches(local));test('Python API：'+c.name,response.ok&&matches(remote));
}
test('截圖入口位於手填區之前',$('ocr-section').compareDocumentPosition($('project-section'))&Node.DOCUMENT_POSITION_FOLLOWING);
const originalOCR=$('ocr').onclick;let calls=0;$('ocr').onclick=async()=>{calls++};
const mini=document.createElement('canvas');mini.width=10;mini.height=10;const miniBlob=await new Promise(r=>mini.toBlob(r));
const f=new File([miniBlob],'test.png',{type:'image/png'});function transfer(){const dt=new DataTransfer();dt.items.add(f);return dt}const dt=transfer();
$('image').files=dt.files;$('image').dispatchEvent(new Event('change'));test('選圖自動觸發辨識',calls===1);
$('dropZone').dispatchEvent(new DragEvent('drop',{dataTransfer:transfer(),bubbles:true,cancelable:true}));test('拖放自動觸發辨識',calls===2);
document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer(),bubbles:true,cancelable:true}));test('貼圖自動觸發辨識',calls===3);
$('ocr').onclick=originalOCR;
$('raw').value=fixtures[0].text;await extractWithPython();
test('Python結果顯示名稱與來源',$('candidateProject').value==='115年度校園閱讀推廣計畫'&&$('parserBadge').textContent==='Python 已整理');
$('project').value='原計畫';$('date').value='114年1月1日';$('number').value='原文號';$('confirmed').checked=true;$('apply').click();
test('套用三個欄位且需重新核對',$('project').value==='115年度校園閱讀推廣計畫'&&$('date').value==='115年10月21日'&&$('number').value==='府教社字第1150001234號'&&!$('confirmed').checked);
$('raw').value='發文日期：115年10月22日';await extractWithPython();$('apply').click();
test('未辨識到欄位不清空原資料',$('project').value==='115年度校園閱讀推廣計畫'&&$('number').value==='府教社字第1150001234號'&&$('date').value==='115年10月22日');
$('raw').value=fixtures[4].text;await extractWithPython();test('多專案保留候選供選擇',$('candidateProject').value===''&&$('projectOptions').children.length===2&&$('projectExtractHint').textContent.includes('多個專案'));
$('raw').value='主旨：核定並撥付新臺幣（以下同）4,815元整。';await extractWithPython();$('spent').value='1000';$('apply').click();
test('核定數帶入與自動計算',$('approved').value==='4815'&&$('balance').textContent==='3,815');
$('raw').value='主旨：請查照。';await extractWithPython();test('無金額不清空核定數',$('candidateApproved').value===''&&$('approved').value==='4815');
$('candidateApproved').value='-100';$('apply').click();test('候選核定數拒絕負數',$('approved').value==='4815');
// 真實OCR：合成截圖包含公文主旨，經Tesseract後送入本機Python。
const canvas=document.createElement('canvas');canvas.width=1900;canvas.height=520;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1900,520);ctx.fillStyle='black';ctx.font='44px Microsoft JhengHei';
ctx.fillText('嘉義縣政府 函',60,80);ctx.fillText('發文日期：中華民國115年10月21日',60,180);ctx.fillText('發文字號：府教社字第1150001234號',60,280);ctx.fillText('主旨：核定「115年度校園閱讀推廣計畫」補助經費，請查照。',60,380);
const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));selectImage(new File([blob],'完整主旨測試.png',{type:'image/png'}));await $('ocr').onclick();
test('實際圖片OCR擷取日期',$('candidateDate').value==='115年10月21日');
test('實際圖片OCR擷取文號',$('candidateNumber').value==='府教社字第1150001234號');
test('實際圖片OCR擷取專案名稱',$('candidateProject').value==='115年度校園閱讀推廣計畫');
test('完整流程使用Python整理',$('parserBadge').textContent==='Python 已整理');
test('辨識後恢復可操作',!busy&&!$('ocr').disabled&&$('ocr-section').getAttribute('aria-busy')==='false');
return {total:results.length,passed:results.filter(r=>r.pass).length,results,ocrText:$('raw').value,ocrProject:$('candidateProject').value,ocrDate:$('candidateDate').value,ocrNumber:$('candidateNumber').value};
})();
