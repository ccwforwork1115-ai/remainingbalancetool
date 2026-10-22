(()=>{
const results=[];function test(name,value){results.push({name,pass:!!value})}window.alert=()=>{};window.confirm=()=>true;
for(const c of amountFixtures){const r=parseDocument(c.text);test(c.name,['project','date','number','approved'].every(k=>!(k in c)||r[k]===c[k])&&(!('amountCount'in c)||r.amountCandidates.length===c.amountCount))}
$('raw').value='主旨：核定並撥付新臺幣（以下同）4,815元整。';extract();test('候選顯示千分位',$('candidateApproved').value==='4,815');
$('spent').value='1000';$('apply').click();test('帶入核定數並計算餘額',$('approved').value==='4815'&&$('balance').textContent==='3,815');
$('raw').value='主旨：請查照。';extract();$('apply').click();test('沒有金額保留原核定數',$('approved').value==='4815');
$('candidateApproved').value='-100';$('apply').click();test('候選金額拒絕負數',$('approved').value==='4815');
$('candidateApproved').value='10,000';window.confirm=()=>false;$('apply').click();test('取消覆蓋保留原核定數',$('approved').value==='4815');
window.confirm=()=>true;$('candidateApproved').value='４，８１５';$('apply').click();test('全形數字標點可帶入核定數',$('approved').value==='4815');
const report=document.createElement('pre');report.id='test-report';report.textContent=JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,results},null,2);document.body.prepend(report);
})();
