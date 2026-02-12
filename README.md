# Smart Student Portal

A role-aware student management portal built with Express, EJS, and SQLite.  
The app supports:

- User registration and login
- Session-based authentication
- Admin-only student CRUD operations
- XML export of student data with XSL styling

This project is tailored for a university-style environment (VILNIUS TECH branding in UI), with a dedicated admin identity for student records management.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation and Setup (Local)](#installation-and-setup-local)
- [Run with Docker](#run-with-docker)
- [Default Admin Account](#default-admin-account)
- [Authentication and Authorization](#authentication-and-authorization)
- [Database Schema](#database-schema)
- [Available Routes](#available-routes)
- [NPM Scripts](#npm-scripts)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

## Overview

Smart Student Portal provides a web interface for managing student records:

- Students can register and sign in.
- Authenticated users can access the dashboard.
- Only admin users can access `/admin/students` and perform student management actions.
- Admin users can export student records as XML via `/admin/students/xml`.

The application stores data in a local SQLite database (`database.sqlite`) and initializes required tables automatically on startup.

## Tech Stack

- Backend: Node.js, Express
- Templating: EJS
- Database: SQLite3
- Auth/session: `express-session`, `bcrypt`, `connect-flash`
- Request handling: `body-parser`, `method-override`
- Containerization: Docker, Docker Compose

## Features

- Authentication
  - Register with `username`, `email`, and password
  - Login using either email or username (sent in `email` field)
  - Logout support
- Role handling
  - Effective role is derived dynamically by identity
  - Reserved admin identity: `admin@vilniustech.lt`
- Student Management (admin only)
  - List students
  - Add student
  - Edit student
  - Delete student
  - Export students as XML with linked XSL transform
- UX and messaging
  - Flash success/error messages
  - Dashboard with role-aware content and navigation

## Project Structure

```text
Smart-Student-Portal/
├── app.js                   # Express app entrypoint and middleware setup
├── config/
│   └── auth.js              # Identity normalization and admin role rules
├── controllers/
│   ├── authController.js    # Register/login/logout logic
│   └── studentController.js # Student CRUD + XML export
├── models/
│   └── db.js                # SQLite connection + schema initialization
├── routes/
│   ├── index.js             # Home + dashboard routes
│   ├── auth.js              # Auth routes
│   └── students.js          # Admin-protected student routes
├── scripts/
│   └── seedAdmin.js         # Seeds/normalizes default admin user
├── public/
│   ├── css/                 # Styles
│   ├── js/                  # Frontend scripts
│   ├── images/              # UI assets
│   └── xsl/
│       └── students.xsl     # XML stylesheet for exported student list
├── views/                   # EJS templates
├── Dockerfile
├── docker-compose.yml
├── package.json
└── database.sqlite          # Local DB (generated/updated at runtime)
```

## How It Works

1. `app.js` configures middleware, sessions, flash messages, static assets, and view engine.
2. `models/db.js` opens SQLite DB and ensures `users` and `students` tables exist.
3. On each request, `res.locals.user` and flash messages are injected for views.
4. `routes/students.js` applies:
   - `isAuthenticated`: requires logged-in session
   - `isAdmin`: requires effective role `admin`
5. Admin pages allow CRUD operations on `students`.
6. XML export endpoint returns student XML with an XSL stylesheet reference.

## Prerequisites

- Node.js 18+ recommended
- npm 9+ recommended

Optional:

- Docker Desktop (for containerized run)

## Installation and Setup (Local)

1. Clone repository and enter project folder:

   ```bash
   git clone <your-repo-url>
   cd Smart-Student-Portal
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Seed admin user (recommended before first login):

   ```bash
   node scripts/seedAdmin.js
   ```

4. Start server:

   ```bash
   npm start
   ```

5. Open application:

   ```text
   http://localhost:3000
   ```

## Run with Docker

### Docker Compose (recommended)

```bash
docker compose up --build
```

The app will be available at:

```text
http://localhost:3000
```

### Docker behavior

- Container command runs:
  - `node scripts/seedAdmin.js`
  - then `npm start`
- This ensures admin identity exists/gets normalized on container startup.

## Default Admin Account

By default, the admin seed script creates/normalizes:

- Username: `admin@vilniustech.lt`
- Email: `admin@vilniustech.lt`
- Password: `admin`

Important:

- Registration blocks this reserved admin identity from public signup.
- Change the default admin password after first login for any non-local deployment.

## Authentication and Authorization

### Session auth

- User session is stored using `express-session`.
- After login, session stores:
  - `id`
  - `username`
  - `email`
  - `role` (effective role)

### Admin resolution

Admin role is determined by identity in `config/auth.js`:

- Any user with username or email equal to `admin@vilniustech.lt` is treated as admin.
- Others are treated as student.

### Protected routes

- `/dashboard`: requires authentication
- `/admin/students/*`: requires authentication + admin role

## Database Schema

SQLite database file: `database.sqlite`

### `users`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `username` TEXT UNIQUE
- `email` TEXT (unique via partial index when not null)
- `password_hash` TEXT
- `role` TEXT DEFAULT `'student'`

Additional normalization on startup:

- email lowercased/trimmed
- username trimmed
- admin identity role forced to `admin`
- non-admin identities forced to `student`

### `students`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `surname` TEXT NOT NULL
- `student_id` TEXT UNIQUE NOT NULL
- `email` TEXT
- `group_name` TEXT
- `data` TEXT

## Available Routes

### Public routes

- `GET /` - Login page
- `GET /auth/register` - Registration page
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /auth/logout` - Logout

### Authenticated route

- `GET /dashboard` - User dashboard

### Admin-only routes

- `GET /admin/students` - List students
- `GET /admin/students/new` - Add form
- `POST /admin/students` - Create student
- `GET /admin/students/:id/edit` - Edit form
- `POST /admin/students/:id` - Update student
- `POST /admin/students/:id/delete` - Delete student
- `GET /admin/students/xml` - XML export

## NPM Scripts

From `package.json`:

- `npm start` - Start app (`node app.js`)
- `npm test` - Placeholder (currently not implemented)

## Troubleshooting

- Port already in use:
  - Change `PORT` environment variable or stop conflicting process.
- Cannot login as admin:
  - Run `node scripts/seedAdmin.js` and restart server.
- `SQLITE_CONSTRAINT` when adding/updating data:
  - Check duplicate `username`, `email`, or `student_id`.
- Missing dependencies:
  - Delete `node_modules` and reinstall with `npm install`.

## Security Notes

Current implementation is suitable for development/demo, but should be hardened for production:

- Move session secret to environment variable (currently hardcoded in `app.js`).
- Enforce HTTPS in production.
- Add CSRF protection.
- Add input validation/sanitization at route/controller boundaries.
- Replace default admin password immediately.

## License

This project includes a `LICENSE` file in the repository root.
