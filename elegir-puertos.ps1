# TROPICAL BIOHOSTEL - Elige puertos libres y genera .env/.env.local
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File elegir-puertos.ps1 [-Forzar]
# Reutiliza puertos.txt si existe (puertos estables entre reinicios).
param([switch]$Forzar)
$ErrorActionPreference = 'Stop'
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PuertosFile = Join-Path $Dir 'puertos.txt'

function Puerto-Libre([int]$base) {
  # Puertos fijos del otro proyecto local: nunca usarlos aunque estén libres,
  # así ambas plataformas pueden correr al tiempo sin chocarse.
  $reservados = @(3000, 3001, 5433, 6379)
  $p = $base
  while ($p -lt $base + 200) {
    if ($reservados -contains $p) { $p++; continue }
    $c = New-Object Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', $p); $c.Close(); $p++ }
    catch { return $p }
  }
  throw "Sin puertos libres desde $base"
}

if ((Test-Path $PuertosFile) -and (-not $Forzar)) {
  Write-Host 'Puertos ya configurados (puertos.txt). Use -Forzar para re-detectar.'
} else {
  $front = Puerto-Libre 3000
  $back = Puerto-Libre 3001
  $pg = Puerto-Libre 5433
  $redis = Puerto-Libre 6379
  # Evitar colisiones entre los elegidos
  while ($back -eq $front) { $back = Puerto-Libre ($back + 1) }
  "FRONT_PORT=$front`nBACK_PORT=$back`nPG_PORT=$pg`nREDIS_PORT=$redis" | Set-Content $PuertosFile -Encoding Ascii
  Write-Host "Puertos elegidos: front=$front back=$back pg=$pg redis=$redis"
}

$cfg = @{}
Get-Content $PuertosFile | ForEach-Object {
  if ($_ -match '^(\w+)=(\d+)$') { $cfg[$matches[1]] = $matches[2] }
}

# backend/.env (conserva secretos si ya existen)
$backEnv = Join-Path $Dir 'backend\.env'
$secretos = @{}
if (Test-Path $backEnv) {
  Get-Content $backEnv | ForEach-Object {
    if ($_ -match '^(R2_|GEMINI_|AI_MASTER_KEY|SUPABASE_)[^=]*=') {
      $k = $_.Split('=')[0]; $secretos[$k] = $_.Substring($k.Length + 1)
    }
  }
}
$lineas = @(
  "DATABASE_URL=postgresql://turismo_user:***REMOVIDO-EN-PURGA***@localhost:$($cfg.PG_PORT)/turismo_db",
  "REDIS_URL=redis://localhost:$($cfg.REDIS_PORT)",
  "SUPABASE_URL=https://your-project.supabase.co",
  "SUPABASE_ANON_KEY=your-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key",
  "SUPABASE_JWT_SECRET=your-jwt-secret",
  "AI_MASTER_KEY=***REMOVIDO-EN-PURGA***",
  "GEMINI_API_KEY=",
  "R2_ACCOUNT_ID=",
  "R2_ACCESS_KEY_ID=",
  "R2_SECRET_ACCESS_KEY=",
  "R2_BUCKET_NAME=turismo-images",
  "R2_PUBLIC_URL=",
  "PORT=$($cfg.BACK_PORT)",
  "FRONTEND_URL=http://localhost:$($cfg.FRONT_PORT)"
)
$final = $lineas | ForEach-Object {
  $k = $_.Split('=')[0]
  if ($secretos.ContainsKey($k) -and $secretos[$k] -ne '') { "$k=$($secretos[$k])" } else { $_ }
}
$final | Set-Content $backEnv -Encoding Ascii

# frontend/.env.local
@(
  'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key',
  "NEXT_PUBLIC_API_URL=http://localhost:$($cfg.BACK_PORT)/api"
) | Set-Content (Join-Path $Dir 'frontend\.env.local') -Encoding Ascii

Write-Host 'Archivos .env generados.'
