@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION

REM ================= CONFIG =================
set PROJECT_NAME=bt_auto
set MYSQL_CONTAINER=bt_auto_sql

set MYSQL_PORT=3306

set DB_ROOT_USER=root
set DB_ROOT_PASS=root

set DB_NAME=bt_auto
set DB_USER=user
set DB_PASS=pass

set SQL_FILE=database.sql
set MAX_WAIT=30

REM ================= CHECK FOLDER =================
for %%I in ("%cd%") do set CURRENT_DIR=%%~nxI
if /I not "%CURRENT_DIR%"=="%PROJECT_NAME%" (
    echo ❌ กรุณาเข้าโฟลเดอร์ %PROJECT_NAME% ก่อน
    pause
    exit /b 1
)
echo ✅ โฟลเดอร์ถูกต้อง

REM ================= START DOCKER DESKTOP =================
echo 🚀 เปิด Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM ================= WAIT DOCKER ENGINE =================
echo ⏳ รอ Docker Engine พร้อมจริง ๆ...

:WAIT_DOCKER_ENGINE
docker info >nul 2>&1
if errorlevel 1 (
    timeout /t 3 >nul
    goto WAIT_DOCKER_ENGINE
)

docker ps >nul 2>&1
if errorlevel 1 (
    echo ⏳ Docker Engine ยังไม่พร้อม...
    timeout /t 3 >nul
    goto WAIT_DOCKER_ENGINE
)

echo ✅ Docker Engine พร้อมแล้ว

REM ================= FREE PORT =================
echo 🔍 ตรวจสอบพอร์ต %MYSQL_PORT%...
set KILLED_PIDS=

for /f "tokens=5" %%P in ('netstat -ano ^| findstr :%MYSQL_PORT%') do (
    echo !KILLED_PIDS! | find "%%P" >nul
    if errorlevel 1 (
        echo ⚠️ kill process %%P ที่ใช้พอร์ต %MYSQL_PORT%
        taskkill /PID %%P /F >nul 2>&1
        set KILLED_PIDS=!KILLED_PIDS! %%P
    )
)

REM ================= CREATE .env =================
echo ⚙️ สร้างไฟล์ .env
(
echo DB_HOST=mysql
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASS%
echo DB_NAME=%DB_NAME%
echo DB_PORT=3306
) > .env

REM ================= CLEAN OLD DOCKER =================
echo ♻️ ล้าง Docker เก่า...
docker compose down -v --remove-orphans >nul 2>&1
docker rm -f %MYSQL_CONTAINER% >nul 2>&1

REM ================= UP COMPOSE =================
echo 🐳 Docker Compose up...
docker compose up -d --build
if errorlevel 1 (
    echo ❌ docker compose up ล้มเหลว
    pause
    exit /b 1
)

REM ================= WAIT MYSQL =================
echo ⏳ รอ MySQL พร้อม...
set COUNT=0

:WAIT_MYSQL
docker exec %MYSQL_CONTAINER% mysqladmin ping -u%DB_ROOT_USER% -p%DB_ROOT_PASS% --silent >nul 2>&1
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

REM ================= FIX USER =================
echo 🔐 ตรวจสอบ user / สิทธิ์...
docker exec %MYSQL_CONTAINER% mysql -u%DB_ROOT_USER% -p%DB_ROOT_PASS% -e ^
"CREATE DATABASE IF NOT EXISTS %DB_NAME%;
 CREATE USER IF NOT EXISTS '%DB_USER%'@'%%' IDENTIFIED BY '%DB_PASS%';
 GRANT ALL PRIVILEGES ON %DB_NAME%.* TO '%DB_USER%'@'%%';
 FLUSH PRIVILEGES;"

REM ================= IMPORT DB =================
if exist %SQL_FILE% (
    echo 📥 Import database...
    docker exec -i %MYSQL_CONTAINER% mysql -u%DB_ROOT_USER% -p%DB_ROOT_PASS% %DB_NAME% < %SQL_FILE%
    if errorlevel 1 (
        echo ❌ Import database ล้มเหลว
        pause
        exit /b 1
    )
    echo ✅ Import เสร็จแล้ว
) else (
    echo ⚠️ ไม่พบไฟล์ %SQL_FILE% (ข้าม import)
)

echo.
echo 🎉 SETUP เสร็จสมบูรณ์
echo.

REM ================= LOGS =================
echo ===============================
echo 📜 Docker Logs (Ctrl+C เพื่อออก)
echo ===============================
docker compose logs -f

pause
