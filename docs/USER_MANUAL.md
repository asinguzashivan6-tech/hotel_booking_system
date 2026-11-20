# User Manual
## Marriott Hotel Management System (MHMS)

This manual explains how to set up, run, and use the Marriott Hotel Management System (academic simulation).

## 1. System Requirements
- Node.js 18 or later
- npm
- MongoDB (local) or MongoDB Atlas account
- Modern web browser (Chrome/Edge/Firefox)

## 2. Installation and Setup
1. Open the project folder `hotel-booking-system` in VS Code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from `.env.example` and configure:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/marriott_hms
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=7d
   TAX_RATE=0.10
   ```
4. Seed demo data and demo users:
   ```bash
   npm run seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5000`

## 3. Demo Login Accounts (after seeding)
- **Admin:** `admin@marriott.test` / `Admin@123`
- **Front Desk:** `frontdesk@marriott.test` / `Front@123`
- **Housekeeping:** `housekeeping@marriott.test` / `House@123`

## 4. Using the System
### 4.1 Login
- Enter email and password on the login screen.
- After login, the dashboard and modules available to your role are shown.

### 4.2 Dashboard
- View occupancy, room status counts, reservation totals, arrivals/departures/in-house, revenue summaries, and recent reservations.
- Use **Refresh** to reload latest data.

### 4.3 Room Types (Admin)
- Create/edit/delete room categories (rate, capacity, amenities, bed type).
- Room types must exist before creating rooms.

### 4.4 Rooms
- View/search/filter rooms by status.
- Admin can create/delete rooms; authorized staff can update room details/status as permitted.
- Room statuses: `available`, `occupied`, `dirty`, `maintenance`.

### 4.5 Guests (Admin/Front Desk)
- Create and maintain guest profiles (name, contact, ID, nationality, address).
- Search guests from the guest directory.

### 4.6 Reservations (Admin/Front Desk)
- Create a reservation by selecting guest, room, dates, adults/children, and notes.
- The system validates dates, capacity, and prevents overlapping bookings for the same room.
- Use **Edit** to update reservation details (when allowed).
- Use **Check-in** / **Check-out** workflow buttons:
  - Check-in: reservation becomes `checked-in`, room becomes `occupied`
  - Check-out: reservation becomes `checked-out`, room becomes `dirty`, housekeeping task and pending invoice/payment are auto-created if needed
- Use **Charges** to add/remove service charges (laundry, room service, etc.). Totals are recalculated with tax.

### 4.7 Billing / Payments (Admin/Front Desk)
- Create or update invoice/payment records for reservations.
- Set method (`cash`, `card`, `transfer`) and status (`pending`, `paid`, `void`).
- Admin can void invoices.

### 4.8 Housekeeping (All staff roles, permissions vary)
- Create and track tasks (`cleaning`, `inspection`, `maintenance`) with status (`pending`, `in-progress`, `done`).
- Assign tasks to staff users and update progress.
- Completing cleaning/inspection tasks can mark a room available (workflow support).

### 4.9 Staff Users (Admin)
- Create/edit/deactivate staff accounts.
- Assign roles: `admin`, `frontdesk`, `housekeeping`.
- Password is required when creating a new user; leave blank on edit to keep existing password.

### 4.10 Feedback (Admin/Front Desk)
- Record guest feedback linked to a reservation and guest, including rating and comments.

## 5. GitHub + Vercel Deployment Notes
1. Push the project to GitHub (repo/branch connected to Vercel).
2. In Vercel project settings:
   - Set **Root Directory** to `hotel-booking-system` if needed
   - Add env vars: `MONGO_URI` (Atlas), `JWT_SECRET`, `JWT_EXPIRES_IN`, `TAX_RATE`, `NODE_ENV=production`
3. Redeploy after env/config changes.
4. Seed Atlas DB so demo users/data exist:
   - Temporarily set local `.env` `MONGO_URI` to Atlas URI and run `npm run seed`

## 6. Troubleshooting
| Problem | Cause | Solution |
|---|---|---|
| Login fails with auth/config error | Missing/invalid `JWT_SECRET` or wrong credentials | Set `JWT_SECRET`, reseed demo users if needed |
| API/DB errors on Vercel | Missing/wrong Atlas `MONGO_URI` or network access | Configure Atlas URI in Vercel env vars, allow access, redeploy |
| Booking rejected | Overlap, invalid dates, capacity, maintenance, or status rule | Read returned error message and adjust input |
| No demo users/data after deploy | Seed not run against deployment database | Run `npm run seed` against the same Atlas database |
| Empty UI / unauthorized errors | Token expired or not logged in | Log in again |

## 7. Academic Defense Tips
- Demonstrate login with different roles.
- Show CRUD for room types, rooms, guests, reservations, payments, housekeeping.
- Demonstrate double-booking prevention and check-in/check-out workflow.
- Explain MongoDB schema, role-based access, and server-side validation/business rules.
