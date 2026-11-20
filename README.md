# Marriott Hotel Management System (MHMS)

A professional, full-stack **Marriott Hotel Management System** (academic simulation) aligned to the provided system development plan. The project demonstrates **MongoDB-backed data management with full CRUD operations** across hotel modules including reservations, rooms, guests, billing, housekeeping, staff, and feedback.

> **Important:** "Marriott" is used here for an academic project simulation. This is **not an official Marriott product** and should be demonstrated with sample/fictional data.

## 1. Project Overview
MHMS is a web-based hotel management application built with **Node.js, Express, MongoDB (Mongoose), and a browser-based dashboard UI**. It supports role-based access and core hotel operations:

- **Users/Staff** (Admin, Front Desk, Housekeeping) with JWT authentication
- **Room Types** (rates, capacity, amenities, bed type)
- **Rooms** (room number, floor, room type, status: available/occupied/dirty/maintenance)
- **Guests** (contact and identity details)
- **Reservations** (booking, availability check/no double booking, check-in/check-out, service charges, tax/total calculation)
- **Payments/Invoices** (invoice generation/recording, payment status and method)
- **Housekeeping Tasks** (cleaning/inspection/maintenance workflow)
- **Feedback** (guest reviews linked to reservations)
- **Dashboard** (occupancy, arrivals/departures, revenue, task summaries)

## 2. Technology Stack (Implemented)
| Layer | Technology | Notes |
|---|---|---|
| Database | MongoDB + Mongoose | Collections for users, room types, rooms, guests, reservations, payments, housekeeping tasks, feedback |
| Backend/API | Node.js + Express.js | REST API (`/api/*`) with controllers/services/repositories architecture |
| Frontend | HTML, CSS, Vanilla JavaScript (SPA-style dashboard) | Served by Express from `public/` (Vercel-compatible) |
| Auth | JWT + bcryptjs | Role-based access control (`admin`, `frontdesk`, `housekeeping`) |
| Deployment | Vercel Serverless + MongoDB Atlas | `api/index.js` + `vercel.json` included |

## 3. Key Features (Plan-Aligned)
### CRUD Modules
- Users/Staff: create, read, update, deactivate (soft delete)
- Room Types: create, read, update, delete (blocked if in use)
- Rooms: create, read, update, soft delete (with reservation-history protection)
- Guests: create, read, update, soft delete (with reservation-history protection)
- Reservations: create, read, update, delete/cancel + check-in/check-out endpoints + service charges
- Payments/Invoices: create, read, update, void (admin-only void)
- Housekeeping Tasks: create, read, update, delete
- Feedback: create, read, update, delete

### Business Rules Implemented
- **No double booking:** non-cancelled reservations for the same room cannot overlap requested dates
- **Date validation:** check-out must be after check-in; check-in cannot be in the past
- **Capacity rule:** adults + children cannot exceed room type capacity
- **Reservation status flow:** `booked → checked-in → checked-out`, `booked → cancelled`
- **Check-in:** sets reservation to `checked-in` and room status to `occupied`
- **Check-out:** sets reservation to `checked-out`, room to `dirty`, auto-creates housekeeping cleaning task, and auto-generates a pending invoice/payment if missing
- **Billing calculation:** `subtotal = (nights × room type price/night) + sum(service qty × unit price)`, `tax = subtotal × TAX_RATE`, `total = subtotal + tax`
- **Referential safety:** soft-delete/history protection for key records; unique identifiers enforced (emails, room numbers, reservation/invoice codes)

## 4. Project Structure
```text
hotel-booking-system/
├── api/                    # Vercel serverless entry (cached Mongo connection)
├── controllers/            # HTTP handlers
├── docs/                   # SRS, DB design, UML, API docs, test plan, report, manual, deployment
├── middleware/             # Auth (JWT/roles), error handling
├── models/                 # Mongoose schemas (User, RoomType, Room, Guest, Reservation, Payment, HousekeepingTask, Feedback)
├── public/                 # Frontend dashboard UI (index.html, style.css, app.js)
├── repositories/           # Data access layer and query helpers
├── routes/                 # REST API routes
├── services/               # Business logic and rule enforcement
├── utils/                  # Validation, errors, response helpers
├── .env.example
├── app.js                  # Express app factory
├── seed.js                 # Sample data + demo users
├── server.js               # Local server bootstrap
├── vercel.json
└── package.json
```

## 5. Setup (Local)
### Prerequisites
- Node.js >= 18
- MongoDB (local) or MongoDB Atlas
- npm

### Install & Configure
```bash
cd hotel-booking-system
npm install
copy .env.example .env   # Windows CMD (or: Copy-Item .env.example .env)
```
Update `.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/marriott_hms
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
TAX_RATE=0.10
```

### Seed Demo Data
```bash
npm run seed
```
Seeded demo users:
- Admin: `admin@marriott.test` / `Admin@123`
- Front Desk: `frontdesk@marriott.test` / `Front@123`
- Housekeeping: `housekeeping@marriott.test` / `House@123`

### Run
```bash
npm run dev   # or npm start
```
- App/UI: `http://localhost:5000`
- API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

## 6. API Overview (Main Endpoints)
Base URL: `/api`

| Resource | Endpoints (examples) | Access |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` | Public login, authenticated me |
| Users/Staff | `GET/POST /users`, `GET/PUT/DELETE /users/:id` | Admin |
| Room Types | `GET/POST /room-types`, `GET/PUT/DELETE /room-types/:id` | Read: all roles, Write: admin |
| Rooms | `GET/POST /rooms`, `GET/PUT/DELETE /rooms/:id` | Read: all roles, Create/Delete: admin, Update: admin/frontdesk/housekeeping |
| Guests | `GET/POST /guests`, `GET/PUT/DELETE /guests/:id` | Admin/frontdesk (delete admin) |
| Reservations | `GET/POST /reservations`, `GET/PUT/DELETE /reservations/:id`, `PATCH /reservations/:id/check-in`, `PATCH /reservations/:id/check-out`, `POST/DELETE /reservations/:id/services...` | Admin/frontdesk |
| Payments | `GET/POST /payments`, `GET/PUT/DELETE /payments/:id` | Admin/frontdesk (void/delete admin) |
| Housekeeping | `GET/POST /housekeeping`, `GET/PUT/DELETE /housekeeping/:id` | Read/update by roles per route rules |
| Feedback | `GET/POST /feedback`, `GET/PUT/DELETE /feedback/:id` | Admin/frontdesk (delete admin) |
| Dashboard | `GET /dashboard/summary` (alias `/reports/summary`) | Admin/frontdesk/housekeeping |

See `docs/API_DOCUMENTATION.md` for request/response details.

## 7. Deployment (GitHub + Vercel)
This project includes Vercel serverless support:
- `api/index.js` (Express handler with cached MongoDB connection)
- `vercel.json` (routes all requests to serverless function)

### Steps
1. Push this `hotel-booking-system` folder contents to the GitHub repo connected to your Vercel project.
2. In Vercel project settings:
   - Set **Root Directory** to `hotel-booking-system` if the app is in a subfolder of the repo
   - Add environment variables: `MONGO_URI` (MongoDB Atlas URI), `JWT_SECRET`, `JWT_EXPIRES_IN` (optional), `TAX_RATE` (optional), `NODE_ENV=production`
3. Redeploy (auto on push if connected).
4. Seed the Atlas database (run `npm run seed` locally with the Atlas `MONGO_URI` in `.env`) so demo users/data exist.

See `docs/DEPLOYMENT_VERCEL.md` for troubleshooting.

## 8. Documentation (Submission/Defense)
- `docs/SRS.md` - Software Requirements Specification
- `docs/DATABASE_DESIGN.md` - MongoDB collections, fields, relationships, indexes
- `docs/UML_DIAGRAMS.md` - Use case/class/sequence/activity diagrams (Mermaid)
- `docs/API_DOCUMENTATION.md` - REST API endpoints and access rules
- `docs/TEST_PLAN.md` - Test strategy and sample/manual cases
- `docs/USER_MANUAL.md` - Setup and usage guide
- `docs/PROJECT_REPORT.md` - Project report and defense notes
- `docs/DEPLOYMENT_VERCEL.md` - GitHub/Vercel/Atlas deployment

## 9. Notes / Limitations (as per plan scope)
- Academic simulation (no real payment gateway, no public booking portal, no mobile app)
- UI is a professional dashboard SPA served by Express (not a separate React build) for simpler Vercel deployment
- Existing automated tests from the previous version may require updates to match the new MHMS API/schema
