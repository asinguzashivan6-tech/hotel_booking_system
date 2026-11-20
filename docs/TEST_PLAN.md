# Test Plan
## Marriott Hotel Management System (MHMS)

## 1. Objective
Verify that MHMS meets the plan requirements for role-based access, CRUD operations, reservation workflow, billing, housekeeping, and dashboard/reporting.

## 2. Test Scope
### In Scope
- Authentication and role-based authorization
- CRUD for users, room types, rooms, guests, reservations, payments, housekeeping tasks, feedback
- Reservation business rules (no double booking, date validation, capacity, status flow)
- Check-in/check-out side effects (room status, housekeeping task, invoice/payment generation)
- Service charges and total/tax recalculation
- Dashboard summary API/UI rendering
- Deployment readiness (env config, Vercel/Atlas behavior)

### Out of Scope
- Real payment gateway processing
- Public booking portal/mobile app
- Legacy automated tests from previous StayEase schema (require rewrite)

## 3. Test Types
| Type | Description | Tools |
|---|---|---|
| Manual functional | UI and end-to-end workflow validation | Browser, seeded DB |
| API testing | Endpoint, payload, status code, auth/role checks | Postman / curl / browser devtools |
| Integration | Cross-module behavior (reservation checkout -> room/task/payment) | Manual + API |
| Regression (targeted) | Re-test critical flows after changes | Manual checklist |

## 4. Test Environment
- Node.js >= 18
- MongoDB local or Atlas
- Seeded data via `npm run seed`
- Environment variables configured (`MONGO_URI`, `JWT_SECRET`, `TAX_RATE`)

## 5. Sample Test Cases (Plan-Aligned)

| # | Module | Test Case | Steps / Input | Expected Result |
|---|---|---|---|---|
| 1 | Auth | Login with valid admin credentials | POST `/api/auth/login` with seeded admin | 200, JWT token and user returned |
| 2 | Auth | Access protected endpoint without token | GET `/api/users` without Authorization header | 401 Unauthorized |
| 3 | RBAC | Front desk cannot delete staff user | Login as frontdesk, DELETE `/api/users/:id` | 403 Forbidden |
| 4 | Room Types | Create room type (admin) | POST `/api/room-types` valid body | 201, room type created |
| 5 | Rooms | Create room with existing room type | POST `/api/rooms` | 201, room created |
| 6 | Reservations | Prevent double booking | Create overlapping non-cancelled reservation for same room | 409 conflict / rejection message |
| 7 | Reservations | Reject checkout before check-in date validity issues | Invalid/past date or checkout <= checkin | 400 validation error |
| 8 | Reservations | Reject capacity overflow | adults + children > room type capacity | 400 capacity error |
| 9 | Reservations | Check-in booked reservation | PATCH `/api/reservations/:id/check-in` | Status becomes `checked-in`, room becomes `occupied` |
| 10 | Reservations | Check-out checked-in reservation | PATCH `/api/reservations/:id/check-out` | Status `checked-out`, room `dirty`, cleaning task created, pending payment/invoice created if missing |
| 11 | Reservations | Add service charge | POST `/api/reservations/:id/services` | Service added, subtotal/tax/total recalculated |
| 12 | Payments | Mark invoice paid | PUT `/api/payments/:id` with status `paid` | Status updated, `paidAt` set |
| 13 | Payments | Void invoice (admin only) | Admin DELETE `/api/payments/:id` | Invoice status becomes `void` |
| 14 | Housekeeping | Update task to done | PUT `/api/housekeeping/:id` status `done` | Task completed; room may become `available` for cleaning/inspection tasks |
| 15 | Dashboard | Summary endpoint returns aggregates | GET `/api/dashboard/summary` with authorized role | 200 with totals, rooms, today, revenue, breakdowns |

## 6. UI Manual Test Checklist
- Login/logout works for all seeded roles
- Role-based tabs/permissions reflected in UI
- Room types, rooms, guests CRUD forms/tables function correctly
- Reservation create/edit/check-in/check-out and service charges function correctly
- Billing and housekeeping modules function correctly
- Dashboard refresh shows updated values after operations
- Toast/error messages shown for validation/conflicts/unauthorized actions

## 7. Exit Criteria
- All critical plan-aligned flows (auth, CRUD, no double booking, check-in/check-out side effects, billing, housekeeping, dashboard) pass manual/API verification in a seeded environment.
- Known limitations (e.g. legacy tests not yet updated) are documented.
