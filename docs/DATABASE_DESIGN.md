# Database Design
## Marriott Hotel Management System (MHMS) - MongoDB

**Database (recommended):** `marriott_hms`  
**ODM:** Mongoose

## 1. Design Overview
MHMS uses MongoDB collections for hotel entities with references (`ObjectId`) between core documents and embedded subdocuments where data is naturally owned by a parent record (e.g. reservation service charges).

### Key Relationships
- `roomTypes (1) -> (N) rooms`
- `guests (1) -> (N) reservations`
- `rooms (1) -> (N) reservations` (no overlapping non-cancelled reservations allowed by business rule)
- `reservations (1) -> (N) payments` (implementation supports one/multiple records; auto-generates one on checkout if missing)
- `rooms (1) -> (N) housekeepingTasks`
- `reservations (1) -> (N) feedback` (optional module)
- `users (1) -> (N) reservations.createdBy`, `payments.receivedBy`, `housekeepingTasks.assignedTo`

## 2. Collections and Fields

### 2.1 `users` (Staff Accounts)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `fullName` | String | Required |
| `email` | String | Required, unique, lowercase |
| `passwordHash` | String | Required (bcrypt hash) |
| `role` | String enum | `admin`, `frontdesk`, `housekeeping` |
| `phone` | String | Optional |
| `isActive` | Boolean | Default `true` (soft deactivation) |
| `createdAt`, `updatedAt` | Date | Timestamps |

### 2.2 `roomtypes`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | String | Required, unique |
| `description` | String | Optional |
| `pricePerNight` | Number | Required, > 0 |
| `capacity` | Number | Required (max occupancy for reservations) |
| `amenities` | [String] | Optional |
| `bedType` | String | Optional |
| `isActive` | Boolean | Default `true` |
| `createdAt`, `updatedAt` | Date | Timestamps |

### 2.3 `rooms`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `roomNumber` | String | Required, unique, uppercase |
| `floor` | Number | Default 0 |
| `roomType` | ObjectId -> `roomtypes` | Required |
| `status` | String enum | `available`, `occupied`, `dirty`, `maintenance` |
| `notes` | String | Optional |
| `isDeleted` | Boolean | Soft delete flag |
| `createdAt`, `updatedAt` | Date | Timestamps |

**Indexes:** `roomNumber` unique, `{ roomType, status }`

### 2.4 `guests`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `firstName` | String | Required |
| `lastName` | String | Required |
| `email` | String | Optional (validated if provided) |
| `phone` | String | Optional (validated if provided) |
| `address` | String | Optional |
| `idType` | String | Optional |
| `idNumber` | String | Optional |
| `nationality` | String | Optional |
| `isDeleted` | Boolean | Soft delete flag |
| `createdAt`, `updatedAt` | Date | Timestamps |

**Indexes:** text index on name/email/phone/address/id/nationality fields (search support)

### 2.5 `reservations`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `reservationCode` | String | Required, unique (e.g. `MRT-2026-0001`) |
| `guest` | ObjectId -> `guests` | Required |
| `room` | ObjectId -> `rooms` | Required |
| `checkInDate` | Date | Required |
| `checkOutDate` | Date | Required |
| `adults` | Number | Required, >= 1 |
| `children` | Number | Required, >= 0 |
| `status` | String enum | `booked`, `checked-in`, `checked-out`, `cancelled` |
| `services` | [Embedded ServiceCharge] | `{ name, qty, unitPrice, date }` |
| `subtotal` | Number | Server-calculated |
| `tax` | Number | Server-calculated |
| `totalAmount` | Number | Server-calculated |
| `notes` | String | Optional |
| `createdBy` | ObjectId -> `users` | Optional audit/reference |
| `isDeleted` | Boolean | Soft delete flag |
| `createdAt`, `updatedAt` | Date | Timestamps |

**Indexes:**
- Unique: `reservationCode`
- Compound: `{ room: 1, checkInDate: 1, checkOutDate: 1 }` (availability/overlap checks)
- `{ guest: 1, createdAt: -1 }`

**Overlap Rule (business logic):** a room cannot have another non-cancelled reservation where `existing.checkInDate < new.checkOutDate` and `existing.checkOutDate > new.checkInDate`.

### 2.6 `payments` (Invoices/Payments)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `reservation` | ObjectId -> `reservations` | Required |
| `invoiceNumber` | String | Required, unique (e.g. `INV-2026-0001`) |
| `amount` | Number | Required |
| `method` | String enum | `cash`, `card`, `transfer` |
| `status` | String enum | `pending`, `paid`, `void` |
| `paidAt` | Date/null | Set when marked paid |
| `receivedBy` | ObjectId -> `users` | Optional |
| `notes` | String | Optional |
| `createdAt`, `updatedAt` | Date | Timestamps |

### 2.7 `housekeepingtasks`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `room` | ObjectId -> `rooms` | Required |
| `assignedTo` | ObjectId -> `users` | Optional |
| `taskType` | String enum | `cleaning`, `inspection`, `maintenance` |
| `status` | String enum | `pending`, `in-progress`, `done` |
| `notes` | String | Optional |
| `completedAt` | Date/null | Set when done |
| `createdAt`, `updatedAt` | Date | Timestamps |

### 2.8 `feedbacks` (Optional Module)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `reservation` | ObjectId -> `reservations` | Required |
| `guest` | ObjectId -> `guests` | Required |
| `rating` | Number | Required (1-5) |
| `comment` | String | Optional |
| `createdAt`, `updatedAt` | Date | Timestamps |

## 3. Embedded vs Referenced Design Decisions
- **Embedded:** `reservation.services[]` because charges belong to a specific stay and are commonly read/updated with the reservation.
- **Referenced:** guests, rooms, room types, users, payments, housekeeping tasks because they are shared entities or have independent lifecycles/history.

## 4. Data Integrity and Safety
- Unique fields/indexes prevent duplicate key entities (email, room number, reservation/invoice codes).
- Server-side validation enforces date/capacity/status/business rules.
- Soft-delete flags (`isDeleted`, `isActive`) preserve historical records where appropriate.
- Reservation totals are calculated server-side; client-provided totals are not trusted.
