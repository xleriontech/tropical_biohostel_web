@echo off
:: ================================================================
:: Script de respaldo diario de PostgreSQL (Tropical Biohostel)
:: Requiere: Docker Desktop ejecutado y el contenedor 'postgres' levantado
:: ================================================================

setlocal enabledelayedexpansion

:: Configuración
set CONTAINER_NAME=turistico-postgres
set DB_USER=turismo_user
set DB_PASS=***REMOVIDO-EN-PURGA***
set DB_NAME=turismo_db
set BACKUP_DIR=%~dp0backups
set PG_DUMP_OPTIONS=--clean --if-exists --create --no-owner

:: Crear carpeta de respaldos si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Nombre del archivo con fecha y hora
for /f "tokens=2 delims==" %%a in ('wmic OS get localdatetime /format:value') do set "DT=%%a"
set "FILENAME=%BACKUP_DIR%\turismo_db_%DT:~0,4%%DT:~4,2%%DT:~6,2%_%DT:~8,2%%DT:~10,2%%DT:~12,2%.sql"

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

if %errorlevel% equ 0 (
    echo.
    echo [OK] Respaldo creado correctamente: %FILENAME%
) else (
    echo.
    echo [ERROR] Fallo al crear el respaldo. Verifica que Docker y el contenedor estén activos.
    exit /b 1
)

:: Opcional: eliminar respaldos antiguos de más de 30 días (comentado por seguridad)
:: forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path"

endlocal
echo.
echo Presiona cualquier tecla para salir...
pause >nul
