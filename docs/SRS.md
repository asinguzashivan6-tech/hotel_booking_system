# Software Requirements Specification (SRS)
## Marriott Hotel Management System (MHMS)

**Version:** 1.0 (Implementation-aligned)  
**Project Type:** Academic simulation web application  
**Stack:** MongoDB, Node.js, Express.js, Mongoose, HTML/CSS/JavaScript (JWT authentication)

> Note: "Marriott" is used for academic/simulation purposes only. This is not an official Marriott product.

## 1. Introduction
### 1.1 Purpose
This SRS describes the functional and non-functional requirements for the Marriott Hotel Management System (MHMS), a web-based system for managing hotel operations including rooms, guests, reservations, billing, housekeeping, staff, and feedback.

### 1.2 Scope
MHMS provides:
- Role-based user authentication (Admin, Front Desk, Housekeeping)
- CRUD operations for core hotel entities
- Reservation workflow with availability checking (no double booking), check-in/check-out
- Invoice/payment recording and service charges
- Housekeeping task management
- Dashboard summaries for operations and management

Out of scope (future work): real payment gateway integration, public guest booking portal, mobile app, channel-manager integrations.

## 2. Overall Description
### 2.1 Users and Roles
| Role | Responsibilities | Access |
|---|---|---|
| Admin / General Manager | Manage staff, room types, rooms, view/manage all modules and reports | Full access |
| Front Desk Agent | Manage guests, reservations, payments/invoices, service charges; assist operations | Guests, reservations, payments, rooms/room types (read), housekeeping (create/read/update), feedback |
| Housekeeping | View assigned tasks/rooms and update cleaning/status | Housekeeping tasks and room status updates (per implementation), dashboard/room views |

### 2.2 Operating Environment
- Browser-based client (modern browsers)
- Node.js/Express server
- MongoDB database (local or Atlas)
- Deployable to Vercel (serverless API) with cloud MongoDB

## 3. Functional Requirements
### 3.1 Authentication and Authorization
- FR-A1: System shall allow staff login using email and password.
- FR-A2: System shall issue JWT tokens for authenticated sessions.
- FR-A3: System shall restrict API/UI actions based on user role.
- FR-A4: Admin shall manage staff accounts (create/read/update/deactivate).

### 3.2 Room Types Management (CRUD)
- FR-RT1: Admin shall create room types with name, price per night, capacity, amenities, bed type, description.
- FR-RT2: Authorized users shall view/search room types.
- FR-RT3: Admin shall update room types.
- FR-RT4: Admin shall delete room types only if not assigned to rooms.

### 3.3 Rooms Management (CRUD)
- FR-R1: Admin shall create rooms with unique room number, floor, room type, status, notes.
- FR-R2: Authorized users shall view/search/filter rooms.
- FR-R3: Authorized staff shall update room details/status as permitted.
- FR-R4: Admin shall remove rooms (soft delete) with safeguards against removing rooms with reservation history.

### 3.4 Guests Management (CRUD)
- FR-G1: Front desk/admin shall create guest records (name, contact, identity, nationality, address).
- FR-G2: Front desk/admin shall view/search guests.
- FR-G3: Front desk/admin shall update guest records.
- FR-G4: Admin shall delete guests (soft delete) only when no reservation history exists.

### 3.5 Reservations Management (CRUD + Workflow)
- FR-RES1: Front desk/admin shall create reservations for existing guests and rooms.
- FR-RES2: System shall prevent double booking by rejecting overlapping non-cancelled reservations for the same room.
- FR-RES3: System shall validate dates (checkout after checkin, no past check-in on create) and guest capacity against room type.
- FR-RES4: Front desk/admin shall view/search/filter reservations.
- FR-RES5: Front desk/admin shall update editable reservations and recalculate totals.
- FR-RES6: System shall support check-in and check-out actions.
  - Check-in: reservation becomes `checked-in`, room becomes `occupied`.
  - Check-out: reservation becomes `checked-out`, room becomes `dirty`, cleaning task auto-created, pending invoice/payment auto-generated if missing.
- FR-RES7: Front desk/admin shall add/remove service charges for active reservations; totals recalculated with tax.
- FR-RES8: Front desk/admin shall cancel/delete reservations according to business rules (checked-in reservations require checkout first).

### 3.6 Payments/Invoices (CRUD)
- FR-P1: Front desk/admin shall create/view/update payment/invoice records linked to reservations.
- FR-P2: System shall support payment methods (cash, card, transfer) and statuses (pending, paid, void).
- FR-P3: Admin shall void invoices (delete action implemented as void).

### 3.7 Housekeeping Tasks (CRUD)
- FR-H1: Authorized staff shall create/view/update/delete housekeeping tasks as permitted.
- FR-H2: Tasks shall track room, type, status, assignee, notes, completion time.
- FR-H3: Completing cleaning/inspection tasks may set room status to `available` (workflow support).

### 3.8 Feedback (CRUD)
- FR-F1: Front desk/admin shall create/read/update feedback linked to reservation and guest.
- FR-F2: Admin shall delete feedback records.

### 3.9 Dashboard/Reports
- FR-D1: System shall provide dashboard summary including room status/occupancy, reservation counts, arrivals/departures/in-house, revenue summaries, recent reservations, and housekeeping task status counts.

## 4. Non-Functional Requirements
- **NFR-1 Security:** Passwords stored hashed (bcrypt), JWT-based authentication, role-based authorization, secrets in environment variables.
- **NFR-2 Reliability:** Server-side validation and consistent API error responses.
- **NFR-3 Usability:** Responsive dashboard UI with clear forms/tables and status indicators.
- **NFR-4 Maintainability:** Layered architecture (routes/controllers/services/repositories/models).
- **NFR-5 Deployability:** Compatible with GitHub + Vercel + MongoDB Atlas deployment.

## 5. Assumptions and Constraints
- Internet/database connectivity required for Atlas-backed deployments.
- Tax rate configurable via environment variable (`TAX_RATE`, default 0.10).
- This implementation uses a dashboard UI served by Express (not a separate React build) while preserving plan-aligned modules and workflows.
- Existing legacy automated tests from the previous system may not match the new MHMS schema/API and should be updated if re-run.
