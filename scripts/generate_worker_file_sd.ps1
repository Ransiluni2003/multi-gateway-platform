# Generate Prometheus file_sd JSON for worker instances
# Usage: .\generate_worker_file_sd.ps1 [-OutputDir "./prometheus/file_sd"] [-Port 9100]
param(
  [string]$OutputDir = "./prometheus/file_sd",
  [int]$Port = 9100
)

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Get containers started by docker-compose with service name 'worker'
$workerNames = docker ps --filter "label=com.docker.compose.service=worker" --format "{{.Names}}" | Where-Object { $_ -ne "" }

if (-not $workerNames) {
  Write-Host "No worker containers found. Ensure the compose stack is running and workers are started."
}

$targets = @()
foreach ($name in $workerNames) {
  $ip = docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" $name
  if ($ip -and $ip -ne "") {
    $targets += @{ targets = @("$($ip):$Port"); labels = @{ job = "worker"; instance = $name } }
  }
}

# Write one file per worker for easy per-instance refreshing, or a single file
if ($targets.Count -eq 0) {
  Write-Host "No targets to write."
  exit 0
}

# Create files like worker_<container>.json
foreach ($t in $targets) {
  $instance = $t.labels.instance -replace '[^a-zA-Z0-9_.-]', '_'
  $file = Join-Path $OutputDir "worker_$instance.json"
  $json = ConvertTo-Json -Depth 4 @($t)
  Set-Content -Path $file -Value $json -Encoding UTF8
  Write-Host "Wrote $file"
}

# Also write an aggregate file
$aggFile = Join-Path $OutputDir "worker_all.json"
$aggJson = ConvertTo-Json -Depth 6 $targets
Set-Content -Path $aggFile -Value $aggJson -Encoding UTF8
Write-Host "Wrote $aggFile (aggregate)"
