const touched=new Set();let showAllErrors=false;
let lastOverspendNotice='';
function overspendMessage(){const a=money($('approved').value),s=money($('spent').value);return a!==null&&s!==null&&s>a?`核定數：${a.toLocaleString('zh-TW')} 元；實支數：${s.toLocaleString('zh-TW')} 元，已超出 ${(s-a).toLocaleString('zh-TW')} 元。`:''}
function notifyOverspend(){const message=overspendMessage();if(message&&message!==lastOverspendNotice){lastOverspendNotice=message;window.alert('實支數超過核定數，請先核對金額\n\n'+message+'\n\n請修正核定數或實支數；金額確認前無法列印簽辦單。')}}
for(const id of ['approved','spent']){$(id).addEventListener('blur',notifyOverspend)}
const fieldMessages={organization:'請填寫機關／學校完整名稱。',project:'請填寫專案名稱。',agency:'請填寫核定機關。',date:'請填寫有效民國日期，例如115年10月21日。',number:'請填寫核定文號。',approved:'請輸入有效整數元，例如100,000。',spent:'請輸入有效整數元，且不可超過核定數。',other:'請填寫完整支票抬頭。'};
function fieldInvalid(id){const v=$(id).value.trim();if(id==='date')return !validDate(v);if(id==='approved')return money(v)===null;if(id==='spent'){const a=money($('approved').value),s=money(v);return s===null||(a!==null&&s>a)}if(id==='other')return $('payee').value==='其他'&&!v;return !v}
for(const id of Object.keys(fieldMessages)){
 const input=$(id),note=document.createElement('p');note.id=id+'Error';note.className='field-error';
 const container=input.closest('.amount-field')||input;container.after(note);
 input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),note.id].filter(Boolean).join(' '));
 input.addEventListener('blur',()=>{touched.add(id);updateInterface()});
}
function todayROCDate(now=new Date()){return `${now.getFullYear()-1911}年${now.getMonth()+1}月${now.getDate()}日`}
function updateDocumentDate(){$('pDocumentDate').textContent=todayROCDate()}
window.addEventListener('beforeprint',updateDocumentDate);
window.addEventListener('focus',updateDocumentDate);
function updateInterface(){
 updateDocumentDate();
 if(typeof syncDatePicker==='function')syncDatePicker();
 $('otherLabel').hidden=$('payee').value!=='其他';
 for(const id of Object.keys(fieldMessages)){const invalid=(showAllErrors||touched.has(id))&&fieldInvalid(id);$(id).setAttribute('aria-invalid',String(invalid));$(id+'Error').textContent=invalid?fieldMessages[id]:''}
 const a=money($('approved').value),s=money($('spent').value),b=a!==null&&s!==null?a-s:null;
 const overspend=overspendMessage();
 $('overspendAlert').hidden=!overspend;
 $('overspendDetail').textContent=overspend;
 $('amount-section').classList.toggle('has-overspend',Boolean(overspend));
 if(overspend){$('spent').setAttribute('aria-invalid','true');$('spentError').textContent='實支數超過核定數，請核對下方紅色提醒。'}else{lastOverspendNotice=''}
 const projectDone=['organization','project','agency','date','number'].every(id=>!fieldInvalid(id))&&$('confirmed').checked;
 const amountDone=a!==null&&s!==null&&b>=0&&!fieldInvalid('other');
 const reviewDone=projectDone&&amountDone&&$('attachment').checked;
 const steps=[projectDone,amountDone&&$('attachment').checked],count=steps.filter(Boolean).length;
 ['step-project','step-amount'].forEach((id,i)=>$(id).classList.toggle('complete',steps[i]));
 $('completion').value=count;$('completionText').textContent=`已完成 ${count} / 2 步驟`;
 $('amountCaption').textContent=b!==null&&b>=0?`${a.toLocaleString('zh-TW')} − ${s.toLocaleString('zh-TW')} ＝ ${b.toLocaleString('zh-TW')} 元`:b!==null?'實支數超過核定數，請確認輸入金額。':'核定數 − 實支數 ＝ 應繳回金額';
 $('readyText').textContent=reviewDone?'資料與附件已確認，可以列印。':`尚有 ${errors.length} 項資料或確認事項待完成。`;
 const list=$('checks');
 [...list.children].forEach(li=>{if(li.className==='error'&&!showAllErrors)li.className='pending'});
 if(reviewDone){const li=document.createElement('li');li.className='ok';li.textContent='必填資料與附件確認已完成。';list.prepend(li)}
}
$('chooseImage').onclick=()=>$('image').click();$('loadButton').onclick=()=>$('load').click();
const originalPrint=$('print').onclick;$('print').onclick=()=>{showAllErrors=true;render();originalPrint();if(errors.length)$('checks').focus()};
const originalSave=$('save').onclick;$('save').onclick=()=>{originalSave();$('actionStatus').textContent='已產生草稿檔案，請確認瀏覽器下載位置。'};
const originalLoad=$('load').onchange;$('load').onchange=async e=>{if(!e.target.files[0])return;await originalLoad(e);touched.clear();showAllErrors=false;render();$('actionStatus').textContent='已處理草稿載入，請核對畫面資料與日期文號。'};
const originalExample=$('example').onclick;$('example').onclick=()=>{originalExample();touched.clear();showAllErrors=false;render()};
document.body.dataset.uiReady='true';updateInterface();

$('confirmed').addEventListener('change',()=>{
 if(!$('confirmed').checked)return;
 const missing=['organization','project','agency','date','number'].filter(id=>fieldInvalid(id));
 if(missing.length){missing.forEach(id=>touched.add(id));render();$('actionStatus').textContent='請先補齊專案與核定資料，再進行金額計算。';$(missing[0]).focus();return}
 const next=fieldInvalid('approved')?'approved':'spent';
 $(next).focus({preventScroll:true});
 $('amount-section').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('actionStatus').textContent='專案資料已確認，請填寫金額與繳回資訊。';
});

$('clearContent').onclick=()=>{
 if(busy){$('actionStatus').textContent='公文辨識中，請待辨識完成後再清除。';return}
 if(!confirm('確定清除目前填寫內容與公文辨識資料？尚未下載的內容將無法復原，建議先下載草稿。機關／學校名稱會保留。'))return;
 fields.filter(id=>id!=='organization').forEach(id=>{if($(id).type==='checkbox')$(id).checked=false;else $(id).value=['agency','payee'].includes(id)?'嘉義縣政府':''});
 extractionVersion++;imageFile=null;if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=null;
 ['image','load','raw',...reviewFields.map(([id])=>id)].forEach(id=>$(id).value='');
 reviewFields.forEach(([id])=>delete $(id).dataset.edited);
 ['projectOptions','projectChoices','amountOptions'].forEach(id=>$(id).replaceChildren());
 ['subjectText','projectExtractHint','amountExtractHint','copyOCRStatus'].forEach(id=>$(id).textContent='');
 $('photo').removeAttribute('src');$('imageName').textContent='公文截圖';$('imagePanel').hidden=true;$('ocrResults').hidden=true;
 ['rawDetails','subjectDetails','extractionDetails'].forEach(id=>$(id).open=false);
 $('copyOCR').disabled=true;$('ocr').disabled=true;updateReviewState();
 $('status').textContent='準備好公文截圖，就能開始。首次辨識需連線下載語言檔。';
 touched.clear();showAllErrors=false;lastOverspendNotice='';render();
 $('actionStatus').textContent='已清除填寫內容與辨識資料，保留機關／學校名稱。';
 $('example').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
};
