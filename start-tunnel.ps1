Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$outFile = "C:\agent-x402-service\tunnel-output.txt"
Remove-Item $outFile -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath "C:\agent-x402-service\cloudflared.exe" -ArgumentList "tunnel","--url","http://localhost:4020" -WorkingDirectory "C:\agent-x402-service" -NoNewWindow -RedirectStandardError $outFile -PassThru
Start-Sleep -Seconds 10
Get-Content $outFile -ErrorAction SilentlyContinue

