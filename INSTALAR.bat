@echo off
echo ========================================
echo   ⚡ NexusPay — Instalador Automatico
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python no encontrado
    echo.
    echo Descarga Python desde: https://www.python.org/downloads/
    echo IMPORTANTE: Marca "Add Python to PATH" durante la instalacion
    echo.
    pause
    exit /b 1
)

echo ✅ Python encontrado
echo.

REM Install dependencies
echo Instalando dependencias...
pip install flask playwright --quiet
if errorlevel 1 (
    echo Error instalando dependencias
    pause
    exit /b 1
)

echo Instalando navegador Chromium...
playwright install chromium
if errorlevel 1 (
    echo Error instalando Chromium
    pause
    exit /b 1
)

echo.
echo ✅ Todo instalado correctamente
echo.
echo ========================================
echo   Para ejecutar NexusPay:
echo   python server.py
echo.
echo   Luego abre: http://localhost:5050
echo ========================================
echo.

REM Run the server
python server.py
