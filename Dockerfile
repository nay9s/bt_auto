FROM node:20

WORKDIR /app

# 1. copy เฉพาะ package ก่อน เพื่อใช้ cache
COPY package*.json ./
RUN npm install

# 2. copy โค้ดทั้งหมด
COPY . .

EXPOSE 3000

# 3. ใช้ nodemon สำหรับ dev
CMD ["npm", "run", "dev"]
