@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Instalacion por unica vez (PC nuevo o recien copiado)
REM  Requiere: Node.js 22+, Docker Desktop corriendo, internet
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo  [1/7] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 goto no_node
goto node_ok
:no_node
echo  ERROR: Node.js no esta instalado. Descargalo de https://nodejs.org version 22 LTS e intenta de nuevo.
pause
exit /b 1
:node_ok
node --version

echo.
echo  [2/7] Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 goto no_docker
goto docker_ok
:no_docker
echo  ERROR: Docker Desktop no esta corriendo. Abre Docker Desktop, espera a que inicie e intenta de nuevo.
pause
exit /b 1
:docker_ok
echo  Docker OK.

echo.
echo  [3/7] Deteniendo servicios previos si existen...
taskkill /FI "WINDOWTITLE eq TROPICAL Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq TROPICAL Frontend*" /F >nul 2>&1
ping -n 4 127.0.0.1 >nul

echo.
echo  [4/7] Instalando dependencias (puede tardar varios minutos la primera vez)...
if not exist "backend\node_modules" (
  echo    - backend...
  call npm install --prefix backend --no-audit --no-fund
) else (
  echo    - backend ya instalado, se omite.
)
if not exist "frontend\node_modules" (
  echo    - frontend...
  call npm install --prefix frontend --no-audit --no-fund
) else (
  echo    - frontend ya instalado, se omite.
)

echo.
echo  [5/7] Arrancando base de datos y cache...
call "%~dp0arrancar-db.bat"

echo.
echo  [6/7] Preparando base de datos (tablas + datos de ejemplo)...
cd /d "%~dp0backend"
call npx prisma generate
call npx prisma db push
call npx ts-node prisma/seed.ts
cd /d "%~dp0"

echo.
echo  [7/7] Compilando backend...
call npm run build --prefix backend

echo.
echo  ============================================================
echo   Instalacion completa. Ahora ejecuta iniciar-tropical.bat
echo  ============================================================
pause
