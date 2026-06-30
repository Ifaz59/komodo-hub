# Komodo Hub — Backend Test Suite

Automated tests for the REST API, written with **Jest** and **Supertest**.

## What is covered
46 tests across 8 suites exercise authentication, authorisation (RBAC), species,
sightings, campaigns, donations (transactional), events (registration/capacity),
the admin dashboard, and the JWT auth middleware.

## How to run
```bash
cd backend
npm install        # installs jest + supertest (dev deps)
npm test           # runs the suite with a coverage report
```

## Design notes
- Tests run against an **isolated in-memory database** using Node's built-in
  `node:sqlite` (see `tests/testdb.js`), so they never touch the real
  `database.sqlite` file and each run starts from a clean, seeded state.
- `tests/app.js` mounts the same routers as `server.js` without binding a port,
  so Supertest can drive the API in-process.
- The DB adapter mirrors `config/db.js` (PostgreSQL→SQLite translation, `$1`
  params, `RETURNING`, `ILIKE`, transactions) so behaviour matches production.

## Result (latest run)
All 8 suites / 46 tests passing. Statement coverage ≈ 66% overall, with the
auth middleware at 100%. See `last-run-output.txt` for the captured output.
