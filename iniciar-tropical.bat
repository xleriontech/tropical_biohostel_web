@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Inicia todo: puertos libres + DB + backend + frontend
REM  Detecta puertos ocupados (ej. si otro proyecto corre) y usa otros.
REM  Al final abre el frontend en el navegador.
REM ============================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  === TROPICAL BIOHOSTEL: iniciando servicios ===
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0elegir-puertos.ps1"
if errorlevel 1 (
  pause
  exit /b 1
)
for /f "tokens=1,2 delims==" %%a in (puertos.txt) do set %%a=%%b
echo  Puertos: frontend=%FRONT_PORT% backend=%BACK_PORT% pg=%PG_PORT% redis=%REDIS_PORT%
echo.

call "%~dp0arrancar-db.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo  Arrancando backend (puerto %BACK_PORT%)...
start "TROPICAL Backend" cmd /c "cd /d ""%~dp0backend"" && npm run start"

echo  Arrancando frontend (puerto %FRONT_PORT%)...
start "TROPICAL Frontend" cmd /c "cd /d ""%~dp0frontend"" && npm run dev -- --port %FRONT_PORT%"

echo.
echo  Esperando a que respondan (esto tarda ~1 minuto la primera vez)...
set FRONT_OK=0
set BACK_OK=0
for /L %%i in (1,1,24) do (
  if !FRONT_OK!==0 (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:%FRONT_PORT%' -TimeoutSec 3 -UseBasicParsing).StatusCode } catch { 'nada' }" | findstr 200 >nul && set FRONT_OK=1
  )
  if !BACK_OK!==0 (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:%BACK_PORT%/api/reviews/top-rated?limit=1' -TimeoutSec 3 -UseBasicParsing).StatusCode } catch { 'nada' }" | findstr 200 >nul && set BACK_OK=1
  )
  if !FRONT_OK!==1 if !BACK_OK!==1 goto todo_ok
  ping -n 6 127.0.0.1 >nul
)

:todo_ok
echo.
if %FRONT_OK%==1 (
  echo  Frontend OK:    http://localhost:%FRONT_PORT%
) else (
  echo  AVISO: el frontend aun no responde. Dale un minuto y recarga.
)
if %BACK_OK%==1 (
  echo  Backend OK:     http://localhost:%BACK_PORT%/api/docs
) else (
  echo  AVISO: el backend aun no responde. Revisa la ventana "TROPICAL Backend".
)
echo  Puertos usados guardados en puertos.txt

if %FRONT_OK%==1 start http://localhost:%FRONT_PORT%
echo.
echo  Para detener todo, ejecuta detener-tropical.bat
pause
