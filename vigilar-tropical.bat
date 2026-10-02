@echo off
REM ============================================================
REM  TROPICAL Vigia - mantiene el sitio visible en todo el mundo
REM  Corre cada 5 minutos por Tarea Programada. Idempotente:
REM  solo reinicia lo que este caido y reconfigura si rotaron URLs.
REM  Log: vigilar.log
REM ============================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"
if exist puertos.txt (
  for /f "tokens=1,2 delims==" %%a in (puertos.txt) do set %%a=%%b
) else (
  set FRONT_PORT=3000
  set BACK_PORT=3001
)

REM Exclusión mutua: si ya hay una revisión en curso, salir (mkdir es atómico)
mkdir vigilar.lock >nul 2>&1
if errorlevel 1 goto fin
echo [%date% %time%] revision >> vigilar.log

docker info >nul 2>&1
if errorlevel 1 goto fin

docker start tropical-pg >nul 2>&1
docker start tropical-redis-1 >nul 2>&1

set CF_BIN=%~dp0bin\cloudflared.exe
if not exist "%CF_BIN%" goto sin_tuneles

REM --- contar tuneles vivos ---
set CF_ALIVE=0
for /f %%c in ('powershell -NoProfile -Command "(Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Measure-Object).Count"') do set CF_ALIVE=%%c
if "%CF_ALIVE%"=="" set CF_ALIVE=0

set URLS_CHANGED=0
if %CF_ALIVE% LSS 2 goto recrear_tuneles
goto leer_urls

:recrear_tuneles
echo [%date% %time%] recreando tuneles >> vigilar.log
taskkill /FI "IMAGENAME eq cloudflared.exe" /F >nul 2>&1
del /q tunel-front.log tunel-back.log >nul 2>&1
start "TROPICAL BIOHOSTEL Tunel-Front" /min "%CF_BIN%" tunnel --url http://localhost:%FRONT_PORT% --logfile "%~dp0tunel-front.log"
start "TROPICAL BIOHOSTEL Tunel-Back" /min "%CF_BIN%" tunnel --url http://localhost:%BACK_PORT% --logfile "%~dp0tunel-back.log"
set URLS_CHANGED=1

:leer_urls
REM --- esperar URLs hasta 100 segundos ---
set URL_F=
set URL_B=
for /L %%i in (1,1,20) do (
  if not defined URL_F (
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path '%~dp0tunel-front.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m[-1].Matches.Value.Trim() }" 2^>nul') do set URL_F=%%u
  )
  if not defined URL_B (
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path '%~dp0tunel-back.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue; if ($m) { $m[-1].Matches.Value.Trim() }" 2^>nul') do set URL_B=%%u
  )
  if defined URL_F if defined URL_B goto urls_listas
  ping -n 6 127.0.0.1 >nul
)

:urls_listas
if not defined URL_F goto sin_tuneles
if not defined URL_B goto sin_tuneles
REM Las URLs nunca llevan espacios: eliminar residuos de formato de PowerShell
set URL_F=%URL_F: =%
set URL_B=%URL_B: =%

REM --- detectar rotacion vs tunel-urls.txt ---
set SAVED_F=
set SAVED_B=
set SAVED_API=
if exist tunel-urls.txt (
  for /f "delims=" %%l in (tunel-urls.txt) do (
    if not defined SAVED_F ( set "SAVED_F=%%l" ) else if not defined SAVED_B ( set "SAVED_B=%%l" ) else if not defined SAVED_API ( set "SAVED_API=%%l" )
  )
)
if not "%URL_F%"=="%SAVED_F%" set URLS_CHANGED=1
if not "%URL_B%"=="%SAVED_B%" set URLS_CHANGED=1
if "%SAVED_API%"=="" set URLS_CHANGED=1
echo %URL_F%>tunel-urls.txt
echo %URL_B%>>tunel-urls.txt

REM --- backend: debe escuchar en 3001 ---
set BACK_UP=0
for /f %%c in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %BACK_PORT% -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"') do set BACK_UP=%%c
if "%BACK_UP%"=="0" (
  echo [%date% %time%] reiniciando backend >> vigilar.log
  start "TROPICAL Backend" /min cmd /c "cd /d ""%~dp0backend"" && npm run start"
  ping -n 16 127.0.0.1 >nul
)

REM --- frontend: debe escuchar en 3000 con la API vigente ---
set FRONT_UP=0
for /f %%c in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %FRONT_PORT% -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"') do set FRONT_UP=%%c
set WANT_API=%URL_B%/api
if "%FRONT_UP%"=="0" set URLS_CHANGED=1
if not "%SAVED_API%"=="%WANT_API%" set URLS_CHANGED=1
if "%URLS_CHANGED%"=="1" (
  REM Periodo de gracia: si se reinicio hace menos de 4 min, no insistir (arranque en curso)
  set RECIENTE=0
  for /f %%m in ('powershell -NoProfile -Command "$f=Get-Item .front-restart -ErrorAction SilentlyContinue; if ($f) { [int]((Get-Date)-$f.LastWriteTime).TotalMinutes } else { 99 }"') do set RECIENTE=%%m
  if "%RECIENTE%"=="" set RECIENTE=99
  if !RECIENTE! LSS 4 (
    echo [%date% %time%] omito reinicio frontend: reiniciado hace !RECIENTE! min ^(FRONT_UP=%FRONT_UP% SAVED_API=%SAVED_API% WANT=%WANT_API%^) >> vigilar.log
    goto fin
  )
  echo [%date% %time%] reiniciando frontend con API %WANT_API% ^(FRONT_UP=%FRONT_UP% SAVED=%SAVED_API%^) >> vigilar.log
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%FRONT_PORT%"') do taskkill /PID %%a /F >nul 2>&1
  ping -n 4 127.0.0.1 >nul
  start "TROPICAL Frontend" /min cmd /c "cd /d ""%~dp0frontend"" && set ""NEXT_PUBLIC_API_URL=%WANT_API%"" && npm run dev -- --port %FRONT_PORT%"
  echo %date% %time%>.front-restart
  echo %URL_F%>tunel-urls.txt
  echo %URL_B%>>tunel-urls.txt
  echo %WANT_API%>>tunel-urls.txt
)
goto fin

:sin_tuneles
echo [%date% %time%] sin tuneles: modo local >> vigilar.log
set BACK_UP=0
for /f %%c in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %BACK_PORT% -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"') do set BACK_UP=%%c
if "%BACK_UP%"=="0" (
  start "TROPICAL Backend" /min cmd /c "cd /d ""%~dp0backend"" && npm run start"
)
set FRONT_UP=0
for /f %%c in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %FRONT_PORT% -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"') do set FRONT_UP=%%c
if "%FRONT_UP%"=="0" (
  start "TROPICAL Frontend" /min cmd /c "cd /d ""%~dp0frontend"" && npm run dev -- --port %FRONT_PORT%"
)

:fin
rmdir vigilar.lock >nul 2>&1
echo [%date% %time%] revision ok >> vigilar.log
for %%f in (vigilar.log) do if %%~zf GTR 200000 del /q vigilar.log >nul 2>&1
