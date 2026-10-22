$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$projectRoot=Split-Path -Parent $PSScriptRoot
$source=Get-Content -LiteralPath (Join-Path $projectRoot '賸餘款簽辦工具.html') -Raw -Encoding UTF8
$tests=Get-Content -LiteralPath (Join-Path $root '測試工具.js') -Raw -Encoding UTF8
$html=$source.Replace('</html>',('<script>'+$tests+'</script></html>'))
$testPath=Join-Path $root '測試頁面.html'
[IO.File]::WriteAllText($testPath,$html,[Text.UTF8Encoding]::new($false))
$uri=([Uri]$testPath).AbsoluteUri
$browser='C:\Program Files\Google\Chrome\Application\chrome.exe'
$profile=Join-Path $env:TEMP ('surplus-test-'+[Guid]::NewGuid().ToString('N'))
$args=@('--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',('--user-data-dir="'+$profile+'"'),'--dump-dom','--virtual-time-budget=3000',$uri)
$p=Start-Process -FilePath $browser -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root '測試DOM.html') -RedirectStandardError (Join-Path $root '測試瀏覽器.log')
if(!$p.WaitForExit(25000)){Stop-Process -Id $p.Id;throw '測試逾時'}
$dom=Get-Content -LiteralPath (Join-Path $root '測試DOM.html') -Raw -Encoding UTF8
$match=[regex]::Match($dom,'<pre id="test-report">([\s\S]*?)</pre>')
if(!$match.Success){throw '找不到瀏覽器測試報告，請查看測試瀏覽器.log'}
$report=[Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
[IO.File]::WriteAllText((Join-Path $root '測試結果.json'),$report,[Text.UTF8Encoding]::new($false))
Write-Output $report
