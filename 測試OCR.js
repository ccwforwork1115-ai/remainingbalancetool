(async()=>{
const report=document.createElement('pre');report.id='ocr-report';document.body.prepend(report);
function log(data){report.textContent=JSON.stringify(data,null,2);if(data.state!=='running'&&location.protocol==='http:')fetch('/result',{method:'POST',body:report.textContent}).catch(()=>{})}
log({state:'running'});
try{
const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=450;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,450);ctx.fillStyle='black';ctx.font='48px Microsoft JhengHei';ctx.fillText('嘉義縣政府 函',70,80);ctx.fillText('發文日期：中華民國115年10月21日',70,190);ctx.fillText('發文字號：府教社字第1150001234號',70,300);
const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));selectImage(new File([blob],'synthetic.png',{type:'image/png'}));await $('ocr').onclick();
log({state:'done',status:$('status').textContent,text:$('raw').value,date:$('candidateDate').value,number:$('candidateNumber').value,pass:$('candidateDate').value==='115年10月21日'&&$('candidateNumber').value==='府教社字第1150001234號'});
}catch(e){log({state:'error',error:String(e)})}
})();
