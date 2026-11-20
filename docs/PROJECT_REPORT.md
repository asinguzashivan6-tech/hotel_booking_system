# Project Report
## Marriott Hotel Management System (MHMS)

**Project Type:** Academic simulation (hotel management web application)  
**Prepared for:** Course/project defense and submission  
**Implementation Stack:** MongoDB, Mongoose, Node.js, Express.js, HTML/CSS/JavaScript, JWT, bcrypt

> Disclaimer: "Marriott" naming is used for simulation/educational purposes only. This is not an official Marriott product.

## 1. Introduction
The Marriott Hotel Management System (MHMS) is a web-based application designed to digitize and streamline core hotel operations such as reservations, room and guest management, billing, housekeeping, and staff administration. The system replaces manual/spreadsheet-based processes with a centralized MongoDB-backed platform that supports full CRUD operations and role-based access.

## 2. Problem Statement
Manual hotel operations can lead to:
- Double bookings due to poor visibility of room availability
- Scattered guest/reservation records and data loss
- Billing errors and delayed invoice handling
- Poor coordination between front desk and housekeeping
- Limited management visibility into occupancy and revenue

## 3. Objectives
### 3.1 General Objective
To design and develop a web-based Marriott Hotel Management System that uses MongoDB to store and manage hotel data with complete CRUD operations.

### 3.2 Specific Objectives
- Manage staff/users with role-based access
- Manage room types and rooms
- Manage guest records
- Handle reservations with availability checks, check-in/check-out, and service charges
- Generate/manage invoices and payment records
- Track housekeeping tasks and room readiness
- Provide dashboard summaries for operations and management

## 4. Scope of the Implemented System
### In Scope
- Authentication (JWT) and role-based authorization (admin, frontdesk, housekeeping)
- CRUD modules: users, room types, rooms, guests, reservations, payments, housekeeping tasks, feedback
- Reservation workflow: no double booking, status transitions, check-in/check-out side effects
- Billing totals with services and tax; invoice/payment records
- Dashboard summary (occupancy, arrivals/departures, revenue, task counts)
- Vercel-compatible deployment architecture with MongoDB Atlas

### Out of Scope (Future Work)
- Real payment gateway integration
- Public guest booking portal
- Mobile application
- Channel manager integrations

## 5. Methodology and System Design
### 5.1 Architecture
MHMS follows a layered architecture:
- **Presentation:** Browser-based dashboard UI (`public/`)
- **Application/API:** Express routes, controllers, services, middleware
- **Data:** MongoDB collections accessed through Mongoose models and repositories

### 5.2 Database Design
MongoDB collections implemented: `users`, `roomtypes`, `rooms`, `guests`, `reservations`, `payments`, `housekeepingtasks`, `feedbacks`.
- References are used for core relationships (guest-room-reservation-user).
- Reservation service charges are embedded for efficient stay-level reads/updates.
- Unique indexes and validation support integrity (reservation/invoice codes, room numbers, emails).

### 5.3 Key Business Rules
- Overlap prevention for non-cancelled reservations on the same room
- Check-out after check-in and no past check-in on creation
- Capacity enforcement using room type capacity
- Reservation status flow: `booked -> checked-in -> checked-out`, `booked -> cancelled`
- Check-in sets room to occupied; check-out sets room to dirty, creates cleaning task and pending invoice/payment if missing
- Server-side total calculation: room nights + services + tax

## 6. Implementation Results
The implemented system provides a working, defense-ready MHMS prototype with:
- Secure role-based login and staff management
- Complete CRUD interfaces for core hotel modules
- Reservation operations with conflict prevention and workflow actions
- Billing/payment tracking and housekeeping task tracking
- Operational dashboard and seeded demo data for demonstration
- Documentation set (SRS, DB design, UML, API docs, test plan, user manual, deployment guide)

## 7. Testing Summary
Manual and API-based testing were planned/performed around:
- Authentication and authorization (401/403 behavior)
- CRUD correctness for all modules
- Reservation conflict handling (409), validation errors, and lifecycle transitions
- Check-out side effects (housekeeping task creation, invoice/payment generation, room status update)
- Dashboard summary accuracy and UI integration

**Note:** Legacy automated tests from the previous "StayEase" schema/API were not updated in this iteration and should be revised to match the new MHMS data model and endpoints.

## 8. Challenges and Solutions
- **Schema redesign from old system:** Replaced booking-centric model with plan-aligned entities (room types, reservations, payments, housekeeping, users/roles).
  - *Solution:* Layered refactor of models, services, routes, and UI.
- **Deployment compatibility:** Needed to keep Vercel deployment simple while expanding features.
  - *Solution:* Retained Express-served SPA dashboard and serverless `api/index.js` handler.
- **Role-based access:** Different permissions for admin/front desk/housekeeping.
  - *Solution:* JWT auth middleware and route-level role guards.

## 9. Limitations
- No real payment gateway integration
- No public self-service booking portal or mobile app
- No automated notification system (email/SMS)
- Legacy automated test suite requires migration to new MHMS contracts

## 10. Conclusion and Future Work
MHMS successfully demonstrates a plan-aligned, MongoDB-backed hotel management system with complete CRUD operations, business-rule enforcement, and operational workflows suitable for academic defense. Future enhancements include payment gateway integration, public booking portal, notifications, multi-branch support, reporting exports, and a dedicated mobile housekeeping app.
