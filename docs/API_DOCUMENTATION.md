# API Documentation
## Marriott Hotel Management System (MHMS)

**Base URL:** `/api`  
**Format:** JSON  
**Auth:** JWT Bearer token for protected endpoints (`Authorization: Bearer <token>`)

## 1. Common Response Format
### Success
```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": []
}
```

## 2. Authentication
### POST `/auth/login`
- **Access:** Public
- **Body:**
```json
{ "email": "admin@marriott.test", "password": "Admin@123" }
```
- **Success:** returns `{ token, user }`

### GET `/auth/me`
- **Access:** Authenticated users
- **Success:** current user profile

## 3. Users / Staff
### Endpoints
- `GET /users` (Admin)
- `POST /users` (Admin)
- `GET /users/:id` (Admin)
- `PUT /users/:id` (Admin)
- `DELETE /users/:id` (Admin, deactivates user)

### Create/Update body (example)
```json
{
  "fullName": "Front Desk Agent",
  "email": "frontdesk@marriott.test",
  "password": "Front@123",
  "role": "frontdesk",
  "phone": "+1-555-0101",
  "isActive": true
}
```

## 4. Room Types
- `GET /room-types` (admin/frontdesk/housekeeping)
- `GET /room-types/:id` (admin/frontdesk/housekeeping)
- `POST /room-types` (admin)
- `PUT /room-types/:id` (admin)
- `DELETE /room-types/:id` (admin, blocked if used by rooms)

**Body example:**
```json
{
  "name": "Deluxe Room",
  "description": "Spacious room with premium amenities",
  "pricePerNight": 180,
  "capacity": 3,
  "amenities": ["Wi-Fi", "TV", "Mini Bar"],
  "bedType": "King"
}
```

## 5. Rooms
- `GET /rooms` (admin/frontdesk/housekeeping) - supports query filters like `search`, `status`, `roomType`
- `GET /rooms/:id` (admin/frontdesk/housekeeping)
- `POST /rooms` (admin)
- `PUT /rooms/:id` (admin/frontdesk/housekeeping; route permits update, business rules/usage apply)
- `DELETE /rooms/:id` (admin, soft delete with history protection)

**Body example:**
```json
{
  "roomNumber": "305",
  "floor": 3,
  "roomType": "<roomTypeId>",
  "status": "available",
  "notes": "Near elevator"
}
```
**Room statuses:** `available | occupied | dirty | maintenance`

## 6. Guests
- `GET /guests` (admin/frontdesk)
- `GET /guests/:id` (admin/frontdesk)
- `POST /guests` (admin/frontdesk)
- `PUT /guests/:id` (admin/frontdesk)
- `DELETE /guests/:id` (admin, soft delete with history protection)

**Body example:**
```json
{
  "firstName": "John",
  "lastName": "Kamau",
  "email": "john.kamau@example.com",
  "phone": "+254712345678",
  "address": "Nairobi, Kenya",
  "idType": "Passport",
  "idNumber": "A1234567",
  "nationality": "Kenyan"
}
```

## 7. Reservations
- `GET /reservations` (admin/frontdesk) - supports `search`, `q`, `status`, `guestId`, `roomId`
- `POST /reservations` (admin/frontdesk)
- `GET /reservations/:id` (admin/frontdesk)
- `PUT /reservations/:id` (admin/frontdesk)
- `DELETE /reservations/:id` (admin/frontdesk; cancel/remove per rules)
- `PATCH /reservations/:id/check-in` (admin/frontdesk)
- `PATCH /reservations/:id/check-out` (admin/frontdesk)
- `POST /reservations/:id/services` (admin/frontdesk)
- `DELETE /reservations/:id/services/:serviceId` (admin/frontdesk)

**Create/Update body example:**
```json
{
  "guestId": "<guestId>",
  "roomId": "<roomId>",
  "checkInDate": "2026-12-10",
  "checkOutDate": "2026-12-13",
  "adults": 2,
  "children": 1,
  "status": "booked",
  "notes": "Late check-in requested",
  "services": [
    { "name": "Laundry", "qty": 2, "unitPrice": 8 }
  ]
}
```
**Reservation statuses:** `booked | checked-in | checked-out | cancelled`

**Business behavior highlights:**
- Rejects overlapping non-cancelled reservations for the same room (`409`)
- Validates date range and capacity (adults + children <= room type capacity)
- Calculates `subtotal`, `tax`, and `totalAmount` server-side
- Check-out auto-creates housekeeping cleaning task and pending invoice/payment if missing

## 8. Payments / Invoices
- `GET /payments` (admin/frontdesk) - supports `search`, `status`, `reservationId`
- `POST /payments` (admin/frontdesk)
- `GET /payments/:id` (admin/frontdesk)
- `PUT /payments/:id` (admin/frontdesk)
- `DELETE /payments/:id` (admin, void invoice)

**Body example:**
```json
{
  "reservationId": "<reservationId>",
  "amount": 524,
  "method": "card",
  "status": "paid",
  "notes": "Paid at checkout"
}
```
**Methods:** `cash | card | transfer`  
**Statuses:** `pending | paid | void`

## 9. Housekeeping
- `GET /housekeeping` (admin/frontdesk/housekeeping)
- `POST /housekeeping` (admin/frontdesk)
- `GET /housekeeping/:id` (admin/frontdesk/housekeeping)
- `PUT /housekeeping/:id` (admin/frontdesk/housekeeping)
- `DELETE /housekeeping/:id` (admin)

**Body example:**
```json
{
  "roomId": "<roomId>",
  "assignedTo": "<userId>",
  "taskType": "cleaning",
  "status": "pending",
  "notes": "Auto-created after checkout"
}
```
**Task types:** `cleaning | inspection | maintenance`  
**Statuses:** `pending | in-progress | done`

## 10. Feedback
- `GET /feedback` (admin/frontdesk)
- `POST /feedback` (admin/frontdesk)
- `GET /feedback/:id` (admin/frontdesk)
- `PUT /feedback/:id` (admin/frontdesk)
- `DELETE /feedback/:id` (admin)

**Body example:**
```json
{
  "reservationId": "<reservationId>",
  "guestId": "<guestId>",
  "rating": 5,
  "comment": "Excellent stay"
}
```

## 11. Dashboard / Reports
- `GET /dashboard/summary` (admin/frontdesk/housekeeping)
- `GET /reports/summary` (alias)

Returns totals, room occupancy/status counts, today's arrivals/departures/in-house counts, revenue summary (paid/projected), reservation/housekeeping status breakdowns, and recent records.

## 12. Health Check
- `GET /health` (public)
Returns API status, service name, version, and timestamp.

## 13. Notable Status/Error Codes
- `200` OK, `201` Created
- `400` Validation/business input error
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (role not allowed)
- `404` Not found
- `409` Conflict (duplicate keys, overlap, invalid state transitions, protected deletes)
- `500` Server/internal error
