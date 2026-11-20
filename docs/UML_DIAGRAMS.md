# UML Diagrams
## Marriott Hotel Management System (MHMS)

The diagrams below use Mermaid syntax and reflect the implemented MHMS modules and workflows.

## 1. Use Case Diagram (Simplified)

```mermaid
flowchart LR
    Admin([Admin]) --> UC1[Login]
    FrontDesk([Front Desk]) --> UC1
    Housekeeping([Housekeeping]) --> UC1

    Admin --> UC2[Manage Staff Users]
    Admin --> UC3[Manage Room Types]
    Admin --> UC4[Manage Rooms]
    FrontDesk --> UC4U[View/Update Rooms]
    Housekeeping --> UC4H[Update Room/Task Status]

    FrontDesk --> UC5[Manage Guests]
    Admin --> UC5

    FrontDesk --> UC6[Manage Reservations]
    Admin --> UC6
    UC6 --> UC6a[Create/Update Reservation]
    UC6 --> UC6b[Check-in / Check-out]
    UC6 --> UC6c[Add/Remove Service Charges]

    FrontDesk --> UC7[Manage Payments/Invoices]
    Admin --> UC7

    FrontDesk --> UC8[Manage Housekeeping Tasks]
    Admin --> UC8
    Housekeeping --> UC8

    FrontDesk --> UC9[Manage Feedback]
    Admin --> UC9

    Admin --> UC10[View Dashboard]
    FrontDesk --> UC10
    Housekeeping --> UC10
```

## 2. Class Diagram (Domain Model)

```mermaid
classDiagram
    class User {
      +ObjectId _id
      +String fullName
      +String email
      +String passwordHash
      +String role
      +String phone
      +Boolean isActive
    }

    class RoomType {
      +ObjectId _id
      +String name
      +String description
      +Number pricePerNight
      +Number capacity
      +String[] amenities
      +String bedType
    }

    class Room {
      +ObjectId _id
      +String roomNumber
      +Number floor
      +ObjectId roomType
      +String status
      +String notes
      +Boolean isDeleted
    }

    class Guest {
      +ObjectId _id
      +String firstName
      +String lastName
      +String email
      +String phone
      +String address
      +String idType
      +String idNumber
      +String nationality
      +Boolean isDeleted
    }

    class Reservation {
      +ObjectId _id
      +String reservationCode
      +ObjectId guest
      +ObjectId room
      +Date checkInDate
      +Date checkOutDate
      +Number adults
      +Number children
      +String status
      +ServiceCharge[] services
      +Number subtotal
      +Number tax
      +Number totalAmount
      +String notes
      +ObjectId createdBy
    }

    class ServiceCharge {
      +String name
      +Number qty
      +Number unitPrice
      +Date date
    }

    class Payment {
      +ObjectId _id
      +ObjectId reservation
      +String invoiceNumber
      +Number amount
      +String method
      +String status
      +Date paidAt
      +ObjectId receivedBy
      +String notes
    }

    class HousekeepingTask {
      +ObjectId _id
      +ObjectId room
      +ObjectId assignedTo
      +String taskType
      +String status
      +String notes
      +Date completedAt
    }

    class Feedback {
      +ObjectId _id
      +ObjectId reservation
      +ObjectId guest
      +Number rating
      +String comment
    }

    RoomType "1" --> "many" Room
    Guest "1" --> "many" Reservation
    Room "1" --> "many" Reservation
    Reservation "1" --> "many" Payment
    Reservation "1" *-- "many" ServiceCharge
    Room "1" --> "many" HousekeepingTask
    User "1" --> "many" Reservation : createdBy
    User "1" --> "many" Payment : receivedBy
    User "1" --> "many" HousekeepingTask : assignedTo
    Reservation "1" --> "many" Feedback
    Guest "1" --> "many" Feedback
```

## 3. Sequence Diagram - Create Reservation (No Double Booking)

```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk/Admin
    participant UI as Web UI
    participant API as Express API
    participant RS as ReservationService
    participant DB as MongoDB

    FD->>UI: Enter guest, room, dates, occupants
    UI->>API: POST /api/reservations (JWT)
    API->>RS: create(payload, user)
    RS->>DB: Load guest, room, roomType
    RS->>RS: Validate dates/capacity/status
    RS->>DB: Check overlapping non-cancelled reservations
    alt Overlap found
      DB-->>RS: Existing reservation conflict
      RS-->>API: 409 ROOM_NOT_AVAILABLE
      API-->>UI: Error response
      UI-->>FD: Show "room already booked" error
    else No overlap
      RS->>RS: Calculate subtotal/tax/total
      RS->>DB: Insert reservation (booked)
      DB-->>RS: Reservation saved
      RS-->>API: Reservation data
      API-->>UI: 201 Created
      UI-->>FD: Reservation created successfully
    end
```

## 4. Sequence Diagram - Check-out Workflow

```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk/Admin
    participant UI as Web UI
    participant API as Express API
    participant RS as ReservationService
    participant DB as MongoDB

    FD->>UI: Click Check-out
    UI->>API: PATCH /api/reservations/:id/check-out
    API->>RS: checkOut(id)
    RS->>DB: Load reservation (must be checked-in)
    RS->>DB: Update reservation status = checked-out
    RS->>DB: Update room status = dirty
    RS->>DB: Create housekeeping cleaning task (pending)
    RS->>DB: Create pending invoice/payment if missing
    RS-->>API: Updated reservation
    API-->>UI: Success response
    UI-->>FD: Checkout complete (room dirty, task/invoice created)
```

## 5. Activity Diagram - Reservation Lifecycle

```mermaid
flowchart TD
    A[Start] --> B[Select guest and room]
    B --> C[Enter dates and occupants]
    C --> D{Valid dates & capacity?}
    D -- No --> E[Show validation error]
    E --> C
    D -- Yes --> F{Room available? No overlap / not maintenance}
    F -- No --> G[Show conflict/unavailable error]
    G --> C
    F -- Yes --> H[Create reservation - booked]
    H --> I{Front desk action}
    I -- Cancel --> J[Status = cancelled]
    I -- Check-in --> K[Status = checked-in\nRoom = occupied]
    K --> L{During stay}
    L -- Add/Remove service charges --> K
    L -- Check-out --> M[Status = checked-out\nRoom = dirty]
    M --> N[Auto-create cleaning task]
    N --> O[Auto-generate pending invoice if missing]
    O --> P[Housekeeping completes task\nRoom becomes available]
    J --> Q[End]
    P --> Q
```
