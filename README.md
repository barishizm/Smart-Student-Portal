# Smart Student Portal (SSP)

A semester project for the Internet Technologies course. The Smart Student Portal
is a complete web application that lets a university administrator manage
student records through a structured, session-protected interface, and exposes
the data as XML transformed into HTML through XSLT.

The implementation satisfies every functional requirement from the project
brief (FR1–FR6) and includes additional features (multi-language support,
notifications, schedules, profile management, secure cookies, CSRF, etc.).

## Tech Stack

- **Backend framework:** Node.js + Express 4
- **Templating:** EJS (server-rendered views in `views/`)
- **Database:** SQLite (`database.sqlite`, accessed via `better-sqlite3`)
- **Auth/Session:** `express-session`, `bcrypt`, `connect-flash`
- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Data interchange:** XML + XSLT (browser-side transformation)
- **Security:** Helmet, custom CSRF middleware, request rate limiting

## Implemented Features

### FR1 — Public Website Pages
- `GET /home` — public landing page describing the portal (`views/home.ejs`).
- `GET /about` — features overview (`views/about.ejs`).
- `GET /contact` — contact form with client + server validation
  (`views/contact.ejs`, `routes/index.js`).

### FR2 — Student Management Module (CRUD, admin only)
| Action | Route | Template |
| --- | --- | --- |
| List | `GET /students` | `views/students/list.ejs` |
| View | `GET /students/:id` | `views/students/detail.ejs` |
| New form | `GET /students/new` | `views/students/add.ejs` |
| Create | `POST /students` | — (controller) |
| Edit form | `GET /students/:id/edit` | `views/students/edit.ejs` |
| Update | `POST /students/:id` | — (controller) |
| Delete | `POST /students/:id/delete` | — (controller) |

The same routes are also available with the `/admin/students` prefix used by
the admin UI links (e.g. `GET /admin/students`).

Required student fields are stored in the `students` table:
`student_id` (unique), `full_name`, `email`, `program_department`,
`year_of_study`, `status` (Active / Inactive — enforced by `CHECK` constraint).

### FR3 — Data Validation
- **Client-side** (`public/js/students-form.js`):
  required fields, email format, Student ID pattern
  (`^[A-Za-z0-9]{3,20}$`), year-of-study range. Forms also use HTML5
  `required`, `type="email"`, `pattern`, and `min`/`max` attributes.
- **Server-side** (`controllers/studentController.js`):
  same checks repeated before insert/update; duplicate `student_id` /
  `email` rejected via the unique index and surfaced as a clear flash error.

### FR4 — Flow Management + Templates
All views are rendered through EJS (`app.set('view engine', 'ejs')` in
`app.js`); no controller returns hard-coded HTML. Routes follow the
brief's pattern (`/home`, `/students`, `/students/new`, `/students/:id`,
`/students/:id/edit`).

### FR5 — Session Management
- `express-session` with HTTP-only, `sameSite=lax`, 8-hour cookie.
- Login at `GET /` (`POST /auth/login`), logout at `GET /auth/logout`.
- `isAuthenticated` and `isAdmin` middleware guard `/students`,
  `/admin/students`, `/dashboard`, schedules, etc.
- `connect-flash` provides success / error feedback (e.g.
  *“Student added successfully”*).

### FR6 — XML + XSLT
- `GET /admin/students/xml` returns the full student list as XML
  (`controllers/studentController.js#exportXML`) with proper escaping and
  an `<?xml-stylesheet ?>` PI pointing at `/xsl/students.xsl`.
- `public/xsl/students.xsl` transforms the XML into a styled HTML report
  in the browser, including total count and Active/Inactive highlighting.
- `GET /admin/students/report` shows a dedicated **Student Report** page
  inside the admin UI (`views/students/report.ejs`) that embeds the
  XML-with-XSLT output in an iframe.

### Bonus / Optional features
- Multi-language UI (`en`, `lt`, `lv`, `ru`, `tr`).
- User profile, profile photo upload, password change.
- Notifications, events, schedules, and supporting study pages.
- CSRF protection (`utils/security.js`), rate-limited login + contact form.
- Helmet security headers and a strict Content-Security-Policy.

## Project Structure

```text
Smart-Student-Portal/
├── app.js                       # Express app entry point + middleware
├── config/auth.js               # Admin identity / role helpers
├── controllers/
│   ├── authController.js        # Login / logout / register
│   └── studentController.js     # CRUD + XML export + report
├── models/db.js                 # SQLite schema + migrations
├── public/
│   ├── css/                     # dashboard.css, login.css, subsite.css …
│   ├── js/                      # script.js, students-form.js, contact.js …
│   └── xsl/students.xsl         # XSLT for the XML report
├── routes/
│   ├── index.js                 # /, /home, /dashboard, /about, /contact
│   ├── auth.js                  # /auth/*
│   ├── students.js              # /students/* (mounted at /students and /admin/students)
│   └── …
├── scripts/seedAdmin.js         # Seeds default admin user
├── views/                       # EJS templates (home, login, students/*, …)
├── database.sqlite              # Auto-created on first run
├── Dockerfile / docker-compose.yml
└── package.json
```

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- (Optional) Docker Desktop

## Installation and Setup (Local)

```bash
git clone <repo-url>
cd Smart-Student-Portal
npm install

# 1) Seed the admin account (deterministic if ADMIN_PASSWORD is set)
ADMIN_PASSWORD=admin123 node scripts/seedAdmin.js

# 2) Start the server (default port 3001)
npm start

# Open http://localhost:3001/home   (public landing)
#   or http://localhost:3001/        (login)
```

If `ADMIN_PASSWORD` is not set, `seedAdmin.js` generates and prints a random
temporary password the first time it runs. Subsequent runs only normalize
the admin record and will not change the password — re-seed after deleting
`database.sqlite` if you need a fresh password.

## Run with Docker

```bash
docker compose up --build
# App: http://localhost:3001
```

The container runs `node scripts/seedAdmin.js` then `npm start`.

## Default Admin Account (Login Credentials for Testing)

| Field | Value |
| --- | --- |
| Email / Username | `admin@vilniustech.lt` |
| Password | `admin123` (when seeded with `ADMIN_PASSWORD=admin123`) |

The login form accepts either the email or the username. Any other
registered user is treated as a regular student and cannot reach
`/students` or `/admin/students`.

## Database Setup

The SQLite database (`database.sqlite`) is created automatically the first
time the server starts. All required tables and indexes are declared in
`models/db.js`. To start from a clean state, delete `database.sqlite` and
restart the server, then re-run `node scripts/seedAdmin.js`.

Key tables:

- `users` — `id`, `username`, `email`, `password_hash`, `role`, profile
  fields, `preferred_language`.
- `students` — `id`, `student_id` (UNIQUE), `full_name`, `name`, `surname`,
  `email`, `program_department`, `year_of_study`,
  `status` (`CHECK status IN ('Active','Inactive')`), `user_id`,
  `group_name`.
- `contact_messages`, `notifications`, `events`, `schedules`, etc.

## Available Routes (high level)

### Public
- `GET /` — Login page
- `GET /home` — Public landing page (FR1)
- `GET /auth/register`, `POST /auth/register`
- `POST /auth/login`, `GET /auth/logout`
- `GET /auth/forgot-password`, `POST /auth/forgot-password`

### Authenticated
- `GET /dashboard`
- `GET /profile`, `POST /profile/*`
- `GET /about`, `GET /contact`, `POST /contact`

### Admin only (FR2, FR4, FR6)
Both `/students/*` and `/admin/students/*` reach the same controllers:

- `GET /students` — list
- `GET /students/new`, `POST /students` — create
- `GET /students/:id` — detail
- `GET /students/:id/edit`, `POST /students/:id` — update
- `POST /students/:id/delete` — delete (with `DELETE` confirmation)
- `GET /admin/students/xml` — XML export with linked XSLT
- `GET /admin/students/report` — Student Report page (XML+XSLT iframe)

## Screenshots

Take the screenshots required by the brief from the running app:

1. Student list page — `/admin/students`
2. Add / Edit student form — `/admin/students/new` and `/admin/students/:id/edit`
3. XML / XSLT report — `/admin/students/report` (and raw XML at
   `/admin/students/xml`)
4. Login page (logged out) and dashboard (logged in), plus the
   *“not authorized”* flash message when a non-admin opens
   `/admin/students`.

## NPM Scripts

- `npm start` — start the app (`node app.js`).

## Security Notes

- Helmet headers + strict Content-Security-Policy (`frame-src 'self'`
  required for the in-app XSLT report).
- CSRF middleware on all state-changing forms (`utils/security.js`).
- Rate-limiting on login and contact form.
- `bcrypt` password hashing.
- XML output is escaped before being written to the response.

## License

See the `LICENSE` file at the repository root.
