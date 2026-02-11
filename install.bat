@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION

REM ==================================================
REM CONFIG
REM ==================================================
set PROJECT_NAME=bt_auto
set MYSQL_CONTAINER=bt_auto_sql
set DB_ROOT_USER=root
set DB_ROOT_PASS=root
set DB_NAME=bt_auto
set SQL_FILE=init.sql
set MAX_WAIT=20

REM ==================================================
REM ตรวจสอบโฟลเดอร์
REM ==================================================
for %%I in ("%cd%") do set CURRENT_DIR=%%~nxI
if not "%CURRENT_DIR%"=="%PROJECT_NAME%" (
    echo ❌ กรุณาเข้าโฟลเดอร์ %PROJECT_NAME% ก่อน
    pause
    exit /b 1
)
echo ✅ โฟลเดอร์ถูกต้อง

REM ==================================================
REM เปิด Docker Desktop
REM ==================================================
echo 🚀 กำลังเปิด Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM ==================================================
REM รอ Docker พร้อม
REM ==================================================
echo ⏳ รอ Docker พร้อมใช้งาน...
:WAIT_DOCKER
docker info >nul 2>&1
if errorlevel 1 (
    timeout /t 5 >nul
    goto WAIT_DOCKER
)
echo ✅ Docker พร้อมแล้ว

REM ==================================================
REM สร้างไฟล์ .env
REM ==================================================
echo ⚙️ กำลังสร้างไฟล์ .env
(
echo DB_HOST=mysql
echo DB_USER=user
echo DB_PASSWORD=pass
echo DB_NAME=%DB_NAME%
echo DB_PORT=3306
) > .env

REM ==================================================
REM ล้าง Docker Compose + Container เดิม (แก้ชื่อชนทุกกรณี)
REM ==================================================
echo ♻️ ล้าง container / network เดิม...

docker compose down --remove-orphans >nul 2>&1

REM ลบ container ที่ตั้งชื่อ fix ไว้ (กันหลุด)
docker rm -f bt_auto >nul 2>&1
docker rm -f bt_auto_sql >nul 2>&1


REM ==================================================
REM รัน Docker Compose
REM ==================================================
echo 🐳 กำลังรัน Docker Compose...
docker compose up -d --build
if errorlevel 1 (
    echo ❌ Docker Compose ล้มเหลว
    pause
    exit /b 1
)

REM ==================================================
REM รอ MySQL พร้อม (มี timeout)
REM ==================================================
echo ⏳ รอ MySQL พร้อมใช้งาน...
set COUNT=0
:WAIT_MYSQL
docker exec %MYSQL_CONTAINER% mysqladmin ping -u %DB_ROOT_USER% -p%DB_ROOT_PASS% --silent >nul 2>&1
if not errorlevel 1 goto MYSQL_READY

set /a COUNT+=1
if %COUNT% GEQ %MAX_WAIT% (
    echo ❌ MySQL ไม่พร้อมภายในเวลาที่กำหนด
    pause
    exit /b 1
)
timeout /t 3 >nul
goto WAIT_MYSQL

:MYSQL_READY
echo ✅ MySQL พร้อมแล้ว

REM ==================================================
REM Import Database 
REM ==================================================
if exist %SQL_FILE% (
    echo 📥 Import database...
    docker exec -i bt_auto_sql mysql -u user -ppass bt_auto < init.sql
    if errorlevel 1 (
        echo ❌ Import database ล้มเหลว
        pause
        exit /b 1
    )
    echo ✅ Import เสร็จแล้ว
) else (
    echo ⚠️ ไม่พบไฟล์ %SQL_FILE% (ข้ามขั้นตอน import)
)

echo.
echo 🎉 SETUP เสร็จสมบูรณ์
echo.

REM ==================================================
REM แสดง Logs
REM ==================================================
echo ===============================
echo 📜 Docker Logs (Ctrl+C เพื่อออก)
echo ===============================
docker compose logs -f

pause
