# Komodo Hub - Wildlife Conservation Platform

A full-stack web application built for the 5005CMD Software Engineering module. The platform supports wildlife conservation efforts in Indonesia by letting users track endangered species, report wildlife sightings, donate to campaigns, and sign up for volunteer events.

## Tech Stack

- **Frontend:** React 18, React Router v6
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT-based authentication

## Project Structure

```
├── backend/
│   ├── config/db.js          # Database setup and seeding
│   ├── middleware/auth.js     # JWT auth middleware
│   ├── routes/               # API route handlers
│   └── server.js             # Express app entry point
└── frontend/
    └── src/
        ├── components/        # Navbar, Footer
        ├── context/           # Auth context
        ├── pages/             # Page components
        └── services/api.js    # Axios API calls
```

## Setup and Running

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

Backend packages installed (from `backend/package.json`):
- `express` — web framework
- `better-sqlite3` — SQLite database driver
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT auth tokens
- `cors` — cross-origin requests
- `dotenv` — environment variables
- `multer` — file/image uploads
- `nodemon` — auto-restart on file changes (dev only)

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

Frontend packages installed (from `frontend/package.json`):
- `react` / `react-dom` — UI library
- `react-router-dom` — client-side routing
- `axios` — HTTP requests to the API

### 3. Start the Backend

```bash
cd backend
npm run dev
```

Runs on `http://localhost:5000`

### 4. Start the Frontend

```bash
cd frontend
npm start
```

Runs on `http://localhost:3000`

> Make sure the backend is running before starting the frontend.

## Default Admin Login

- Email: `admin@komodohub.com`
- Password: `password`

## Features

- Species directory with search and filter by conservation status
- Community wildlife sightings feed with image upload
- Conservation donation campaigns with progress tracking
- Volunteer events with registration
- Admin dashboard for managing all content
- Role-based access (admin, researcher, donor, volunteer, registered user)
