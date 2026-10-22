import zipfile,hashlib,xml.etree.ElementTree as E
from openpyxl import load_workbook
p='賸餘款繳回簽辦單_重新排版.xlsx'; q='範本匯出測試.xlsx'
a=zipfile.ZipFile(p);b=zipfile.ZipFile(q)
assert b.testzip() is None
for n in a.namelist():
 if n not in ['xl/workbook.xml','xl/worksheets/sheet1.xml']: assert a.read(n)==b.read(n),n
s=load_workbook(p).active;t=load_workbook(q).active
assert str(s.merged_cells)==str(t.merged_cells)
assert str(s.print_area)==str(t.print_area)
assert str(s.page_setup)==str(t.page_setup)
assert [(k,v.width) for k,v in s.column_dimensions.items()]==[(k,v.width) for k,v in t.column_dimensions.items()]
for i in range(1,17):assert s.row_dimensions[i].height==t.row_dimensions[i].height
assert hashlib.sha256(open(p,'rb').read()).hexdigest()=='f966f9b46ba835e830eca161ef5d96c2a342de542d7452c2e1cf37c6d2228807'
print('Original intact; styles, margins, row heights, columns, merges, printing and embedded printer data preserved.')