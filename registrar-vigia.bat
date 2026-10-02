@echo off
REM ============================================================
REM  Registra la tarea "TROPICAL Vigia" (cada 5 minutos, OCULTA).
REM  Solo se hace una vez por PC. No requiere ser administrador
REM  en la mayoria de equipos; si falla, ejecutar como administrador.
REM ============================================================
powershell -NoProfile -Command "$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '\"%~dp0invisible.vbs\" \"%~dp0vigilar-tropical.bat\"'; $t = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5); Register-ScheduledTask -TaskName 'TROPICAL Vigia' -Action $a -Trigger $t -Force | Out-Null; Write-Host 'Tarea creada'"
if errorlevel 1 (
  echo.
  echo  No se pudo crear. Clic derecho en este archivo y
  echo  "Ejecutar como administrador".
  pause
  exit /b 1
)
echo.
echo  Tarea creada: el sitio se auto-recupera cada 5 minutos,
echo  sin mostrar ventanas.
pause
