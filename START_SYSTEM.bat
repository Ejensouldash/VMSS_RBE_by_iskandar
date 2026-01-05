@echo off
TITLE VMMS SUPER LAUNCHER
COLOR 0A

:: 1. SET LOKASI KE TEMPAT FAIL BAT INI BERADA (Auto-Detect)
cd /d "%~dp0"

echo =====================================================
echo    🚀 MEMULAKAN SISTEM MONITORING VENDING MACHINE
echo =====================================================
echo.
echo 📂 Lokasi Folder: %CD%
echo.

:: 2. CHECKING: Pastikan fail ini duduk dalam folder yang betul
if not exist "package.json" (
    COLOR 0C
    echo.
    echo ❌ ALAMAK! FAIL INI SALAH TEMPAT.
    echo.
    echo Sila letakkan fail 'START_SYSTEM.bat' ini DI DALAM folder 'vmms-dashboard'.
    echo (Sekarang fail ini berada di Desktop atau folder luar).
    echo.
    echo Sila alihkan (Cut & Paste) fail ini masuk ke folder projek.
    echo.
    pause
    exit
)

:: 3. START BRIDGE SERVER (Backend)
if exist "bridge-server.js" (
    echo [1/3] 🔌 Menghidupkan Bridge Server...
    start "VMMS Bridge Server" cmd /k "node bridge-server.js"
) else (
    echo [INFO] bridge-server.js tiada, skip backend.
)

:: 4. START DASHBOARD (Frontend)
echo [2/3] 💻 Menghidupkan Dashboard UI...
start "VMMS Dashboard UI" cmd /k "npm run dev"

:: 5. BUKA CHROME AUTOMATIK
echo [3/3] 🌐 Membuka Browser...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ✅ SIAP! Sistem sedang berjalan.
echo ⚠️  Minimize sahaja tingkap hitam ini (JANGAN TUTUP).
echo.
pause