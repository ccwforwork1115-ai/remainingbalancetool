import zipfile,base64,json,hashlib
p='賸餘款繳回簽辦單_重新排版.xlsx'
with zipfile.ZipFile(p) as z:
 data={n:base64.b64encode(z.read(n)).decode() for n in z.namelist()}
open('Excel範本資料.js','w',encoding='utf-8').write('// 使用者提供的重新排版範本，保留所有OOXML樣式與印表設定。\nconst excelTemplateBase64='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print('Template SHA256',hashlib.sha256(open(p,'rb').read()).hexdigest())