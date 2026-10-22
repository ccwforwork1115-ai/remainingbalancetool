function parseApprovedAmount(text){
 const values=[];
 function add(raw){
  let total=0,lastUnit=Infinity,covered='',valid=true;
  for(const m of raw.matchAll(/(\d[\d,]*(?:\.\d+)?)(億|萬|千|仟|百|佰)?/g)){
   covered+=m[0];if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(m[1])){valid=false;break}
   const unit=({'億':1e8,'萬':1e4,'千':1e3,'仟':1e3,'百':100,'佰':100})[m[2]]||1;
   if(unit>=lastUnit){valid=false;break}lastUnit=unit;total+=Number(m[1].replaceAll(',',''))*unit;
  }
  if(valid&&covered===raw&&Number.isSafeInteger(total)&&total>=0&&total<=999999999999&&!values.includes(String(total)))values.push(String(total));
 }
 const pattern=/(?:新[臺台]幣|NT\$)?(?:\((?:以下同|下同)\))?([0-9][0-9,.億萬千仟百佰]*)元/gi;
 for(const m of text.matchAll(pattern)){
  const context=text.slice(Math.max(0,m.index-90),m.index),clause=context.split(/[，。；;]|,(?!\d)/).pop();
  if(/實支|實際支出|已支|賸餘|剩餘|繳回|自籌|申請|原核定|總經費|分期|本期|第一期|第二期/.test(clause))continue;
  if(/核定|核准|核撥|核予補助|補助|撥付/.test(clause)||(/計/.test(clause)&&(/經費/.test(context)||/(?:核定|核准)[^，。；;]*(?:交通費|鐘點費|出席費|膳費|住宿費|材料費|保險費)[，,]計(?:新[臺台]幣)?$/.test(context))))add(m[1]);
 }
 for(const m of text.matchAll(/(?:核定數|核定金額)[:：](?:新[臺台]幣)?([0-9][0-9,.億萬千仟百佰]*)(?:元)?/g))add(m[1]);
 const approved=values.length===1?values[0]:'';
 const amountHint=values.length>1?'找到多筆不同金額，請對照公文選擇本案核定數。':approved?'已擷取核定數，請確認為本案全額核定金額。':'未找到明確核定數，原核定數欄位會保留，可手動填寫。';
 return {approved,amountCandidates:values,amountHint};
}
