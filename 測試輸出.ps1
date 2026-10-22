$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$source=Get-Content -LiteralPath (Join-Path $root '賸餘款簽辦工具.html') -Raw -Encoding UTF8
$ocr=Get-Content -LiteralPath (Join-Path $root '測試OCR.js') -Raw -Encoding UTF8
$ocrPath=Join-Path $root 'OCR測試頁面.html'
[IO.File]::WriteAllText($ocrPath,$source.Replace('</html>',('<script>'+$ocr+'</script></html>')),[Text.UTF8Encoding]::new($false))
$browser='C:\Program Files\Google\Chrome\Application\chrome.exe'
$profile=Join-Path $env:TEMP ('surplus-ocr-'+[Guid]::NewGuid().ToString('N'))
$args=@('--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',('--user-data-dir="'+$profile+'"'),'--dump-dom','--virtual-time-budget=60000',([Uri]$ocrPath).AbsoluteUri)
$p=Start-Process -FilePath $browser -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root 'OCR測試DOM.html') -RedirectStandardError (Join-Path $root 'OCR瀏覽器.log')
if(!$p.WaitForExit(55000)){Stop-Process -Id $p.Id;Write-Output 'OCR browser timed out'}
$dom=Get-Content -LiteralPath (Join-Path $root 'OCR測試DOM.html') -Raw -Encoding UTF8
$m=[regex]::Match($dom,'<pre id="ocr-report">([\s\S]*?)</pre>')
if($m.Success){$report=[Net.WebUtility]::HtmlDecode($m.Groups[1].Value);[IO.File]::WriteAllText((Join-Path $root 'OCR測試結果.json'),$report,[Text.UTF8Encoding]::new($false));Write-Output $report}else{Write-Output 'OCR report unavailable'}
$samplePath=Join-Path $root '列印測試頁面.html'
$sample=$source.Replace('</html>',"<script>document.getElementById('example').click();document.getElementById('confirmed').checked=true;document.getElementById('attachment').checked=true;render();</script></html>")
[IO.File]::WriteAllText($samplePath,$sample,[Text.UTF8Encoding]::new($false))
$pdf=Join-Path $root '簽辦單列印測試.pdf'
$args=@('--headless=new','--disable-gpu','--no-first-run',('--user-data-dir="'+$profile+'-pdf"'),'--no-pdf-header-footer',('--print-to-pdf="'+$pdf+'"'),([Uri]$samplePath).AbsoluteUri)
$p=Start-Process -FilePath $browser -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root 'PDF測試.log') -RedirectStandardError (Join-Path $root 'PDF瀏覽器.log')
if(!$p.WaitForExit(15000)){Stop-Process -Id $p.Id;throw 'PDF timeout'}
Get-Item -LiteralPath $pdf | Select-Object Name,Length
