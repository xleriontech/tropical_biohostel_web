@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Sitio completo al aire: local + tunel a internet
REM  1) Arranca BD, backend y frontend
REM  2) Abre tuneles Cloudflare (HTTPS, sin tocar el router)
REM  3) Si la URL cambio, te muestra la NUEVA y verifica que
REM     responde desde internet antes de terminar.
REM  Requiere: instalar.bat ya ejecutado + Docker corriendo.
REM ============================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"
if exist puertos.txt (
  for /f "tokens=1,2 delims==" %%a in (puertos.txt) do set %%a=%%b
) else (
  set FRONT_PORT=3000
  set BACK_PORT=3001
)

echo.
echo  === TROPICAL BIOHOSTEL al aire: iniciando todo ===
echo.

REM ---------- 0. URL anterior (para detectar cambio) ----------
set PREV_F=
if exist tunel-urls.txt (
  for /f "delims=" %%l in (tunel-urls.txt) do (
    if not defined PREV_F set PREV_F=%%l
  )
)

REM ---------- 1. Base de datos ----------
call "%~dp0arrancar-db.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

REM ---------- 2. cloudflared ----------
set CF_BIN=%~dp0bin\cloudflared.exe
if not exist "%CF_BIN%" (
  echo  Descargando cloudflared, una sola vez...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'bin\cloudflared.exe'"
)
if not exist "%CF_BIN%" (
  echo  ERROR: no se pudo descargar cloudflared. Revisa tu internet.
  pause
  exit /b 1
)

REM ---------- 3. Tuneles frescos ----------
echo.
echo  Abriendo tuneles...
taskkill /FI "IMAGENAME eq cloudflared.exe" /F >nul 2>&1
ping -n 3 127.0.0.1 >nul
del /q tunel-front.log tunel-back.log >nul 2>&1
start "TROPICAL BIOHOSTEL Tunel-Front" "%CF_BIN%" tunnel --url http://localhost:%FRONT_PORT% --logfile "%~dp0tunel-front.log"
start "TROPICAL BIOHOSTEL Tunel-Back" "%CF_BIN%" tunnel --url http://localhost:%BACK_PORT% --logfile "%~dp0tunel-back.log"

set URL_F=
set URL_B=
for /L %%i in (1,1,24) do (
  if not defined URL_F (
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path '%~dp0tunel-front.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m[-1].Matches.Value.Trim() }" 2^>nul') do set URL_F=%%u
  )
  if not defined URL_B (
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path '%~dp0tunel-back.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m[-1].Matches.Value.Trim() }" 2^>nul') do set URL_B=%%u
  )
  if defined URL_F if defined URL_B goto tuneles_ok
  ping -n 6 127.0.0.1 >nul
)
echo  ERROR: los tuneles no dieron URL. Revisa tu internet y las ventanas Tunel.
pause
exit /b 1

:tuneles_ok
REM Las URLs nunca llevan espacios: eliminar residuos de formato
set URL_F=%URL_F: =%
set URL_B=%URL_B: =%
echo %URL_F%>tunel-urls.txt
echo %URL_B%>>tunel-urls.txt

REM ---------- 4. Backend + frontend apuntando al tunel ----------
echo.
echo  Arrancando backend y frontend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%BACK_PORT%"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%FRONT_PORT%"') do taskkill /PID %%a /F >nul 2>&1
ping -n 4 127.0.0.1 >nul
start "TROPICAL Backend" cmd /c "cd /d ""%~dp0backend"" && npm run start"
start "TROPICAL Frontend" cmd /c "cd /d ""%~dp0frontend"" && set ""NEXT_PUBLIC_API_URL=%URL_B%/api"" && npm run dev -- --port %FRONT_PORT%"
echo %URL_B%/api>>tunel-urls.txt

REM ---------- 5. Esperar servicios locales ----------
echo  Esperando servicios locales...
set FRONT_OK=0
set BACK_OK=0
for /L %%i in (1,1,24) do (
  if !FRONT_OK!==0 (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:%FRONT_PORT%' -TimeoutSec 3 -UseBasicParsing).StatusCode } catch { 'nada' }" | findstr 200 >nul && set FRONT_OK=1
  )
  if !BACK_OK!==0 (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:%BACK_PORT%/api/reviews/top-rated?limit=1' -TimeoutSec 3 -UseBasicParsing).StatusCode } catch { 'nada' }" | findstr 200 >nul && set BACK_OK=1
  )
  if !FRONT_OK!==1 if !BACK_OK!==1 goto servicios_ok
  ping -n 6 127.0.0.1 >nul
)
echo  AVISO: algun servicio local aun no responde. Continua de todos modos...
:servicios_ok

REM ---------- 6. Verificar desde internet ----------
echo  Verificando desde internet...
set REM_OK=0
for /L %%i in (1,1,12) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%URL_F%' -TimeoutSec 10 -UseBasicParsing).StatusCode } catch { 'nada' }" | findstr 200 >nul && set REM_OK=1
  if !REM_OK!==1 goto remoto_ok
  ping -n 11 127.0.0.1 >nul
)
echo  AVISO: la URL publica aun no responde. Espera 1 minuto y recarga.
goto resumen
:remoto_ok
echo  Internet OK.

REM ---------- 7. Resumen ----------
:resumen
echo.
echo  ============================================================
echo   TROPICAL BIOHOSTEL al aire
echo.
echo   Local:   http://localhost:%FRONT_PORT%
if defined PREV_F (
  if "%PREV_F%"=="%URL_F%" (
    echo   Publica ^(igual que antes^):
  ) else (
    echo   Publica ^(NUEVA - la anterior ya no sirve^):
  )
) else (
  echo   Publica:
)
echo   %URL_F%
echo  ============================================================
echo.
echo  Para volver a modo solo-local: cierra las ventanas
echo  "TROPICAL BIOHOSTEL Tunel-*", corre detener-tropical.bat e iniciar-tropical.bat
pause
