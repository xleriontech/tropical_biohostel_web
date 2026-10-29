@echo off
:: ================================================================
:: Script de respaldo diario de PostgreSQL (Tropical Biohostel)
:: Requiere: Docker Desktop ejecutado y el contenedor 'tropical-pg' levantado
:: La contrasena se lee de .env (sin versionar); generar con: node bin\credenciales.js
:: ================================================================

setlocal enabledelayedexpansion

:: Configuracion
set CONTAINER_NAME=tropical-pg
set DB_USER=turismo_user
REM La contrasena se lee de .env (archivo sin versionar); no va en este script.
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"TURISMO_PG_PASSWORD=" "%~dp0.env"`) do set DB_PASS=%%b
if "%DB_PASS%"=="" (
  echo  ERROR: falta TURISMO_PG_PASSWORD en %~dp0.env. Ejecuta: node bin\credenciales.js
  exit /b 1
)
set DB_NAME=turismo_db
set BACKUP_DIR=%~dp0backups
set PG_DUMP_OPTIONS=--clean --if-exists --create --no-owner

:: Crear carpeta de respaldos si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Nombre del archivo con fecha y hora
:: wmic ya no existe en Windows 11 24H2+; se usa PowerShell para la marca de tiempo.
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set "DT=%%a"
set "FILENAME=%BACKUP_DIR%\turismo_db_%DT%.sql"

echo ============================================
echo  RESPALDO DE BASE DE DATOS - TROPICAL BIOHOSTEL
echo ============================================
echo  Fecha: %date% %time%
echo  Contenedor: %CONTAINER_NAME%
echo  Base de datos: %DB_NAME%
echo  Archivo: %FILENAME%
echo ============================================

:: Ejecutar pg_dump dentro del contenedor Docker
docker exec -e PGPASSWORD=%DB_PASS% %CONTAINER_NAME% pg_dump -U %DB_USER% -d %DB_NAME% %PG_DUMP_OPTIONS% > "%FILENAME%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo al crear el respaldo. Verifica que Docker y el contenedor esten activos.
    if exist "%FILENAME%" del "%FILENAME%"
    exit /b 1
)

REM docker exec puede salir en 0 y dejar un volcado vacio: el tamano es la prueba real.
for %%A in ("%FILENAME%") do set TAM=%%~zA
if %TAM% LSS 1024 (
    echo.
    echo [ERROR] El respaldo salio vacio. Revisa CONTAINER_NAME, DB_USER y DB_NAME.
    if exist "%FILENAME%" del "%FILENAME%"
    exit /b 1
)

echo.
echo [OK] Respaldo creado correctamente: %FILENAME% - %TAM% bytes

:: Opcional: eliminar respaldos antiguos de más de 30 días (comentado por seguridad)
:: forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path"

endlocal
echo.
echo Presiona cualquier tecla para salir...
pause >nul
