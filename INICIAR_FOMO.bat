@echo off
cd /d "%~dp0"
start "" "http://localhost:8765/inicio.html"
py -3 -m http.server 8765
pause
