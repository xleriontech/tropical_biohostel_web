@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Arranca Postgres (Docker) y Redis (Docker)
REM  Contenedores propios (tropical-*), sin choques con otros proyectos.
REM  Uso interno: lo llaman instalar.bat e iniciar-tropical.bat
REM
REM  Las credenciales no se escriben aqui: se leen de .env (sin versionar).
REM  Postgres y Redis se publican solo en 127.0.0.1; el backend nativo sigue
REM  escuchando en 0.0.0.0, que es como ven la PWA los celulares de la finca.
REM ============================================================
setlocal
cd /d "%~dp0"

if exist .env (
  for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"TURISMO_PG_PASSWORD=" /c:"REDIS_PASSWORD=" .env`) do set %%a=%%b
)
if "%TURISMO_PG_PASSWORD%"=="" (
  echo  ERROR: falta TURISMO_PG_PASSWORD en .env
  echo  Genera una:  python -c "import secrets;print(secrets.token_urlsafe(32))"
  exit /b 1
)
if "%REDIS_PASSWORD%"=="" (
  echo  ERROR: falta REDIS_PASSWORD en .env
  exit /b 1
)

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
  echo  Creando contenedor tropical-pg ^(127.0.0.1:%PG_PORT%^)...
  docker run -d --name tropical-pg -p 127.0.0.1:%PG_PORT%:5432 -e POSTGRES_USER=turismo_user -e POSTGRES_PASSWORD=%TURISMO_PG_PASSWORD% -e POSTGRES_DB=turismo_db -v tropical_pgdata:/var/lib/postgresql/data pgvector/pgvector:pg16
) else (
  docker start tropical-pg >nul 2>&1
)

REM --- Redis autenticado (un contenedor viejo creado sin requirepass no lo gana
REM     con "docker start": hay que recrearlo. Solo se pierde la cache) ---
docker inspect tropical-redis-1 >nul 2>&1
if errorlevel 1 goto redis_create
REM "docker start" no cambia el requirepass con el que se creo el contenedor, asi
REM que rotar REDIS_PASSWORD en .env no sirve de nada si no se recrea. Comparo la
REM contrasena actual: si no esta en el inspect, el contenedor es viejo (o nunca
REM tuvo autenticacion) y se recrea. Solo se pierde la cache.
docker inspect tropical-redis-1 2>nul | findstr /c:"%REDIS_PASSWORD%" >nul 2>&1
if errorlevel 1 (
  echo  Recreando tropical-redis-1: su requirepass no es el de .env.
  docker rm -f tropical-redis-1 >nul 2>&1
  goto redis_create
)
docker start tropical-redis-1 >nul 2>&1
goto redis_done

:redis_create
echo  Creando tropical-redis-1 (127.0.0.1:%REDIS_PORT%, autenticado)...
docker run -d --name tropical-redis-1 -p 127.0.0.1:%REDIS_PORT%:6379 redis:7 redis-server --requirepass %REDIS_PASSWORD%

:redis_done

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
REM La imagen aplica POSTGRES_PASSWORD solo en el initdb; si el volumen trae una
REM contrasena anterior, el rol se alinea con la de .env en cada arranque.
docker exec tropical-pg psql -U turismo_user -d postgres -c "ALTER USER turismo_user WITH PASSWORD '%TURISMO_PG_PASSWORD%'" >nul 2>&1
if errorlevel 1 echo  AVISO: no se pudo alinear la contrasena de Postgres. Revisa tropical-pg.
echo  Base de datos lista.
