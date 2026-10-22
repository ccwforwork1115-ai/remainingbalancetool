$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$server=Start-Process -FilePath (Join-Path $root '.runtime\python\python.exe') -ArgumentList @('document_service.py','--no-open','--port','18876') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root 'Python測試服務.log') -RedirectStandardError (Join-Path $root 'Python測試服務錯誤.log')

$root=$PSScriptRoot
$profile=Join-Path $env:TEMP ('surplus-responsive-'+[Guid]::NewGuid().ToString('N'))
$args=@('--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=18875',('--user-data-dir="'+$profile+'"'),'--window-size=1000,1200','http://127.0.0.1:18876/')
$p=Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root '手機測試.log') -RedirectStandardError (Join-Path $root '手機測試錯誤.log')
$ws=[Net.WebSockets.ClientWebSocket]::new()
try{
$target=$null
for($i=0;$i -lt 40;$i++){try{$client=[Net.WebClient]::new();$client.Proxy=$null;$targets=$client.DownloadString('http://127.0.0.1:18875/json')|ConvertFrom-Json;$client.Dispose();$target=$targets|Where-Object type -eq 'page'|Select-Object -First 1;if($target){break}}catch{};Start-Sleep -Milliseconds 200}
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
$null=Send-CDP 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1050;deviceScaleFactor=1;mobile=$false}
$image=Send-CDP 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
[IO.File]::WriteAllBytes((Join-Path $root 'OCR新版桌面.png'),[Convert]::FromBase64String($image.data))
$null=Send-CDP 'Emulation.setDeviceMetricsOverride' @{width=390;height=1000;deviceScaleFactor=1;mobile=$false}
$image=Send-CDP 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
[IO.File]::WriteAllBytes((Join-Path $root 'OCR新版手機.png'),[Convert]::FromBase64String($image.data))
$fixtures=Get-Content -LiteralPath (Join-Path $root '公文擷取案例.json') -Raw -Encoding UTF8
$script=Get-Content -LiteralPath (Join-Path $root '測試專案辨識.js') -Raw -Encoding UTF8
$expression='window.documentFixtures='+$fixtures+';'+$script
$result=Send-CDP 'Runtime.evaluate' @{expression=$expression;awaitPromise=$true;returnByValue=$true;timeout=90000}
if($result.exceptionDetails){throw ($result.exceptionDetails|ConvertTo-Json -Depth 8)}
$report=$result.result.value|ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $root '專案名稱辨識測試結果.json'),$report,[Text.UTF8Encoding]::new($false))
Write-Output $report
}finally{$ws.Dispose();if(!$p.HasExited){Stop-Process -Id $p.Id -ErrorAction SilentlyContinue};if(!$server.HasExited){Stop-Process -Id $server.Id -ErrorAction SilentlyContinue}}