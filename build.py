"""
NexusPay Builder — Crea ejecutable standalone
Ejecuta: python build.py
Resultado: dist/NexusPay.exe
"""

import subprocess
import sys
import os

def build():
    print("⚡ NexusPay Builder v1.0")
    print("")

    # Check PyInstaller
    try:
        import PyInstaller
        print(f"✓ PyInstaller {PyInstaller.__version__}")
    except ImportError:
        print("Instalando PyInstaller...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)

    # Check dependencies
    deps = ['flask', 'playwright']
    for dep in deps:
        try:
            __import__(dep)
            print(f"✓ {dep}")
        except ImportError:
            print(f"Instalando {dep}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep], check=True)

    print("")
    print("Construyendo ejecutable...")

    # Build command
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',
        '--windowed',
        '--name', 'NexusPay',
        '--add-data', 'server.py;.',
        '--hidden-import', 'flask',
        '--hidden-import', 'playwright',
        '--hidden-import', 'playwright.sync_api',
        '--hidden-import', 'playwright._impl',
        '--collect-all', 'playwright',
        '--collect-all', 'flask',
        'server.py'
    ]

    print(f"Comando: {' '.join(cmd)}")
    print("")

    result = subprocess.run(cmd, capture_output=False)

    if result.returncode == 0:
        print("")
        print("✅ BUILD COMPLETADO")
        print(f"   Ejecutable: dist/NexusPay.exe")
        print("")
        print("Para usar:")
        print("  1. Copia NexusPay.exe a donde quieras")
        print("  2. Ejecutalo (doble click)")
        print("  3. Abre http://localhost:5050 en tu navegador")
        print("  4. ¡Listo!")
    else:
        print("❌ Error en el build")


if __name__ == '__main__':
    build()
