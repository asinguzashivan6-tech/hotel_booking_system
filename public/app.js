const API_URL = '/api/bookings';
const rowsElement = document.getElementById('booking-rows');
const searchInput = document.getElementById('search');
const bookingForm = document.getElementById('booking-form');
const formError = document.getElementById('form-error');
const toast = document.getElementById('toast');

let bookings = [];
let activeFilter = 'All';
let toastTimer;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function displayDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function nightsBetween(start, end) {
  return Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000));
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3600);
}

function countStatus(status) {
  return bookings.filter(booking => booking.status === status).length;
}

// READ: calculate the dashboard totals from the bookings retrieved from MongoDB.
function updateSummary() {
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  setText('total-count', bookings.length);
  setText('confirmed-count', countStatus('Confirmed'));
  setText('pending-count', countStatus('Pending'));
  setText('cancelled-count', countStatus('Cancelled'));
  setText('all-filter-count', bookings.length);
  setText('confirmed-filter-count', countStatus('Confirmed'));
  setText('pending-filter-count', countStatus('Pending'));
  setText('cancelled-filter-count', countStatus('Cancelled'));

  const roomTotals = ['Standard', 'Deluxe', 'Suite', 'Executive'].map(roomType => {
    const total = bookings.filter(booking => booking.roomType === roomType).length;
    return `<article class="room-type-card"><span>${roomType}</span><strong>${total} ${total === 1 ? 'booking' : 'bookings'}</strong></article>`;
  }).join('');
  const roomList = document.getElementById('room-type-list');
  if (roomList) roomList.innerHTML = roomTotals;
}

function filteredBookings() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return bookings.filter(booking => {
    const statusMatches = activeFilter === 'All' || booking.status === activeFilter;
    const searchMatches = !query || [booking.guestName, booking.bookingRef, booking.roomType, booking.email]
      .some(value => String(value || '').toLocaleLowerCase().includes(query));
    return statusMatches && searchMatches;
  });
}

// READ: render the reservations table and attach row actions for edit and delete.
function renderBookings() {
  const visibleBookings = filteredBookings();
  if (!visibleBookings.length) {
    rowsElement.innerHTML = `<tr><td class="table-message" colspan="7">${bookings.length ? 'No reservations match your search or filter.' : 'No reservations yet. Select “New booking” to add the first one.'}</td></tr>`;
  } else {
    rowsElement.innerHTML = visibleBookings.map(booking => {
      const safeId = escapeHtml(booking._id);
      const statusClass = `status-${String(booking.status).toLowerCase().replace(/\s+/g, '-')}`;
      return `<tr>
        <td><div class="guest-cell"><span class="avatar">${escapeHtml(initials(booking.guestName))}</span><div><div class="guest-name">${escapeHtml(booking.guestName)}</div><div class="guest-email">${escapeHtml(booking.email)}</div></div></div></td>
        <td class="reference">${escapeHtml(booking.bookingRef)}</td>
        <td>${escapeHtml(booking.roomType)}</td>
        <td><div class="stay-main">${escapeHtml(displayDate(booking.checkIn))} – ${escapeHtml(displayDate(booking.checkOut))}</div><div class="stay-sub">${nightsBetween(booking.checkIn, booking.checkOut)} ${nightsBetween(booking.checkIn, booking.checkOut) === 1 ? 'night' : 'nights'}</div></td>
        <td>${escapeHtml(booking.guests)}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(booking.status)}</span></td>
        <td><div class="actions"><button class="row-action" data-action="edit" data-id="${safeId}" type="button">Edit</button><button class="row-action delete" data-action="delete" data-id="${safeId}" type="button">Delete</button></div></td>
      </tr>`;
    }).join('');
  }
  const showingCount = document.getElementById('showing-count');
  if (showingCount) showingCount.textContent = `Showing ${visibleBookings.length} of ${bookings.length} ${bookings.length === 1 ? 'reservation' : 'reservations'}`;
}

// READ ALL: load current reservations from Express, which reads them from MongoDB.
async function loadBookings() {
  rowsElement.innerHTML = '<tr><td class="table-message" colspan="7">Loading reservations…</td></tr>';
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not load reservations.');
    bookings = data;
    updateSummary();
    renderBookings();
  } catch (error) {
    rowsElement.innerHTML = '<tr><td class="table-message" colspan="7">Unable to load reservations. Check that the server and database are running.</td></tr>';
    showToast(error.message, true);
  }
}

function setFormMode(booking = null) {
  bookingForm.reset();
  formError.textContent = '';
  document.getElementById('booking-id').value = booking?._id || '';
  document.getElementById('form-title').textContent = booking ? 'Edit booking' : 'New booking';
  document.getElementById('save-booking').textContent = booking ? 'Update booking' : 'Save booking';
  if (booking) {
    for (const field of ['guestName', 'bookingRef', 'roomType', 'email', 'guests', 'status']) {
      document.getElementById(field).value = booking[field] ?? '';
    }
    document.getElementById('checkIn').value = String(booking.checkIn).slice(0, 10);
    document.getElementById('checkOut').value = String(booking.checkOut).slice(0, 10);
  } else {
    document.getElementById('guests').value = '1';
    document.getElementById('status').value = 'Confirmed';
  }
  document.getElementById('booking-form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// CREATE and UPDATE: validate form inputs, then send the correct REST request to Express.
bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  formError.textContent = '';
  if (!bookingForm.reportValidity()) return;

  const payload = Object.fromEntries(new FormData(bookingForm).entries());
  payload.guests = Number(payload.guests);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    formError.textContent = 'Enter a valid email address.';
    return;
  }
  if (new Date(payload.checkOut) <= new Date(payload.checkIn)) {
    formError.textContent = 'Check-out must be after check-in.';
    return;
  }

  const id = document.getElementById('booking-id').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_URL}/${encodeURIComponent(id)}` : API_URL;
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not save the reservation.');
    showToast(id ? 'Booking updated successfully.' : 'Booking created successfully.');
    setFormMode();
    await loadBookings();
  } catch (error) {
    formError.textContent = error.message;
  }
});

// DELETE: ask for confirmation before removing a reservation from MongoDB.
rowsElement.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const booking = bookings.find(item => item._id === button.dataset.id);
  if (!booking) return;
  if (button.dataset.action === 'edit') return setFormMode(booking);
  if (!window.confirm(`Delete the reservation for ${booking.guestName} (${booking.bookingRef})? This cannot be undone.`)) return;
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(booking._id)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not delete the reservation.');
    showToast('Booking deleted successfully.');
    await loadBookings();
  } catch (error) { showToast(error.message, true); }
});

document.getElementById('cancel-form').addEventListener('click', () => setFormMode());
document.getElementById('new-booking').addEventListener('click', () => {
  setFormMode();
  document.getElementById('guestName').focus({ preventScroll: true });
});
searchInput.addEventListener('input', renderBookings);
document.querySelector('.filters').addEventListener('click', event => {
  const filterButton = event.target.closest('[data-filter]');
  if (!filterButton) return;
  activeFilter = filterButton.dataset.filter;
  document.querySelectorAll('.filter-chip').forEach(button => button.classList.toggle('selected', button === filterButton));
  renderBookings();
});

loadBookings();
