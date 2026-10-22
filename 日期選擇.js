function syncDatePicker(){
 const value=$('date').value.trim();
 if(!validDate(value)){$('datePicker').value='';return}
 const parts=value.match(/^(\d{1,3})年(\d{1,2})月(\d{1,2})日$/);
 $('datePicker').value=`${+parts[1]+1911}-${parts[2].padStart(2,'0')}-${parts[3].padStart(2,'0')}`;
}
$('openDatePicker').onclick=()=>{
 syncDatePicker();const picker=$('datePicker');
 if(typeof picker.showPicker==='function'){try{picker.showPicker();return}catch{}}
 picker.classList.add('calendar-fallback');picker.removeAttribute('tabindex');picker.focus();
};
$('datePicker').addEventListener('change',()=>{
 const value=$('datePicker').value;if(!value)return;
 const [year,month,day]=value.split('-').map(Number);const roc=year-1911;
 if(roc<1||roc>999){$('dateHint').textContent='請選擇民國1至999年的日期。';return}
 $('date').value=`${roc}年${month}月${day}日`;
 $('date').dispatchEvent(new Event('input',{bubbles:true}));
 $('dateHint').textContent='可手填民國年月日，或按日曆選擇日期。';
 $('date').focus();
});
syncDatePicker();
