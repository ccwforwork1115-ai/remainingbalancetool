$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$projectRoot=Split-Path -Parent $PSScriptRoot
$browser='C:\Program Files\Google\Chrome\Application\chrome.exe'
$uri=([Uri](Join-Path $projectRoot '賸餘款簽辦工具.html')).AbsoluteUri
foreach($item in @(@{name='新版桌面預覽';size='1440,1200'},@{name='新版手機預覽';size='390,1200'})){
$profile=Join-Path $env:TEMP ('surplus-ui-'+[Guid]::NewGuid().ToString('N'))
$png=Join-Path $root ($item.name+'.png')
$args=@('--headless=new','--disable-gpu','--no-first-run',('--user-data-dir="'+$profile+'"'),('--window-size='+$item.size),'--hide-scrollbars',('--screenshot="'+$png+'"'),$uri)
$p=Start-Process -FilePath $browser -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root ($item.name+'.log')) -RedirectStandardError (Join-Path $root ($item.name+'錯誤.log'))
if(!$p.WaitForExit(15000)){Stop-Process -Id $p.Id;throw 'Screenshot timeout'}
Get-Item -LiteralPath $png | Select-Object Name,Length
}
