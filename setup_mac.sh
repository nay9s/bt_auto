#!/usr/bin/env bash
set -e

# ================= CONFIG =================
PROJECT_NAME="bt_auto"
MYSQL_CONTAINER="bt_auto_sql"

MYSQL_PORT=3306

DB_ROOT_USER="root"
DB_ROOT_PASS="root"

DB_NAME="bt_auto"
DB_USER="user"
DB_PASS="pass"

SQL_FILE="database.sql"
MAX_WAIT=30

# ================= START DOCKER =================
echo "🚀 เปิด Docker Desktop..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open -a Docker
fi

# ================= WAIT DOCKER ENGINE =================
echo "⏳ รอ Docker Engine พร้อมใช้งาน..."
until docker info >/dev/null 2>&1 && docker ps >/dev/null 2>&1; do
  echo "⏳ Docker ยังไม่พร้อม..."
  sleep 3
done
echo "✅ Docker Engine พร้อมแล้ว"

# ================= FREE PORT =================
echo "🔍 ตรวจสอบพอร์ต $MYSQL_PORT..."
PIDS=$(lsof -ti tcp:$MYSQL_PORT || true)
if [[ -n "$PIDS" ]]; then
  for PID in $PIDS; do
    echo "⚠️ kill process $PID ที่ใช้พอร์ต $MYSQL_PORT"
    kill -9 "$PID" || true
  done
fi

# ================= CREATE .env =================
echo "⚙️ สร้างไฟล์ .env"
cat > .env <<EOF
DB_HOST=mysql
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME
DB_PORT=3306
EOF

# ================= CLEAN OLD DOCKER =================
echo "♻️ ล้าง Docker เก่า..."
docker compose down -v --remove-orphans || true
docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true

# ================= UP COMPOSE =================
echo "🐳 Docker Compose up..."
docker compose up -d --build

# ================= WAIT MYSQL =================
echo "⏳ รอ MySQL พร้อม..."
COUNT=0
until docker exec "$MYSQL_CONTAINER" \
  mysqladmin ping -u"$DB_ROOT_USER" -p"$DB_ROOT_PASS" --silent >/dev/null 2>&1
do
  COUNT=$((COUNT+1))
  if [[ $COUNT -ge $MAX_WAIT ]]; then
    echo "❌ MySQL ไม่พร้อมภายในเวลาที่กำหนด"
    exit 1
  fi
  sleep 3
done
echo "✅ MySQL พร้อมแล้ว"

# ================= FIX USER =================
echo "🔐 ตรวจสอบ user / สิทธิ์..."
docker exec "$MYSQL_CONTAINER" \
  mysql -u"$DB_ROOT_USER" -p"$DB_ROOT_PASS" -e "
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
"

# ================= IMPORT DB =================
if [[ -f "$SQL_FILE" ]]; then
  echo "📥 Import database..."
  docker exec -i "$MYSQL_CONTAINER" \
    mysql -u"$DB_ROOT_USER" -p"$DB_ROOT_PASS" "$DB_NAME" < "$SQL_FILE"
  echo "✅ Import เสร็จแล้ว"
else
  echo "⚠️ ไม่พบไฟล์ $SQL_FILE (ข้าม import)"
fi

echo
echo "🎉 SETUP เสร็จสมบูรณ์"
echo

# ================= LOGS =================
echo "==============================="
echo "📜 Docker Logs (Ctrl+C เพื่อออก)"
echo "==============================="
docker compose logs -f
