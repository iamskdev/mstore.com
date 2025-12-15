# Kill processes on Firebase emulator ports
$ports = @(8090, 9099, 5000, 5001, 4000, 4001, 4400, 4401, 4500, 4501)

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess
    if ($process) {
        $processId = $process.OwningProcess
        Write-Host "Killing process $processId on port $port"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Port cleanup completed"