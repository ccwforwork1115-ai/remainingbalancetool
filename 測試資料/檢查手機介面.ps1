$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$projectRoot=Split-Path -Parent $PSScriptRoot
$profile=Join-Path $env:TEMP ('surplus-responsive-'+[Guid]::NewGuid().ToString('N'))
$args=@('--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=18765',('--user-data-dir="'+$profile+'"'),'--window-size=1000,1200',([Uri](Join-Path $projectRoot '賸餘款簽辦工具.html')).AbsoluteUri)
$p=Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root '手機測試.log') -RedirectStandardError (Join-Path $root '手機測試錯誤.log')
$ws=[Net.WebSockets.ClientWebSocket]::new()
try{
$target=$null
for($i=0;$i -lt 20;$i++){try{$client=[Net.WebClient]::new();$client.Proxy=$null;$targets=$client.DownloadString('http://127.0.0.1:18765/json')|ConvertFrom-Json;$client.Dispose();$target=$targets|Where-Object type -eq 'page'|Select-Object -First 1;if($target){break}}catch{};Start-Sleep -Milliseconds 200}
if(!$target){throw 'Chrome debugging connection unavailable'}
$ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
$script:cdpId=0
function Send-CDP($method,$params){
$script:cdpId++;$id=$script:cdpId
$payload=@{id=$id;method=$method;params=$params}|ConvertTo-Json -Depth 10 -Compress
$bytes=[Text.Encoding]::UTF8.GetBytes($payload)
$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
while($true){$buffer=New-Object byte[] 1048576;$stream=[IO.MemoryStream]::new();do{$r=$ws.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult();$stream.Write($buffer,0,$r.Count)}while(!$r.EndOfMessage);$value=([Text.Encoding]::UTF8.GetString($stream.ToArray())|ConvertFrom-Json);$stream.Dispose();if($value.id -eq $id){if($value.error){throw ($value.error|ConvertTo-Json)};return $value.result}}
}
$checks=@()
foreach($width in @(375,390,844,1440)){
$height=1000;if($width -eq 844){$height=390}
$null=Send-CDP 'Emulation.setDeviceMetricsOverride' @{width=$width;height=$height;deviceScaleFactor=1;mobile=$false}
$expression=@'
JSON.stringify({width:innerWidth,documentWidth:document.documentElement.scrollWidth,noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth,editorWidth:document.querySelector('.editor').getBoundingClientRect().width,previewBelow:document.querySelector('.preview').getBoundingClientRect().top>document.querySelector('.editor').getBoundingClientRect().top,missingLabels:[...document.querySelectorAll('input:not([hidden]),textarea,select')].filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')).map(e=>e.id),accountingInputAbsent:!document.getElementById('request')})
'@
$r=Send-CDP 'Runtime.evaluate' @{expression=$expression;returnByValue=$true}
$checks+=($r.result.value|ConvertFrom-Json)
if($width -eq 390){$img=Send-CDP 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false};[IO.File]::WriteAllBytes((Join-Path $root '新版手機預覽.png'),[Convert]::FromBase64String($img.data))}
}
$null=Send-CDP 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}
$r=Send-CDP 'Runtime.evaluate' @{expression='JSON.stringify({reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior})';returnByValue=$true}
$report=@{viewports=$checks;motion=($r.result.value|ConvertFrom-Json)}|ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $root '響應介面測試結果.json'),$report,[Text.UTF8Encoding]::new($false))
Write-Output $report
}finally{$ws.Dispose();if(!$p.HasExited){Stop-Process -Id $p.Id -ErrorAction SilentlyContinue}}
