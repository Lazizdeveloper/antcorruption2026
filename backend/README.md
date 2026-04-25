# EthicFlow Backend

Node.js + PostgreSQL backend for the `admin`, `hr`, and `kadr` panels.

## Stack

- `express`
- `pg`
- `bcrypt`
- `jsonwebtoken`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:

   ```bash
   copy .env.example .env
   ```

3. Run migrations and seed data:

   ```bash
   npm run setup
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

5. Open Swagger UI:

   ```bash
   http://localhost:4000/docs
   ```

## Default Port

- `http://localhost:4000`
- Swagger UI: `http://localhost:4000/docs`

## Seeded Accounts

- Admin: `admin@ethicflow.uz` / `Admin123!`
- HR: `hr@ethicflow.uz` / `Hr123!`
- Candidate: `candidate@ethicflow.uz` / `Candidate123!`

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/dashboard`
- `GET /api/hr/dashboard`
- `GET /api/candidate/dashboard`
- `POST /api/uploads/profile-image`
- `POST /api/uploads/application-document`
- `POST /api/candidate/applications`
- `POST /api/candidate/applications/:id/merit-test/submit`
- `PATCH /api/hr/applications/:id/status`
- `GET /api/hr/export/applications.csv`
- `POST /api/admin/reports`
- `GET /api/admin/reports/export.csv`
