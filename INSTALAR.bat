@echo off
title ⚡ NexusPay — Instalador
color 0B
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   ⚡ NexusPay — Instalador          ║
echo  ║   Automatiza Google Pay desde tu PC  ║
echo  ╚══════════════════════════════════════╝
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python no encontrado
    echo.
    echo [1] Descarga Python desde: https://www.python.org/downloads/
    echo [2] Durante la instalacion marca: "Add Python to PATH"
    echo [3] Despues de instalar, vuelve a ejecutar ESTE archivo
    echo.
    start https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python encontrado
echo.
echo Instalando dependencias (tarda 1-2 minutos)...
echo.

pip install flask -q 2>nul
if errorlevel 1 (
    echo [!] Error instalando flask
    pause
    exit /b 1
)
echo [OK] Flask instalado

pip install playwright -q 2>nul
if errorlevel 1 (
    echo [!] Error instalando playwright
    pause
    exit /b 1
)
echo [OK] Playwright instalado

echo.
echo Instalando navegador Chromium (tarda 1-2 minutos)...
playwright install chromium 2>nul
if errorlevel 1 (
    echo [!] Error instalando Chromium
    pause
    exit /b 1
)
echo [OK] Chromium instalado

echo.
echo ╔══════════════════════════════════════╗
echo ║   ✅ INSTALACION COMPLETADA          ║
echo ╚══════════════════════════════════════╝
echo.
echo Para usar NexusPay:
echo   1. Haz doble click en "INICIAR.bat"
echo   2. Abre http://localhost:5050 en tu navegador
echo   3. ¡Listo!
echo.
pause
