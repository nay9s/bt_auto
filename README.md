## Installation
1. Make sure you have Docker and Docker Compose installed.
2. Build and run the Docker containers
```docker-compose up -d```

## Configuration
Create ".env" file and add key value to `<DATABASE_HOST>` `<DATABASE_USER>` `<DATABASE_PASSWORD>` `<NAME>` `<PORT>`
```
DB_HOST=<DATABASE_HOST>
DB_USER=<DATABASE_USER>
DB_PASSWORD=<DATABASE_PASSWORD>
DB_NAME=<NAME>
DB_PORT=<PORT>
```

## Run
Use ```docker compose up``` to run server