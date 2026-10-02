@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Detiene frontend, backend y DB (usa puertos.txt)
REM ============================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if exist puertos.txt (
  for /f "tokens=1,2 delims==" %%a in (puertos.txt) do set %%a=%%b
) else (
  set FRONT_PORT=3000
  set BACK_PORT=3001
)

echo  Deteniendo ventanas TROPICAL (si se abrieron con iniciar-tropical)...
taskkill /FI "WINDOWTITLE eq TROPICAL Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq TROPICAL Frontend" /F >nul 2>&1

echo  Deteniendo procesos en puertos %BACK_PORT% (backend) y %FRONT_PORT% (frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%BACK_PORT%"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%FRONT_PORT%"') do taskkill /PID %%a /F >nul 2>&1

echo  Deteniendo contenedores Docker...
docker stop tropical-pg tropical-redis-1 >nul 2>&1

echo.
echo  Todo detenido.
pause
