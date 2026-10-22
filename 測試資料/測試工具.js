(async()=>{
const results=[];let alerts=[];window.alert=t=>alerts.push(t);window.confirm=()=>true;
function test(name,fn){try{if(!fn())throw Error('斷言失敗');results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:String(e)})}}
test('初始空白資料阻擋列印',()=>{let printed=false;window.print=()=>printed=true;$('print').click();return !printed&&alerts.length===1});
for(const [value,expected]of [['100,000',100000],['0',0],['999999999999',999999999999],['1,00',null],['-1',null],['1.5',null],['',null],['1000000000000',null]])test('金額輸入 '+JSON.stringify(value),()=>money(value)===expected);
for(const [value,expected]of [[0,'零'],[4750,'肆仟柒佰伍拾'],[10001,'壹萬零壹'],[100000001,'壹億零壹'],[100010001,'壹億零壹萬零壹'],[100100,'壹拾萬零壹佰']])test('大寫金額 '+value,()=>chinese(value)===expected);
test('閏年及無效日期',()=>validDate('113年2月29日')&&!validDate('114年2月29日')&&!validDate('115年13月1日'));
$('example').click();test('示例差額及預覽',()=>$('balance').textContent==='4,750'&&$('capital').textContent==='新臺幣 肆仟柒佰伍拾 元整（$4,750）');
$('confirmed').checked=true;$('attachment').checked=true;render();test('完整資料通過檢核',()=>errors.length===0);
test('完整資料呼叫列印',()=>{let printed=false;window.print=()=>printed=true;$('print').click();return printed});
$('spent').value='100001';render();test('超支阻擋與隱藏負數',()=>errors.some(t=>t.includes('超過'))&&$('balance').textContent==='—');
$('spent').value='100000';render();test('零餘額提示',()=>$('checks').textContent.includes('繳回金額為 0'));
$('payee').value='其他';render();test('其他抬頭必填',()=>!$('other').hidden&&errors.some(t=>t.includes('其他支票抬頭')));
$('other').value='測試機關';render();test('其他抬頭預覽',()=>$('pPayee').textContent.includes('■其他：測試機關'));
for(const [name,text,date,num]of [
 ['一般公文','發文日期：中華民國115年10月21日\n發文字號：府教社字第1150001234號','115年10月21日','府教社字第1150001234號'],
 ['全形與空白','發文日期：１１５ 年 １０ 月 ２１ 日\n發文字號：府 教 社 字 第 １１５０００１２３４ 號','115年10月21日','府教社字第1150001234號'],
 ['西元日期','發文日期：2026年10月21日\n府教社字第1150001234號','115年10月21日','府教社字第1150001234號'],
 ['發文字號換行','發文日期：115年10月21日\n發文字號：\n府教社字第1150001234號','115年10月21日','府教社字第1150001234號'],
 ['優先發文日期','前案114年1月1日\n發文日期：115年10月21日\n發文字號：府教社字第1150001234號','115年10月21日','府教社字第1150001234號']
 ]){ $('raw').value=text;extract();test(name,()=>$('candidateDate').value===date&&$('candidateNumber').value===num) }
$('raw').value='發文日期：115年10月21日\n發文字號：府教社字第1150001234號';extract();$('apply').click();test('套用辨識後必須重新確認',()=>$('date').value==='115年10月21日'&&!$('confirmed').checked);
let captured;download=(data,name)=>{captured={data,name}};$('save').click();test('草稿匯出有效JSON',()=>JSON.parse(captured.data).fields.number==='府教社字第1150001234號');
await $('load').onchange({target:{files:[new File([captured.data],'draft.json',{type:'application/json'})],value:'draft'}});test('草稿載入往返',()=>$('project').value==='【示例】校園閱讀推廣計畫'&&!$('confirmed').checked);
alerts=[];await $('load').onchange({target:{files:[new File(['bad'],'bad.json')],value:'bad'}});test('無效草稿錯誤提示',()=>alerts.length===1);
$('project').value='<img src=x onerror=alert(1)>';render();test('預覽以純文字呈現',()=>!document.querySelector('[data-field="project"] img'));
$('example').click();$('confirmed').checked=true;$('attachment').checked=true;render();
$('datePicker').value='2024-02-29';$('datePicker').dispatchEvent(new Event('change'));
test('日曆選日期自動轉民國',()=>$('date').value==='113年2月29日'&&!$('confirmed').checked);
$('date').value='115年9月15日';$('date').dispatchEvent(new Event('input'));
test('手填日期同步日曆',()=>$('datePicker').value==='2026-09-15');
$('date').value='115年2月30日';$('date').dispatchEvent(new Event('input'));
test('無效手填日期不帶入日曆',()=>$('datePicker').value==='');
test('核定日期文號無固定斷行',()=>{const date=document.querySelector('#paper [data-field="date"]');return date.nextElementSibling?.dataset.field==='number'});
$('date').value='115年10月21日';$('date').dispatchEvent(new Event('input'));
$('organization').value='測試縣立測試國民小學';$('organization').dispatchEvent(new Event('input'));
test('機關名稱即時更新簽辦單抬頭',()=>document.querySelector('#paper h2 [data-field="organization"]').textContent==='測試縣立測試國民小學');
$('save').click();const orgDraft=captured.data;$('organization').value='其他學校';
await $('load').onchange({target:{files:[new File([orgDraft],'draft.json')],value:'draft'}});
test('機關名稱隨草稿保存及還原',()=>$('organization').value==='測試縣立測試國民小學');
$('example').click();test('試填示例保留使用者機關名稱',()=>$('organization').value==='測試縣立測試國民小學');
$('organization').value='';render();test('機關名稱空白阻擋列印',()=>errors.some(t=>t.includes('機關／學校名稱')));
$('approved').value='10000';$('spent').value='95000';render();
test('超支即時顯示紅色警示與差額',()=>!$('overspendAlert').hidden&&$('overspendDetail').textContent.includes('85,000')&&$('amount-section').classList.contains('has-overspend')&&$('spent').getAttribute('aria-invalid')==='true');
const beforeOverspend=alerts.length;$('spent').dispatchEvent(new Event('blur'));
test('離開實支欄位彈出超支提醒',()=>alerts.length===beforeOverspend+1&&alerts.at(-1).includes('85,000'));
$('approved').dispatchEvent(new Event('blur'));
test('相同超支金額不重複彈出',()=>alerts.length===beforeOverspend+1);
$('spent').value='9500';render();test('金額修正即清除超支警示',()=>$('overspendAlert').hidden&&!$('amount-section').classList.contains('has-overspend')&&$('spent').getAttribute('aria-invalid')==='false');
$('approved').value='9000';render();$('approved').dispatchEvent(new Event('blur'));
test('降低核定數造成超支也提醒',()=>!$('overspendAlert').hidden&&alerts.length===beforeOverspend+2&&alerts.at(-1).includes('500'));
$('spent').value='';render();test('金額缺漏不誤報超支',()=>$('overspendAlert').hidden);
$('example').click();$('confirmed').checked=true;$('attachment').checked=true;render();
organization.value='【示例】測試國民小學';render();
const excelParts=buildExcelFiles(),excelDoc=new DOMParser().parseFromString(excelParts['xl/worksheets/sheet1.xml'],'application/xml');
test('Excel所有XML皆可解析',()=>Object.values(excelParts).filter(xml=>typeof xml==='string').every(xml=>!new DOMParser().parseFromString(xml,'application/xml').querySelector('parsererror')));
test('Excel金額為數字且保留差額公式',()=>excelDoc.querySelector('c[r="B18"] v').textContent==='100000'&&excelDoc.querySelector('c[r="F18"] v').textContent==='95250'&&excelDoc.querySelector('c[r="B19"] f').textContent==='B18-F18'&&excelDoc.querySelector('c[r="B19"] v').textContent==='4750');
$('project').value='=HYPERLINK("外部") & <測試>';const safeExcel=buildExcelFiles();
test('Excel文字特殊字元安全保留且非公式',()=>{const doc=new DOMParser().parseFromString(safeExcel['xl/worksheets/sheet1.xml'],'application/xml');const cell=doc.querySelector('c[r="B5"]');return cell.getAttribute('t')==='inlineStr'&&!cell.querySelector('f')&&cell.querySelector('t').textContent===$('project').value});
$('project').value='【示例】Excel匯出測試';
const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;let excelBlob,excelName;
URL.createObjectURL=blob=>{excelBlob=blob;return 'blob:excel-test'};HTMLAnchorElement.prototype.click=function(){excelName=this.download};
$('downloadExcel').click();
test('Excel下載副檔名與MIME正確',()=>excelName==='賸餘款簽辦單.xlsx'&&excelBlob?.type==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
const excelBytes=new Uint8Array(await excelBlob.arrayBuffer());test('Excel為真正ZIP封裝',()=>excelBytes[0]===80&&excelBytes[1]===75&&excelBytes.length>1000);
let binary='';for(const byte of excelBytes)binary+=String.fromCharCode(byte);const output=document.createElement('pre');output.id='excel-test-file';output.textContent=btoa(binary);document.body.append(output);
excelBlob=null;$('spent').value='100001';$('downloadExcel').click();test('超支時阻擋Excel下載',()=>excelBlob===null);
$('spent').value='95250';$('attachment').checked=false;$('downloadExcel').click();test('未完成附件確認阻擋Excel下載',()=>excelBlob===null);
URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick;
for(const [n,expected]of [[0,'0元'],[9500,'9,500元'],[10000,'1萬元'],[12345,'1萬2,345元'],[100000000,'1億元'],[100000001,'1億1元'],[123456789,'1億2,345萬6,789元'],[999999999999,'9,999億9,999萬9,999元']])test('億萬元格式 '+n,()=>amountInUnits(n)===expected);
$('approved').value='10000';$('spent').value='9500';render();
test('簽辦單金額合併為大寫與括號數字',()=>$('pApproved').textContent==='1萬元'&&$('pSpent').textContent==='9,500元'&&$('capital').textContent==='新臺幣 伍佰 元整（$500）'&&$('pBalance').hidden);
const revisedSheet=new DOMParser().parseFromString(buildExcelFiles()['xl/worksheets/sheet1.xml'],'application/xml');
test('Excel同步億萬元及大寫括號格式',()=>revisedSheet.querySelector('c[r="B8"] v').textContent==='1萬元'&&revisedSheet.querySelector('c[r="F8"] v').textContent==='9,500元'&&revisedSheet.querySelector('c[r="B9"] v').textContent==='新臺幣 伍佰 元整（$500）');
test('Excel完整沿用範本合併與列印設定',()=>{const d=new DOMParser().parseFromString(buildExcelFiles()['xl/worksheets/sheet1.xml'],'application/xml');return !!d.querySelector('mergeCell[ref="C13:D15"]')&&!!d.querySelector('mergeCell[ref="A14:B14"]')&&d.querySelector('pageSetup').getAttribute('paperSize')==='9'&&buildExcelFiles()['xl/workbook.xml'].includes('$A$1:$G$16')});
test('新版簽章區與分列機關日期',()=>document.querySelector('#paper .paper-sign-head').textContent.includes('出納組')&&document.querySelector('#paper .paper-supervisor').textContent==='單位主管'&&document.querySelector('#paper .paper-agency [data-field="agency"]')&&document.querySelector('#paper .paper-approval [data-field="date"]'));
test('OCR去除中英文空白並保留換行',()=>compactOCRText('發 文 日 期：115 年 10 月 6 日\n府 教 學 特 字 第 1150265734 號'.replace('\n','\n'))==='發文日期：115年10月6日\n府教學特字第1150265734號');
test('OCR移除全形空格Tab及不換行空白',()=>compactOCRText('主　旨：\t核\u00a0定\r\n計 畫')==='主旨：核定\r\n計畫');
$('raw').value='發 文 日 期：115 年 10 月 6 日\n發 文 字 號：府 教 學 特 字 第 1150265734 號';extract();
test('OCR結果顯示時已去除空格',()=>$('raw').value==='發文日期：115年10月6日\n發文字號：府教學特字第1150265734號');
const clipboardDescriptor=Object.getOwnPropertyDescriptor(navigator,'clipboard');let copiedOCR='';
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copiedOCR=text}}});
$('raw').value='電 子 信 箱：a @mail . cyhg . gov . tw\n主 旨：核 定';await $('copyOCR').onclick();
test('OCR複製全文使用去空格文字',()=>copiedOCR==='電子信箱：a@mail.cyhg.gov.tw\n主旨：核定'&&$('raw').value===copiedOCR);
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked')}}});
$('raw').value='主 旨：核 定\n測 試';await $('copyOCR').onclick();
test('OCR複製失敗仍可選取去空格全文',()=>$('raw').value==='主旨：核定\n測試'&&$('raw').selectionEnd===$('raw').value.length&&$('copyOCRStatus').textContent.includes('Ctrl+C'));
if(clipboardDescriptor)Object.defineProperty(navigator,'clipboard',clipboardDescriptor);else delete navigator.clipboard;
const report=document.createElement('pre');report.id='test-report';report.textContent=JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,results},null,2);document.body.prepend(report);
document.title='TESTS DONE';
})();
