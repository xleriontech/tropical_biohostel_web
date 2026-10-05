@echo off
REM ============================================================
REM  TROPICAL BIOHOSTEL - Frontend dev rapido (usa puertos.txt)
REM ============================================================
setlocal
cd /d "%~dp0frontend"
if exist "..\puertos.txt" (
  for /f "tokens=1,2 delims==" %%a in (..\puertos.txt) do set %%a=%%b
)
if "%FRONT_PORT%"=="" set FRONT_PORT=3002
start /B node .\node_modules\next\dist\bin\next dev --port %FRONT_PORT%
