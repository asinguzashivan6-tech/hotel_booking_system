'use strict';

const {
  BOOKING_STATUSES,
  addDays,
  nightsBetween,
  startOfToday
} = require('../utils/validation');

class ReportService {
  constructor({ bookings, rooms, guests }) {
    this.bookings = bookings;
    this.rooms = rooms;
    this.guests = guests;
  }

  /**
   * Dashboard figures used by the web UI and by lectures on reporting.
   * "Revenue" counts every non-cancelled booking because the reservation is
   * a confirmed source of income. Cancelled bookings are excluded.
   */
  async summary() {
    const [allBookings, allRooms, allGuests] = await Promise.all([
      this.bookings.list({}),
      this.rooms.list({}),
      this.guests.list({})
    ]);

    const nonCancelled = allBookings.filter((booking) => booking.status !== 'Cancelled');
    const statusCounts = Object.fromEntries(
      BOOKING_STATUSES.map((status) => [
        status,
        allBookings.filter((booking) => booking.status === status).length
      ])
    );

    const revenueByType = allBookings.reduce((totals, booking) => {
      if (booking.status === 'Cancelled') return totals;
      const type = booking.roomType || 'Unknown';
      totals[type] = (totals[type] || 0) + Number(booking.totalPrice || 0);
      return totals;
    }, {});

    const today = startOfToday();
    const weekAhead = addDays(today, 7);
    const upcomingArrivals = allBookings
      .filter((booking) => {
        const date = new Date(booking.checkInDate);
        return (
          booking.status === 'Confirmed' &&
          date >= today &&
          date <= weekAhead
        );
      })
      .sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate))
      .slice(0, 10)
      .map((booking) => ({
        id: booking._id,
        guestName: booking.guestName,
        roomNumber: booking.roomNumber,
        checkInDate: booking.checkInDate,
        nights: booking.nights ?? nightsBetween(
          new Date(booking.checkInDate),
          new Date(booking.checkOutDate)
        )
      }));

    const activeRooms = allRooms.filter((room) => room.status !== 'Maintenance').length;
    const occupiedRoomNumbers = new Set(
      nonCancelled
        .filter((booking) => booking.status === 'CheckedIn')
        .map((booking) => booking.roomNumber)
    );

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        bookings: allBookings.length,
        rooms: allRooms.length,
        guests: allGuests.length,
        revenue: nonCancelled.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0),
        nightsBooked: nonCancelled.reduce(
          (sum, booking) => sum + (booking.nights ?? nightsBetween(
            new Date(booking.checkInDate),
            new Date(booking.checkOutDate)
          )),
          0
        )
      },
      statusCounts,
      revenueByType,
      occupancy: {
        availableRooms: activeRooms,
        occupiedRooms: occupiedRoomNumbers.size,
        rate: activeRooms ? Math.round((occupiedRoomNumbers.size / activeRooms) * 100) : 0
      },
      upcomingArrivals,
      recentBookings: allBookings.slice(0, 5).map((booking) => ({
        id: booking._id,
        guestName: booking.guestName,
        roomNumber: booking.roomNumber,
        status: booking.status,
        totalPrice: booking.totalPrice,
        createdAt: booking.createdAt
      }))
    };
  }
}

module.exports = ReportService;
