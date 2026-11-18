@echo off
chcp 65001 >nul
title Tropical Biohostel - Sitio local

rem ============================================================
rem  Iniciador local - Tropical Biohostel
rem  Arranca el sitio (Next.js) y abre el manual en la
rem  seccion 13: Estudio Instagram.
rem
rem  Doble clic para usar. Variable opcional de entorno:
rem    TBI_SIN_BROWSER=1  -> no abre el navegador (para pruebas)
rem ============================================================

set "PUERTO=3000"
set "URL=http://localhost:%PUERTO%/manual-de-imagen.html#estudio"

echo ==================================================
echo    Tropical Biohostel - sitio local
echo    Abre: seccion 13 - Estudio Instagram
echo ==================================================
echo.

rem --- Node.js instalado? ---
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js en el PATH.
  echo         Instalalo desde https://nodejs.org y vuelve a ejecutar.
  pause
  exit /b 1
)

rem --- Carpeta del proyecto ---
cd /d "%~dp0frontend"
if not exist "package.json" (
  echo [ERROR] Falta la carpeta "frontend" junto a este archivo.
  pause
  exit /b 1
)

rem --- El sitio ya esta respondiendo? ---
call :responde
if not errorlevel 1 (
  echo El sitio ya esta corriendo en http://localhost:%PUERTO%
  if not "%TBI_SIN_BROWSER%"=="1" start "" "%URL%"
  echo.
  pause
  exit /b 0
)

rem --- Algo ocupa el puerto pero no responde? ---
netstat -ano | findstr /c:":%PUERTO% " | findstr /c:"LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [AVISO] El puerto %PUERTO% esta ocupado pero el sitio no responde.
  echo         Cierra esa ventana o proceso y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

rem --- Dependencias (solo la primera vez) ---
if not exist "node_modules\next" (
  echo Instalando dependencias por primera vez, puede tardar...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [ERROR] fallo "npm install".
    pause
    exit /b 1
  )
)

echo Iniciando servidor de desarrollo en una ventana nueva...
start "Tropical Biohostel - Next Dev" cmd /k "node_modules\.bin\next dev"

echo Esperando a que este listo, maximo 3 minutos...
set /a intentos=0
:esperar
ping -n 4 127.0.0.1 >nul
set /a intentos+=1
call :responde
if not errorlevel 1 goto listo
echo   ... esperando inicio %intentos%/50
if %intentos% geq 50 goto agotado
goto esperar

:listo
echo.
echo LISTO - el sitio responde en:
echo    http://localhost:%PUERTO%/
echo    http://localhost:%PUERTO%/manual-de-imagen.html
if not "%TBI_SIN_BROWSER%"=="1" start "" "%URL%"
echo.
echo El servidor queda en la ventana "Tropical Biohostel - Next Dev".
echo Cierra esa ventana para detenerlo.
pause
exit /b 0

:agotado
echo.
echo [ERROR] El sitio no respondio en 3 minutos.
echo         Revisa la ventana del servidor para ver el error.
pause
exit /b 1

rem --- subrutina: comprueba si el sitio responde HTTP 200 ---
:responde
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 6; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
