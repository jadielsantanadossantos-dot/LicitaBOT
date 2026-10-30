@echo off
setlocal
cd /d "%~dp0"
echo ===================================
echo  LicitaBOT - Iniciando Sistema
echo ===================================

echo [1/3] Garantindo containers Docker...
docker-compose up -d
timeout /t 5 /nobreak >nul

echo [2/3] Iniciando API...
start "LicitaBOT API" cmd /k "cd apps\api && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando WEB...
start "LicitaBOT WEB" cmd /k "cd apps\web && npm run dev"

echo.
echo ===================================
echo  Sistema iniciado!
echo  Acesse as empresas no seu painel.
echo  Web: http://localhost:3000
echo  API: http://localhost:3001
echo ===================================
pause