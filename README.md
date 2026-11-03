# Marriot Hotel Booking Management System

A complete hotel reservations CRUD app for a university database course project. Node.js, Express and Mongoose power a MongoDB database; plain HTML, CSS and vanilla JavaScript provide the responsive front end served by Express.

## Booking data model

Each booking stores a guest name, unique booking reference, room type, guest email, check-in and check-out dates, guest count, booking status, and automatic `createdAt`/`updatedAt` timestamps. The API validates required fields, email format, guest count, room type, status, and that check-out is later than check-in.

## Prerequisites

- Node.js 18 or later and npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- MongoDB Compass (optional)

## Setup and run

1. Open a terminal in the `mongo-crud` project folder.
2. Install packages with `npm install`.
3. Copy `.env.example` to `.env`. The default MongoDB URI is `mongodb://127.0.0.1:27017/studentsdb`.
4. Start MongoDB locally, or configure your Atlas URI in `.env`.
5. Insert eight sample bookings with `npm run seed`.
6. Start the app with `npm run dev` (auto-restarts on code changes) or `npm start`.
7. Open [http://localhost:3000](http://localhost:3000).

The server connects to MongoDB before accepting requests. Records persist in MongoDB after the Express server restarts.

## API endpoints

All endpoints use JSON. Booking fields are `guestName`, `bookingRef`, `roomType`, `email`, `checkIn`, `checkOut`, `guests`, and `status`.

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| POST | `/api/bookings` | Create a booking | `201` |
| GET | `/api/bookings` | List all bookings | `200` |
| GET | `/api/bookings?search=amina` | Search guest name, reference, or room type | `200` |
| GET | `/api/bookings/:id` | Read one booking | `200` |
| PUT | `/api/bookings/:id` | Update a booking | `200` |
| DELETE | `/api/bookings/:id` | Delete a booking | `200` |

Validation and malformed ID errors return `400`, missing bookings return `404`, duplicate booking references return `409`, and unexpected server errors return `500`. Errors use a JSON `message` field.

Example create request:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"guestName":"Sample Guest","bookingRef":"MH-2026-099","roomType":"Deluxe","email":"guest@example.com","checkIn":"2026-12-10","checkOut":"2026-12-12","guests":2,"status":"Confirmed"}'
```

## Folder structure

```text
mongo-crud/
├── models/Booking.js       # Mongoose booking schema and validation
├── routes/bookings.js      # CRUD and search API routes
├── public/
│   ├── index.html          # Single-page booking interface
│   ├── style.css           # Responsive styling
│   └── app.js              # Fetch API, form and table behavior
├── server.js               # Express app and MongoDB connection
├── seed.js                 # Inserts eight demo bookings
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Switch to MongoDB Atlas

Create a database user and allow your current IP address in Atlas Network Access. Copy the Atlas connection string, replace its password placeholder, and set `MONGO_URI` in `.env`:

```env
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/studentsdb?retryWrites=true&w=majority
PORT=3000
```

Restart the app after changing `.env`. Keep `.env` private; it is excluded from Git.

## View bookings in MongoDB Compass

Connect Compass to `mongodb://127.0.0.1:27017` (or use your Atlas URI). Open the `studentsdb` database and its `bookings` collection. Run `npm run seed` to populate the eight demo reservations. The seed script replaces existing bookings in that collection so each run restores a predictable demo set.
