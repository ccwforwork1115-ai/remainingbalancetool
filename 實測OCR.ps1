$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$source=Get-Content -LiteralPath (Join-Path $root '賸餘款簽辦工具.html') -Raw -Encoding UTF8
$test=Get-Content -LiteralPath (Join-Path $root '測試OCR.js') -Raw -Encoding UTF8
$html=$source.Replace('</html>',('<script>'+$test+'</script></html>'))
$listener=[Net.HttpListener]::new();$listener.Prefixes.Add('http://127.0.0.1:18764/');$listener.Start()
$profile=Join-Path $env:TEMP ('surplus-ocr-live-'+[Guid]::NewGuid().ToString('N'))
$args=@('--headless=new','--disable-gpu','--no-first-run',('--user-data-dir="'+$profile+'"'),'http://127.0.0.1:18764/')
$p=Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $args -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $root 'OCR即時.log') -RedirectStandardError (Join-Path $root 'OCR即時錯誤.log')
$deadline=[DateTime]::UtcNow.AddSeconds(50)
try{
while([DateTime]::UtcNow -lt $deadline){
$task=$listener.GetContextAsync();if(!$task.Wait(50000)){break};$context=$task.Result
if($context.Request.Url.AbsolutePath -eq '/result'){$reader=[IO.StreamReader]::new($context.Request.InputStream);$result=$reader.ReadToEnd();$reader.Dispose();[IO.File]::WriteAllText((Join-Path $root 'OCR測試結果.json'),$result,[Text.UTF8Encoding]::new($false));$context.Response.StatusCode=200;$context.Response.Close();Write-Output $result;break}
if($context.Request.Url.AbsolutePath -eq '/'){$bytes=[Text.Encoding]::UTF8.GetBytes($html);$context.Response.ContentType='text/html; charset=utf-8';$context.Response.OutputStream.Write($bytes,0,$bytes.Length)}else{$context.Response.StatusCode=404}
$context.Response.Close()
}
}finally{$listener.Stop();if(!$p.HasExited){Stop-Process -Id $p.Id -ErrorAction SilentlyContinue}}
