## Installation
1. ติดตั้ง Docker
2. เปิดที่อยู่ของ Project ใน Command Line แล้ว Run
```docker-compose up -d```

## Configuration
สร้างไฟล์ ".env" และเพิ่มค่า `<DATABASE_HOST>` `<DATABASE_USER>` `<DATABASE_PASSWORD>` `<NAME>` `<PORT>`
```
DB_HOST=<DATABASE_HOST>
DB_USER=<DATABASE_USER>
DB_PASSWORD=<DATABASE_PASSWORD>
DB_NAME=<NAME>
DB_PORT=<PORT>
```

## Run
ใช้ ```docker compose up``` เพื่อ Run Server