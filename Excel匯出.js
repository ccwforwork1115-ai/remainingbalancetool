// 本機 XLSX 匯出：以不壓縮 ZIP 封裝標準 OOXML，不需網路或額外套件。
function excelXml(value){return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function excelZip(files){
 const encode=new TextEncoder(),parts=[],directory=[];let offset=0;
 const crc32=data=>{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0};
 for(const [path,xml]of Object.entries(files)){
  const name=encode.encode(path),data=typeof xml==='string'?encode.encode(xml):xml,crc=crc32(data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
  parts.push(header,data);directory.push(central);offset+=header.length+data.length;
 }
 const size=directory.reduce((n,item)=>n+item.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,directory.length,true);e.setUint16(10,directory.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function buildExcelFiles(){
 const decoder=new TextDecoder(),files={};
 for(const [name,base64]of Object.entries(excelTemplateBase64)){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));files[name]=name.endsWith('.bin')?bytes:decoder.decode(bytes)}
 files['xl/sharedStrings.xml']=files['xl/sharedStrings.xml'].replace('2.待出納組通知領取賸餘款支票。','2.待出納組通知領取賸餘款支票；另請出納組協助影印核章後支票附於傳票後，作為證明文件。');
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',doc=new DOMParser().parseFromString(files['xl/worksheets/sheet1.xml'],'application/xml'),data=doc.getElementsByTagName('sheetData')[0];
 function cell(ref){let c=[...doc.getElementsByTagName('c')].find(e=>e.getAttribute('r')===ref);if(c)return c;const n=ref.match(/\d+/)[0];let row=[...data.children].find(e=>e.getAttribute('r')===n);if(!row){row=doc.createElementNS(ns,'row');row.setAttribute('r',n);row.setAttribute('ht','32');row.setAttribute('customHeight','1');data.append(row)}c=doc.createElementNS(ns,'c');c.setAttribute('r',ref);c.setAttribute('s','10');row.append(c);return c}
 function setCell(ref,value,formula){const c=cell(ref);c.replaceChildren();const string=typeof value==='string';if(formula){if(string)c.setAttribute('t','str');else c.removeAttribute('t');const f=doc.createElementNS(ns,'f');f.textContent=formula;c.append(f);const v=doc.createElementNS(ns,'v');v.textContent=String(value);c.append(v)}else if(string){c.setAttribute('t','inlineStr');const is=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=value;is.append(t);c.append(is)}else{c.removeAttribute('t');const v=doc.createElementNS(ns,'v');v.textContent=String(value);c.append(v)}}
 const a=money($('approved').value),s=money($('spent').value),balance=a-s;
 const unitFormula=ref=>`IF(INT(${ref}/100000000)>0,TEXT(INT(${ref}/100000000),"#,##0")&"億","")&IF(MOD(INT(${ref}/10000),10000)>0,TEXT(MOD(INT(${ref}/10000),10000),"#,##0")&"萬","")&IF(OR(MOD(${ref},10000)>0,${ref}=0),TEXT(MOD(${ref},10000),"#,##0"),"")&"元"`;
 setCell('A2',$('organization').value);setCell('B5',$('project').value);setCell('B6',$('agency').value);setCell('B7',$('date').value+$('number').value);
 setCell('B8',amountInUnits(a),unitFormula('B18'));setCell('F8',amountInUnits(s),unitFormula('F18'));
 setCell('B9',refundAmount(balance),'"新臺幣 '+chinese(balance)+' 元整（$"&TEXT(B19,"#,##0")&"）"');
 setCell('B10',$('payee').value==='其他'?$('other').value:$('payee').value);setCell('B11',$('notes').value);
 setCell('A18','核定數（元）');setCell('B18',a);setCell('D18','實支數（元）');setCell('F18',s);setCell('A19','差額（元）');setCell('B19',balance,'B18-F18');setCell('A20','金額編輯說明');setCell('B20','第18列為整數元；大寫為匯出時內容，修改金額後請核對更新或回工具重新匯出。');
 doc.getElementsByTagName('dimension')[0].setAttribute('ref','A1:G20');files['xl/worksheets/sheet1.xml']=new XMLSerializer().serializeToString(doc);
 const workbook=new DOMParser().parseFromString(files['xl/workbook.xml'],'application/xml');let calc=workbook.getElementsByTagName('calcPr')[0];if(!calc){calc=workbook.createElementNS(ns,'calcPr');workbook.documentElement.append(calc)}calc.setAttribute('fullCalcOnLoad','1');files['xl/workbook.xml']=new XMLSerializer().serializeToString(workbook);
 return files;
}
$('downloadExcel').onclick=()=>{
 showAllErrors=true;render();if(errors.length){alert('請先完成檢核，再下載 Excel：\n'+errors.join('\n'));$('checks').focus();return}
 try{const blob=excelZip(buildExcelFiles()),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='賸餘款簽辦單.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('actionStatus').textContent='已產生 Excel 檔案，請確認瀏覽器下載位置。Excel 檔不供草稿載入，接續填寫請另下載 JSON 草稿。';$('excelStatus').textContent='已產生 Excel 檔案，請確認下載位置。'}catch(error){$('excelStatus').textContent='Excel 下載失敗，請重試。';console.error(error)}
};