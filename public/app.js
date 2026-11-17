const form = document.querySelector('#booking-form');
const rows = document.querySelector('#booking-rows');
const searchInput = document.querySelector('#search');
const toast = document.querySelector('#toast');
const submitButton = document.querySelector('#submit-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
let editingId = null;
let allBookings = [];
let toastTimer;

function showMessage(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function renderBookings(bookings) {
  document.querySelector('#booking-count').textContent = allBookings.length;
  document.querySelector('#directory-count').textContent = bookings.length;
  document.querySelector('#results-label').textContent = `Showing ${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'}`;
  if (!bookings.length) {
    rows.innerHTML = `<tr><td colspan="7" class="empty-cell">${searchInput.value.trim() ? 'No reservations match your search.' : 'No bookings yet. Add the first reservation using the form.'}</td></tr>`;
    return;
  }
  rows.innerHTML = bookings.map(booking => {
    const initials = booking.guestName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const statusClass = booking.status.toLowerCase().replace(/\s+/g, '-');
    return `<tr>
      <td><div class="guest-cell"><span class="guest-avatar">${escapeHtml(initials)}</span><div><div class="guest-name">${escapeHtml(booking.guestName)}</div><div class="guest-email">${escapeHtml(booking.email)}</div></div></div></td>
      <td class="booking-reference">${escapeHtml(booking.bookingRef)}</td><td>${escapeHtml(booking.roomType)}</td>
      <td><span class="date-range">${escapeHtml(formatDate(booking.checkIn))}<br>${escapeHtml(formatDate(booking.checkOut))}</span></td>
      <td>${escapeHtml(booking.guests)}</td><td><span class="status-badge status-${escapeHtml(statusClass)}">${escapeHtml(booking.status)}</span></td>
      <td><div class="row-actions"><button class="action-button" data-action="edit" data-id="${escapeHtml(booking._id)}">Edit</button><button class="action-button delete" data-action="delete" data-id="${escapeHtml(booking._id)}">Delete</button></div></td>
    </tr>`;
  }).join('');
}

async function loadBookings() {
  try {
    const search = searchInput.value.trim();
    const bookings = await request(`/api/bookings${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (!search) allBookings = bookings;
    renderBookings(bookings);
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="7" class="empty-cell">${escapeHtml(error.message)} Check that the server and MongoDB are running.</td></tr>`;
    showMessage(error.message, true);
  }
}

function resetForm() {
  form.reset();
  form.elements.guests.value = 1;
  form.elements.status.value = 'Confirmed';
  editingId = null;
  formTitle.textContent = 'Add a booking';
  submitButton.innerHTML = '<span class="button-symbol">＋</span> Add Booking';
  cancelButton.classList.add('hidden');
}

function validateForm() {
  if (!form.reportValidity()) return false;
  if (new Date(form.elements.checkOut.value) <= new Date(form.elements.checkIn.value)) {
    showMessage('Check-out must be after check-in.', true);
    form.elements.checkOut.focus();
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim())) {
    showMessage('Enter a valid guest email address.', true);
    form.elements.email.focus();
    return false;
  }
  return true;
}

// CREATE or UPDATE: submit the form using POST for new bookings and PUT for edits.
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validateForm()) return;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.guests = Number(payload.guests);
  submitButton.disabled = true;
  try {
    await request(editingId ? `/api/bookings/${editingId}` : '/api/bookings', {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    showMessage(editingId ? 'Booking updated successfully.' : 'Booking added successfully.');
    resetForm();
    await loadBookings();
  } catch (error) { showMessage(error.message, true); }
  finally { submitButton.disabled = false; }
});

// READ one into the form for editing, or DELETE after explicit confirmation.
rows.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const booking = allBookings.find(item => item._id === button.dataset.id);
  if (button.dataset.action === 'edit' && booking) {
    editingId = booking._id;
    for (const field of ['guestName', 'bookingRef', 'roomType', 'email', 'guests', 'status']) form.elements[field].value = booking[field];
    form.elements.checkIn.value = new Date(booking.checkIn).toISOString().slice(0, 10);
    form.elements.checkOut.value = new Date(booking.checkOut).toISOString().slice(0, 10);
    formTitle.textContent = 'Edit booking';
    submitButton.innerHTML = '<span class="button-symbol">✓</span> Update Booking';
    cancelButton.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.guestName.focus({ preventScroll: true });
  }
  if (button.dataset.action === 'delete' && booking && window.confirm(`Delete booking ${booking.bookingRef} for ${booking.guestName}? This cannot be undone.`)) {
    try {
      await request(`/api/bookings/${booking._id}`, { method: 'DELETE' });
      if (editingId === booking._id) resetForm();
      showMessage('Booking deleted successfully.');
      await loadBookings();
    } catch (error) { showMessage(error.message, true); }
  }
});

cancelButton.addEventListener('click', resetForm);
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadBookings, 180);
});

loadBookings();
