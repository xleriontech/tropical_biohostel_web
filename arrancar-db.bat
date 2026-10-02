@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Arranca Postgres (Docker) y Redis (Docker)
REM  Contenedores propios (tropical-*), sin choques con otros proyectos.
REM  Uso interno: lo llaman instalar.bat e iniciar-tropical.bat
REM ============================================================
setlocal
cd /d "%~dp0"

if exist puertos.txt (
  for /f "tokens=1,2 delims==" %%a in (puertos.txt) do set %%a=%%b
) else (
  set PG_PORT=5433
  set REDIS_PORT=6379
)

docker info >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Docker Desktop no esta corriendo. Abrelo e intenta de nuevo.
  exit /b 1
)

REM --- Postgres 16 + pgvector (volumen propio tropical_pgdata) ---
docker inspect tropical-pg >nul 2>&1
if errorlevel 1 (
  echo  Creando contenedor tropical-pg (puerto %PG_PORT%)...
  docker run -d --name tropical-pg -p %PG_PORT%:5432 -e POSTGRES_USER=turismo_user -e POSTGRES_PASSWORD=***REMOVIDO-EN-PURGA*** -e POSTGRES_DB=turismo_db -v tropical_pgdata:/var/lib/postgresql/data pgvector/pgvector:pg16
) else (
  docker start tropical-pg >nul 2>&1
)

REM --- Redis ---
docker inspect tropical-redis-1 >nul 2>&1
if errorlevel 1 (
  echo  Creando contenedor tropical-redis-1 (puerto %REDIS_PORT%)...
  docker run -d --name tropical-redis-1 -p %REDIS_PORT%:6379 redis:7
) else (
  docker start tropical-redis-1 >nul 2>&1
)

REM --- Esperar a que Postgres acepte conexiones (max 90s) ---
echo  Esperando a Postgres...
for /L %%i in (1,1,18) do (
  docker exec tropical-pg pg_isready -U turismo_user -d turismo_db >nul 2>&1
  if not errorlevel 1 goto db_ok
  ping -n 6 127.0.0.1 >nul
)
echo  ERROR: Postgres no respondio a tiempo. Revisa Docker Desktop.
exit /b 1

:db_ok
echo  Base de datos lista.
