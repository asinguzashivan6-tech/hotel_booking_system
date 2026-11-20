'use strict';

const { startOfToday } = require('../utils/validation');

class DashboardService {
  constructor({ reservations, rooms, guests, payments, housekeepingTasks }) {
    this.reservations = reservations;
    this.rooms = rooms;
    this.guests = guests;
    this.payments = payments;
    this.housekeepingTasks = housekeepingTasks;
  }

  async summary() {
    const [reservationList, roomList, guestList, paymentList, taskList] = await Promise.all([
      this.reservations.list({ sort: { createdAt: -1 } }),
      this.rooms.list({ sort: { roomNumber: 1 } }),
      this.guests.list({ sort: { createdAt: -1 } }),
      this.payments ? this.payments.list({ sort: { createdAt: -1 } }) : Promise.resolve([]),
      this.housekeepingTasks ? this.housekeepingTasks.list({ sort: { createdAt: -1 } }) : Promise.resolve([])
    ]);

    const today = startOfToday();
    const inDay = (d) => {
      const dt = new Date(d);
      return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) === today.getTime();
    };

    const nonCancelled = reservationList.filter((r) => r.status !== 'cancelled' && !r.isDeleted);
    const arrivalsToday = nonCancelled.filter((r) => inDay(r.checkInDate) && r.status === 'booked');
    const departuresToday = nonCancelled.filter((r) => inDay(r.checkOutDate) && r.status === 'checked-in');
    const currentStays = nonCancelled.filter((r) => r.status === 'checked-in');

    const occupiedRooms = roomList.filter((r) => r.status === 'occupied').length;
    const availableRooms = roomList.filter((r) => r.status === 'available').length;
    const dirtyRooms = roomList.filter((r) => r.status === 'dirty').length;
    const maintenanceRooms = roomList.filter((r) => r.status === 'maintenance').length;
    const totalRooms = roomList.length;
    const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const paidRevenue = paymentList
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const projectedRevenue = nonCancelled
      .filter((r) => ['booked', 'checked-in', 'checked-out'].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    const statusCounts = reservationList.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const tasksByStatus = taskList.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totals: {
        reservations: reservationList.length,
        guests: guestList.length,
        rooms: totalRooms,
        payments: paymentList.length,
        housekeepingTasks: taskList.length
      },
      rooms: {
        available: availableRooms,
        occupied: occupiedRooms,
        dirty: dirtyRooms,
        maintenance: maintenanceRooms,
        occupancyRate
      },
      today: {
        arrivals: arrivalsToday.length,
        departures: departuresToday.length,
        inHouse: currentStays.length
      },
      revenue: {
        paid: Number(paidRevenue.toFixed(2)),
        projected: Number(projectedRevenue.toFixed(2))
      },
      reservationStatus: statusCounts,
      housekeepingStatus: tasksByStatus,
      recentReservations: reservationList.slice(0, 5),
      arrivalsTodayList: arrivalsToday.slice(0, 10),
      departuresTodayList: departuresToday.slice(0, 10)
    };
  }
}

module.exports = DashboardService;
