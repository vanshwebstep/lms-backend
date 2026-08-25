# LearnFlow LMS Backend

Node backend for the LearnFlow LMS. It now uses MySQL/MariaDB through `mysql2`.

## Run

```bash
cd E:\lms-backend
npm run dev
```

API base:

```text
http://localhost:5000/api
```

## Database

Database name:

```text
lms_db
```

Schema:

```text
E:\lms-backend\database\schema.sql
```

Default local config works for XAMPP/MariaDB root with blank password. If your password is different, create `.env` from `.env.example` and set `DB_PASSWORD`.

## Demo Users

```text
admin@learnflow.local / password123
coach@learnflow.local / password123
student@learnflow.local / password123
```

## Code Structure

```text
src/index.js                 HTTP router, CORS, and server startup (entry point)
src/config/db.js             MySQL pool
src/config/env.js            env loader
src/config/constants.js      shared constants (roles, statuses)
src/middleware/auth.js       token auth and role checks
src/routes/*.routes.js       endpoint mapping
src/controllers/*.js         request handling
src/models/*.model.js        MySQL queries
src/services/mail.js         SMTP/email sending
src/services/token.js        JWT-style access/refresh token signing
src/services/upload.js       file storage on disk
src/utils/*.js                id, password, and response helpers
```