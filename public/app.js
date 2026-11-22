'use strict';

const API = '/api';
const TOKEN_KEY = 'mhms_token';
const USER_KEY = 'mhms_user';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  dashboard: null,
  roomTypes: [],
  rooms: [],
  guests: [],
  reservations: [],
  payments: [],
  tasks: [],
  users: [],
  feedback: [],
  editing: { roomType: null, room: null, guest: null, reservation: null, payment: null, task: null, user: null, feedback: null },
  selectedReservationForServices: null
};

const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmtMoney = (n) => money.format(Number(n || 0));
const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const guestName = (g) => g ? (g.fullName || `${g.firstName || ''} ${g.lastName || ''}`.trim() || '—') : '—';
const roomLabel = (r) => r ? `${r.roomNumber || '—'}${r.roomType?.name ? ` · ${r.roomType.name}` : ''}` : '—';
const roleOf = () => state.user?.role || '';

function toast(message, type = 'info') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function setAuth(token, user) {
  state.token = token || '';
  state.user = user || null;
  if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  let body = null;
  try { body = await res.json(); } catch (_) { body = null; }
  if (!res.ok) {
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    if (res.status === 401) {
      setAuth('', null);
      showLogin();
    }
    throw err;
  }
  return body;
}

function showLogin() {
  $('appView').hidden = true;
  $('loginView').style.display = 'grid';
}

function showApp() {
  $('loginView').style.display = 'none';
  $('appView').hidden = false;
  applyRoleVisibility();
  const name = state.user?.fullName || state.user?.email || 'User';
  const role = state.user?.role || 'user';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U';
  if ($('userAvatar')) $('userAvatar').textContent = initials;
  if ($('userName')) $('userName').textContent = name;
  if ($('userRoleBadge')) $('userRoleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);
}

function canAccess(rolesStr) {
  if (!rolesStr) return true;
  const allowed = rolesStr.split(',').map((r) => r.trim());
  return allowed.includes(roleOf());
}

function applyRoleVisibility() {
  document.querySelectorAll('#navTabs .tab-btn').forEach((btn) => {
    btn.hidden = !canAccess(btn.dataset.roles);
  });
  document.querySelectorAll('[data-write-roles]').forEach((el) => {
    // for forms/tables columns that require role; hide form cards if not allowed
    const allowed = canAccess(el.dataset.writeRoles);
    if (el.classList.contains('form-card') || el.tagName === 'TH') {
      el.hidden = !allowed;
    }
  });
  // ensure active tab is visible
  const active = document.querySelector('.tab-btn.active');
  if (active && active.hidden) {
    const first = Array.from(document.querySelectorAll('.tab-btn')).find((b) => !b.hidden);
    if (first) switchTab(first.dataset.tab);
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab && !b.hidden));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === tab));
}

function badge(status) {
  const key = String(status || '').toLowerCase().replace(/\s+/g, '-');
  return `<span class="status-badge status-${esc(key)}">${esc(status || '—')}</span>`;
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const modal = $('confirmModal');
    $('confirmMessage').textContent = message;
    modal.hidden = false;
    const cleanup = (val) => {
      modal.hidden = true;
      $('confirmYes').onclick = null;
      $('confirmCancel').onclick = null;
      resolve(val);
    };
    $('confirmYes').onclick = () => cleanup(true);
    $('confirmCancel').onclick = () => cleanup(false);
  });
}

function opt(value, label, selected) {
  return `<option value="${esc(value)}" ${selected ? 'selected' : ''}>${esc(label)}</option>`;
}

// -------------------- Dashboard --------------------
function renderBreakdown(containerId, items) {
  const el = $(containerId);
  if (!items || items.length === 0) { el.innerHTML = '<p class="muted">No data</p>'; return; }
  const max = Math.max(...items.map((i) => i.value), 1);
  el.innerHTML = items.map((i) => `
    <div class="breakdown-row">
      <div class="breakdown-label"><span>${esc(i.label)}</span><strong>${esc(i.text ?? i.value)}</strong></div>
      <div class="breakdown-track"><div class="breakdown-bar" style="width:${Math.max(4, (i.value / max) * 100)}%"></div></div>
    </div>`).join('');
}

function renderDashboard() {
  const d = state.dashboard || {};
  $('statReservations').textContent = d.totals?.reservations || 0;
  $('statOccupancy').textContent = `${d.rooms?.occupancyRate || 0}%`;
  $('statPaidRevenue').textContent = fmtMoney(d.revenue?.paid || 0);
  $('statTasks').textContent = d.totals?.housekeepingTasks || 0;
  $('generatedAt').textContent = `Projected revenue: ${fmtMoney(d.revenue?.projected || 0)} · Live summary`;

  renderBreakdown('todayBreakdown', [
    { label: 'Arrivals today', value: d.today?.arrivals || 0 },
    { label: 'Departures today', value: d.today?.departures || 0 },
    { label: 'In-house guests/reservations', value: d.today?.inHouse || 0 }
  ]);
  renderBreakdown('roomStatusBreakdown', [
    { label: 'Available', value: d.rooms?.available || 0 },
    { label: 'Occupied', value: d.rooms?.occupied || 0 },
    { label: 'Dirty', value: d.rooms?.dirty || 0 },
    { label: 'Maintenance', value: d.rooms?.maintenance || 0 }
  ]);

  const rows = d.recentReservations || [];
  $('recentReservationsBody').innerHTML = rows.length ? rows.map((r) => `<tr>
    <td><strong class="mono">${esc(r.reservationCode)}</strong></td>
    <td>${esc(guestName(r.guest))}</td>
    <td>${esc(r.room?.roomNumber || '—')}</td>
    <td>${esc(fmtDate(r.checkInDate))} → ${esc(fmtDate(r.checkOutDate))}</td>
    <td>${badge(r.status)}</td>
    <td class="money">${fmtMoney(r.totalAmount)}</td>
  </tr>`).join('') : `<tr><td colspan="6" class="muted">No reservations yet.</td></tr>`;
}

// -------------------- Room Types --------------------
function fillRoomTypeOptions() {
  const opts = ['<option value="">Select room type</option>'].concat(state.roomTypes.map((rt) => opt(rt._id, `${rt.name} (${fmtMoney(rt.pricePerNight)}/night, cap ${rt.capacity})`, false)));
  $('roomRoomType').innerHTML = opts.join('');
}
function resetRoomTypeForm() {
  state.editing.roomType = null;
  $('roomTypeForm').reset();
  $('roomTypeId').value = '';
  $('roomTypeFormTitle').textContent = 'Add room type';
  $('roomTypeSubmit').textContent = 'Add room type';
  $('cancelRoomTypeEdit').hidden = true;
}
function renderRoomTypes() {
  const q = ($('roomTypeSearch').value || '').toLowerCase();
  const items = state.roomTypes.filter((rt) => !q || [rt.name, rt.bedType, rt.description, ...(rt.amenities||[])].join(' ').toLowerCase().includes(q));
  $('roomTypeCount').textContent = items.length;
  $('roomTypesEmpty').hidden = items.length !== 0;
  const canWrite = roleOf() === 'admin';
  $('roomTypesBody').innerHTML = items.map((rt) => `<tr>
    <td><strong>${esc(rt.name)}</strong><span class="cell-sub">${esc(rt.description || '')}</span></td>
    <td class="money">${fmtMoney(rt.pricePerNight)}</td>
    <td>${esc(rt.capacity)}</td>
    <td>${esc(rt.bedType || '—')}</td>
    <td>${esc((rt.amenities || []).join(', ') || '—')}</td>
    ${canWrite ? `<td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-roomtype" data-id="${esc(rt._id)}">Edit</button>
      <button class="btn btn-small btn-delete" data-action="delete-roomtype" data-id="${esc(rt._id)}">Delete</button>
    </div></td>` : '<td class="muted">Admin only</td>'}
  </tr>`).join('');
}

// -------------------- Rooms --------------------
function resetRoomForm() {
  state.editing.room = null;
  $('roomForm').reset();
  $('roomId').value = '';
  $('roomFloor').value = 0;
  $('roomStatus').value = 'available';
  $('roomFormTitle').textContent = 'Add room';
  $('roomSubmit').textContent = 'Save room';
  $('cancelRoomEdit').hidden = true;
}
function renderRooms() {
  const q = ($('roomSearch').value || '').toLowerCase();
  const sf = $('roomStatusFilter').value;
  const items = state.rooms.filter((r) => {
    const hay = [r.roomNumber, r.status, r.notes, r.roomType?.name].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!sf || r.status === sf);
  });
  $('roomCount').textContent = items.length;
  $('roomsEmpty').hidden = items.length !== 0;
  const canWrite = ['admin','frontdesk','housekeeping'].includes(roleOf());
  $('roomsBody').innerHTML = items.map((r) => `<tr>
    <td><strong>${esc(r.roomNumber)}</strong><span class="cell-sub">${esc(r.notes || '')}</span></td>
    <td>${esc(r.roomType?.name || '—')}</td>
    <td class="money">${fmtMoney(r.roomType?.pricePerNight)}</td>
    <td>${esc(r.roomType?.capacity || '—')}</td>
    <td>${esc(r.floor ?? 0)}</td>
    <td>${badge(r.status)}</td>
    ${canWrite ? `<td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-room" data-id="${esc(r._id)}">Edit</button>
      ${roleOf()==='admin' ? `<button class="btn btn-small btn-delete" data-action="delete-room" data-id="${esc(r._id)}">Delete</button>` : ''}
    </div></td>` : ''}
  </tr>`).join('');
  fillReservationRoomOptions();
  fillTaskRoomOptions();
}
function fillReservationRoomOptions() {
  const rooms = state.rooms.filter((r) => r.status !== 'maintenance' || (state.editing.reservation && String($('reservationRoom').value) === String(r._id)));
  $('reservationRoom').innerHTML = ['<option value="">Select room</option>'].concat(
    rooms.map((r) => opt(r._id, `${r.roomNumber} · ${r.roomType?.name || 'Room'} (${fmtMoney(r.roomType?.pricePerNight)}/night, cap ${r.roomType?.capacity || '?'}, ${r.status})`, false))
  ).join('');
}
function fillTaskRoomOptions() {
  $('taskRoom').innerHTML = ['<option value="">Select room</option>'].concat(
    state.rooms.map((r) => opt(r._id, `${r.roomNumber} · ${r.roomType?.name || ''} (${r.status})`, false))
  ).join('');
}

// -------------------- Guests --------------------
function resetGuestForm() {
  state.editing.guest = null;
  $('guestForm').reset();
  $('guestId').value = '';
  $('guestFormTitle').textContent = 'Add guest';
  $('guestSubmit').textContent = 'Save guest';
  $('cancelGuestEdit').hidden = true;
}
function renderGuests() {
  const q = ($('guestSearch').value || '').toLowerCase();
  const items = state.guests.filter((g) => !q || [guestName(g), g.email, g.phone, g.address, g.idType, g.idNumber, g.nationality].join(' ').toLowerCase().includes(q));
  $('guestCount').textContent = items.length;
  $('guestsEmpty').hidden = items.length !== 0;
  $('guestsBody').innerHTML = items.map((g) => `<tr>
    <td><strong>${esc(guestName(g))}</strong><span class="cell-sub">${esc(g.address || '')}</span></td>
    <td>${esc(g.email || '—')}</td>
    <td>${esc(g.phone || '—')}</td>
    <td>${esc([g.idType, g.idNumber].filter(Boolean).join(' / ') || '—')}</td>
    <td>${esc(g.nationality || '—')}</td>
    <td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-guest" data-id="${esc(g._id)}">Edit</button>
      ${roleOf()==='admin' ? `<button class="btn btn-small btn-delete" data-action="delete-guest" data-id="${esc(g._id)}">Delete</button>` : ''}
    </div></td>
  </tr>`).join('');
  $('reservationGuest').innerHTML = ['<option value="">Select guest</option>'].concat(state.guests.map((g) => opt(g._id, `${guestName(g)}${g.phone ? ` (${g.phone})` : ''}`, false))).join('');
  $('feedbackGuest').innerHTML = ['<option value="">Select guest</option>'].concat(state.guests.map((g) => opt(g._id, guestName(g), false))).join('');
}

// -------------------- Reservations --------------------
function resetReservationForm() {
  state.editing.reservation = null;
  $('reservationForm').reset();
  $('reservationId').value = '';
  $('reservationAdults').value = 1;
  $('reservationChildren').value = 0;
  $('reservationStatus').value = 'booked';
  $('reservationFormTitle').textContent = 'New reservation';
  $('reservationSubmit').textContent = 'Create reservation';
  $('cancelReservationEdit').hidden = true;
}
function renderReservations() {
  const q = ($('reservationSearch').value || '').toLowerCase();
  const sf = $('reservationStatusFilter').value;
  const items = state.reservations.filter((r) => {
    const hay = [r.reservationCode, guestName(r.guest), r.guest?.email, r.guest?.phone, r.room?.roomNumber, r.status].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!sf || r.status === sf);
  });
  $('reservationCount').textContent = items.length;
  $('reservationsEmpty').hidden = items.length !== 0;
  $('reservationsBody').innerHTML = items.map((r) => {
    const actions = [`<button class="btn btn-small btn-info" data-action="services-reservation" data-id="${esc(r._id)}">Charges</button>`];
    if (r.status === 'booked') actions.push(`<button class="btn btn-small btn-success" data-action="checkin-reservation" data-id="${esc(r._id)}">Check-in</button>`);
    if (r.status === 'checked-in') actions.push(`<button class="btn btn-small btn-success" data-action="checkout-reservation" data-id="${esc(r._id)}">Check-out</button>`);
    actions.push(`<button class="btn btn-small btn-edit" data-action="edit-reservation" data-id="${esc(r._id)}">Edit</button>`);
    actions.push(`<button class="btn btn-small btn-delete" data-action="delete-reservation" data-id="${esc(r._id)}">Delete</button>`);
    return `<tr>
      <td><strong>${esc(r.reservationCode || '—')}</strong></td>
      <td>${esc(guestName(r.guest))}<span class="cell-sub">${esc(r.guest?.phone || r.guest?.email || '')}</span></td>
      <td>${esc(r.room?.roomNumber || '—')}<span class="cell-sub">${esc(r.room?.roomType?.name || '')}</span></td>
      <td>${esc(fmtDate(r.checkInDate))} → ${esc(fmtDate(r.checkOutDate))}</td>
      <td>${esc((r.adults || 0) + (r.children || 0))} (${esc(r.adults || 0)}A/${esc(r.children || 0)}C)</td>
      <td class="money">${fmtMoney(r.totalAmount)}</td>
      <td>${badge(r.status)}</td>
      <td><div class="action-buttons">${actions.join('')}</div></td>
    </tr>`;
  }).join('');
  // payment/feedback reservation selects
  const resOpts = ['<option value="">Select reservation</option>'].concat(state.reservations.map((r) => opt(r._id, `${r.reservationCode} · ${guestName(r.guest)} · ${r.room?.roomNumber || ''} (${fmtMoney(r.totalAmount)})`, false)));
  $('paymentReservation').innerHTML = resOpts.join('');
  $('feedbackReservation').innerHTML = resOpts.join('');
  renderServiceCharges();
}

function renderServiceCharges() {
  const id = state.selectedReservationForServices;
  const res = state.reservations.find((r) => String(r._id) === String(id));
  $('serviceChargeCard').hidden = !res;
  if (!res) return;
  $('serviceReservationId').value = res._id;
  const services = res.services || [];
  $('servicesBody').innerHTML = services.length ? services.map((s) => `<tr>
    <td>${esc(s.name)}</td><td>${esc(s.qty)}</td><td class="money">${fmtMoney(s.unitPrice)}</td><td class="money">${fmtMoney((s.qty||0)*(s.unitPrice||0))}</td>
    <td><button class="btn btn-small btn-delete" data-action="delete-service" data-res-id="${esc(res._id)}" data-service-id="${esc(s._id)}">Remove</button></td>
  </tr>`).join('') : `<tr><td colspan="5" class="muted">No service charges.</td></tr>`;
}

// -------------------- Payments --------------------
function resetPaymentForm() {
  state.editing.payment = null;
  $('paymentForm').reset();
  $('paymentId').value = '';
  $('paymentFormTitle').textContent = 'Create payment / invoice';
  $('paymentSubmit').textContent = 'Save payment';
  $('cancelPaymentEdit').hidden = true;
}
function renderPayments() {
  const q = ($('paymentSearch').value || '').toLowerCase();
  const items = state.payments.filter((p) => !q || [p.invoiceNumber, p.status, p.method, p.reservation?.reservationCode].join(' ').toLowerCase().includes(q));
  $('paymentCount').textContent = items.length;
  $('paymentsEmpty').hidden = items.length !== 0;
  $('paymentsBody').innerHTML = items.map((p) => `<tr>
    <td><strong class="mono">${esc(p.invoiceNumber)}</strong></td>
    <td>${esc(p.reservation?.reservationCode || '—')}<span class="cell-sub">${esc(guestName(p.reservation?.guest))}</span></td>
    <td class="money">${fmtMoney(p.amount)}</td>
    <td>${esc(p.method || '—')}</td>
    <td>${badge(p.status)}</td>
    <td>${esc(p.paidAt ? fmtDate(p.paidAt) : '—')}</td>
    <td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-payment" data-id="${esc(p._id)}">Edit</button>
      ${roleOf()==='admin' ? `<button class="btn btn-small btn-warn" data-action="void-payment" data-id="${esc(p._id)}">Void</button>` : ''}
    </div></td>
  </tr>`).join('');
}

// -------------------- Housekeeping --------------------
function resetTaskForm() {
  state.editing.task = null;
  $('taskForm').reset();
  $('taskId').value = '';
  $('taskType').value = 'cleaning';
  $('taskStatus').value = 'pending';
  $('taskAssignee').value = '';
  $('taskFormTitle').textContent = 'Create task';
  $('taskSubmit').textContent = 'Save task';
  $('cancelTaskEdit').hidden = true;
}
function renderTasks() {
  const q = ($('taskSearch').value || '').toLowerCase();
  const sf = $('taskStatusFilter').value;
  const items = state.tasks.filter((t) => {
    const hay = [t.taskType, t.status, t.notes, t.room?.roomNumber, t.assignedTo?.fullName].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!sf || t.status === sf);
  });
  $('taskCount').textContent = items.length;
  $('tasksEmpty').hidden = items.length !== 0;
  $('tasksBody').innerHTML = items.map((t) => `<tr>
    <td><strong>${esc(t.room?.roomNumber || '—')}</strong><span class="cell-sub">${esc(t.room?.roomType?.name || '')}</span></td>
    <td>${esc(t.taskType)}</td>
    <td>${badge(t.status)}</td>
    <td>${esc(t.assignedTo?.fullName || 'Unassigned')}</td>
    <td>${esc(t.notes || '—')}</td>
    <td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-task" data-id="${esc(t._id)}">Edit</button>
      ${roleOf()==='admin' ? `<button class="btn btn-small btn-delete" data-action="delete-task" data-id="${esc(t._id)}">Delete</button>` : ''}
    </div></td>
  </tr>`).join('');
  // assignee options from staff users
  const staff = state.users.filter((u) => ['housekeeping','frontdesk','admin'].includes(u.role));
  $('taskAssignee').innerHTML = ['<option value="">Unassigned</option>'].concat(staff.map((u) => opt(u._id, `${u.fullName} (${u.role})`, false))).join('');
}

// -------------------- Users --------------------
function resetUserForm() {
  state.editing.user = null;
  $('userForm').reset();
  $('userId').value = '';
  $('userRole').value = 'frontdesk';
  $('userIsActive').value = 'true';
  $('userFormTitle').textContent = 'Create staff account';
  $('userSubmit').textContent = 'Save user';
  $('cancelUserEdit').hidden = true;
  $('userPassword').required = true;
}
function renderUsers() {
  if (roleOf() !== 'admin') return;
  const q = ($('userSearch').value || '').toLowerCase();
  const items = state.users.filter((u) => !q || [u.fullName, u.email, u.role, u.phone].join(' ').toLowerCase().includes(q));
  $('userCount').textContent = items.length;
  $('usersEmpty').hidden = items.length !== 0;
  $('usersBody').innerHTML = items.map((u) => `<tr>
    <td><strong>${esc(u.fullName)}</strong></td>
    <td>${esc(u.email)}</td>
    <td>${esc(u.role)}</td>
    <td>${esc(u.phone || '—')}</td>
    <td>${badge(u.isActive === false ? 'inactive' : 'active')}</td>
    <td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-user" data-id="${esc(u._id)}">Edit</button>
      <button class="btn btn-small btn-delete" data-action="delete-user" data-id="${esc(u._id)}">Deactivate</button>
    </div></td>
  </tr>`).join('');
}

// -------------------- Feedback --------------------
function resetFeedbackForm() {
  state.editing.feedback = null;
  $('feedbackForm').reset();
  $('feedbackId').value = '';
  $('feedbackRating').value = 5;
  $('feedbackFormTitle').textContent = 'Add feedback';
  $('feedbackSubmit').textContent = 'Save feedback';
  $('cancelFeedbackEdit').hidden = true;
}
function renderFeedback() {
  if (!['admin','frontdesk'].includes(roleOf())) return;
  const items = state.feedback;
  $('feedbackCount').textContent = items.length;
  $('feedbackEmpty').hidden = items.length !== 0;
  $('feedbackBody').innerHTML = items.map((f) => `<tr>
    <td>${esc(f.reservation?.reservationCode || f.reservation || '—')}</td>
    <td>${esc(guestName(f.guest))}</td>
    <td>${'★'.repeat(Number(f.rating||0))}${'☆'.repeat(Math.max(0,5-Number(f.rating||0)))} (${esc(f.rating)})</td>
    <td>${esc(f.comment || '—')}</td>
    <td><div class="action-buttons">
      <button class="btn btn-small btn-edit" data-action="edit-feedback" data-id="${esc(f._id)}">Edit</button>
      ${roleOf()==='admin' ? `<button class="btn btn-small btn-delete" data-action="delete-feedback" data-id="${esc(f._id)}">Delete</button>` : ''}
    </div></td>
  </tr>`).join('');
}

// -------------------- Data loading --------------------
async function safeGet(path) {
  try { const res = await api(path); return res.data ?? res; } catch (e) { console.warn('Fetch failed', path, e.message); return null; }
}

async function loadAll() {
  if (!state.token || !state.user) return;
  const role = roleOf();
  const tasks = [];
  tasks.push(safeGet('/dashboard/summary').then((d) => state.dashboard = d));
  tasks.push(safeGet('/room-types').then((d) => state.roomTypes = d || []));
  tasks.push(safeGet('/rooms').then((d) => state.rooms = d || []));
  if (['admin','frontdesk'].includes(role)) tasks.push(safeGet('/guests').then((d) => state.guests = d || []));
  if (['admin','frontdesk'].includes(role)) tasks.push(safeGet('/reservations').then((d) => state.reservations = d || []));
  if (['admin','frontdesk'].includes(role)) tasks.push(safeGet('/payments').then((d) => state.payments = d || []));
  tasks.push(safeGet('/housekeeping').then((d) => state.tasks = d || []));
  if (role === 'admin') tasks.push(safeGet('/users').then((d) => state.users = d || []));
  else tasks.push(safeGet('/auth/me').then(() => { state.users = []; }));
  if (['admin','frontdesk'].includes(role)) tasks.push(safeGet('/feedback').then((d) => state.feedback = d || []));
  await Promise.all(tasks);
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderRoomTypes();
  renderRooms();
  renderGuests();
  renderReservations();
  renderPayments();
  renderTasks();
  renderUsers();
  renderFeedback();
  fillRoomTypeOptions();
}

// -------------------- Event handlers --------------------
function bindEvents() {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = $('loginEmail').value.trim();
      const password = $('loginPassword').value;
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setAuth(res.data.token, res.data.user);
      showApp();
      toast('Login successful', 'success');
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('logoutBtn').addEventListener('click', () => {
    setAuth('', null);
    toast('Logged out', 'info');
    showLogin();
  });

  $('refreshBtn').addEventListener('click', async () => { await loadAll(); toast('Data refreshed', 'success'); });

  document.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => { if (!btn.hidden) switchTab(btn.dataset.tab); }));

  // filters/search renders
  ['roomTypeSearch','roomSearch','roomStatusFilter','guestSearch','reservationSearch','reservationStatusFilter','paymentSearch','taskSearch','taskStatusFilter','userSearch']
    .forEach((id) => { const el = $(id); if (el) el.addEventListener('input', renderAll); if (el && el.tagName === 'SELECT') el.addEventListener('change', renderAll); });

  // Room Type form
  $('roomTypeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: $('roomTypeName').value.trim(),
        bedType: $('roomTypeBed').value.trim(),
        pricePerNight: Number($('roomTypePrice').value),
        capacity: Number($('roomTypeCapacity').value),
        amenities: $('roomTypeAmenities').value.split(',').map((s)=>s.trim()).filter(Boolean),
        description: $('roomTypeDescription').value.trim()
      };
      const id = $('roomTypeId').value;
      if (id) await api(`/room-types/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/room-types', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Room type ${id ? 'updated' : 'created'}`, 'success');
      resetRoomTypeForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelRoomTypeEdit').addEventListener('click', resetRoomTypeForm);

  // Room form
  $('roomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomNumber: $('roomNumber').value.trim(),
        floor: Number($('roomFloor').value || 0),
        roomType: $('roomRoomType').value,
        status: $('roomStatus').value,
        notes: $('roomNotes').value.trim()
      };
      const id = $('roomId').value;
      // housekeeping/frontdesk might only be allowed to update certain fields server-side; send all for admin, minimal for others
      if (id) await api(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/rooms', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Room ${id ? 'updated' : 'created'}`, 'success');
      resetRoomForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelRoomEdit').addEventListener('click', resetRoomForm);

  // Guest form
  $('guestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: $('guestFirstName').value.trim(),
        lastName: $('guestLastName').value.trim(),
        email: $('guestEmail').value.trim(),
        phone: $('guestPhone').value.trim(),
        idType: $('guestIdType').value.trim(),
        idNumber: $('guestIdNumber').value.trim(),
        nationality: $('guestNationality').value.trim(),
        address: $('guestAddress').value.trim()
      };
      const id = $('guestId').value;
      if (id) await api(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/guests', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Guest ${id ? 'updated' : 'created'}`, 'success');
      resetGuestForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelGuestEdit').addEventListener('click', resetGuestForm);

  // Reservation form
  $('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        guestId: $('reservationGuest').value,
        roomId: $('reservationRoom').value,
        checkInDate: $('reservationCheckIn').value,
        checkOutDate: $('reservationCheckOut').value,
        adults: Number($('reservationAdults').value || 1),
        children: Number($('reservationChildren').value || 0),
        status: $('reservationStatus').value,
        notes: $('reservationNotes').value.trim()
      };
      const id = $('reservationId').value;
      if (id) await api(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/reservations', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Reservation ${id ? 'updated' : 'created'}`, 'success');
      resetReservationForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelReservationEdit').addEventListener('click', resetReservationForm);

  // Service charge form
  $('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const resId = $('serviceReservationId').value;
      const payload = { name: $('serviceName').value.trim(), qty: Number($('serviceQty').value), unitPrice: Number($('serviceUnitPrice').value) };
      await api(`/reservations/${resId}/services`, { method: 'POST', body: JSON.stringify(payload) });
      $('serviceForm').reset();
      $('serviceReservationId').value = resId;
      $('serviceQty').value = 1;
      toast('Service charge added', 'success');
      await loadAll();
      state.selectedReservationForServices = resId;
      renderServiceCharges();
    } catch (err) { toast(err.message, 'error'); }
  });

  // Payment form
  $('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        reservationId: $('paymentReservation').value,
        amount: Number($('paymentAmount').value),
        method: $('paymentMethod').value,
        status: $('paymentStatus').value,
        notes: $('paymentNotes').value.trim()
      };
      const id = $('paymentId').value;
      if (id) await api(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/payments', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Payment ${id ? 'updated' : 'created'}`, 'success');
      resetPaymentForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelPaymentEdit').addEventListener('click', resetPaymentForm);

  // Task form
  $('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomId: $('taskRoom').value,
        taskType: $('taskType').value,
        status: $('taskStatus').value,
        assignedTo: $('taskAssignee').value || null,
        notes: $('taskNotes').value.trim()
      };
      const id = $('taskId').value;
      if (id) await api(`/housekeeping/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/housekeeping', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Task ${id ? 'updated' : 'created'}`, 'success');
      resetTaskForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelTaskEdit').addEventListener('click', resetTaskForm);

  // User form
  $('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        fullName: $('userFullName').value.trim(),
        email: $('userEmail').value.trim(),
        phone: $('userPhone').value.trim(),
        role: $('userRole').value,
        isActive: $('userIsActive').value === 'true'
      };
      const pw = $('userPassword').value;
      if (pw) payload.password = pw;
      const id = $('userId').value;
      if (!id && !pw) throw new Error('Password is required for new user');
      if (id) await api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/users', { method: 'POST', body: JSON.stringify(payload) });
      toast(`User ${id ? 'updated' : 'created'}`, 'success');
      resetUserForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelUserEdit').addEventListener('click', resetUserForm);

  // Feedback form
  $('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        reservationId: $('feedbackReservation').value,
        guestId: $('feedbackGuest').value,
        rating: Number($('feedbackRating').value),
        comment: $('feedbackComment').value.trim()
      };
      const id = $('feedbackId').value;
      if (id) await api(`/feedback/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/feedback', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Feedback ${id ? 'updated' : 'saved'}`, 'success');
      resetFeedbackForm();
      await loadAll();
    } catch (err) { toast(err.message, 'error'); }
  });
  $('cancelFeedbackEdit').addEventListener('click', resetFeedbackForm);

  // Delegated table actions
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    try {
      if (action === 'edit-roomtype') {
        const rt = state.roomTypes.find((x) => String(x._id) === String(id)); if (!rt) return;
        state.editing.roomType = id;
        $('roomTypeId').value = rt._id; $('roomTypeName').value = rt.name || ''; $('roomTypeBed').value = rt.bedType || '';
        $('roomTypePrice').value = rt.pricePerNight ?? ''; $('roomTypeCapacity').value = rt.capacity ?? '';
        $('roomTypeAmenities').value = (rt.amenities || []).join(', '); $('roomTypeDescription').value = rt.description || '';
        $('roomTypeFormTitle').textContent = 'Edit room type'; $('roomTypeSubmit').textContent = 'Update room type'; $('cancelRoomTypeEdit').hidden = false;
        switchTab('roomTypes');
      }
      if (action === 'delete-roomtype' && await confirmAction('Delete this room type?')) {
        await api(`/room-types/${id}`, { method: 'DELETE' }); toast('Room type deleted', 'success'); await loadAll();
      }

      if (action === 'edit-room') {
        const r = state.rooms.find((x) => String(x._id) === String(id)); if (!r) return;
        $('roomId').value = r._id; $('roomNumber').value = r.roomNumber || ''; $('roomFloor').value = r.floor ?? 0;
        $('roomRoomType').value = r.roomType?._id || r.roomType || ''; $('roomStatus').value = r.status || 'available'; $('roomNotes').value = r.notes || '';
        $('roomFormTitle').textContent = 'Edit room'; $('roomSubmit').textContent = 'Update room'; $('cancelRoomEdit').hidden = false;
        switchTab('rooms');
      }
      if (action === 'delete-room' && await confirmAction('Delete this room?')) {
        await api(`/rooms/${id}`, { method: 'DELETE' }); toast('Room deleted', 'success'); await loadAll();
      }

      if (action === 'edit-guest') {
        const g = state.guests.find((x) => String(x._id) === String(id)); if (!g) return;
        $('guestId').value = g._id; $('guestFirstName').value = g.firstName || ''; $('guestLastName').value = g.lastName || '';
        $('guestEmail').value = g.email || ''; $('guestPhone').value = g.phone || ''; $('guestIdType').value = g.idType || '';
        $('guestIdNumber').value = g.idNumber || ''; $('guestNationality').value = g.nationality || ''; $('guestAddress').value = g.address || '';
        $('guestFormTitle').textContent = 'Edit guest'; $('guestSubmit').textContent = 'Update guest'; $('cancelGuestEdit').hidden = false;
        switchTab('guests');
      }
      if (action === 'delete-guest' && await confirmAction('Delete this guest?')) {
        await api(`/guests/${id}`, { method: 'DELETE' }); toast('Guest deleted', 'success'); await loadAll();
      }

      if (action === 'edit-reservation') {
        const r = state.reservations.find((x) => String(x._id) === String(id)); if (!r) return;
        state.editing.reservation = id;
        $('reservationId').value = r._id; $('reservationGuest').value = r.guest?._id || r.guest || ''; $('reservationRoom').value = r.room?._id || r.room || '';
        $('reservationCheckIn').value = fmtDate(r.checkInDate); $('reservationCheckOut').value = fmtDate(r.checkOutDate);
        $('reservationAdults').value = r.adults ?? 1; $('reservationChildren').value = r.children ?? 0; $('reservationStatus').value = r.status || 'booked';
        $('reservationNotes').value = r.notes || '';
        $('reservationFormTitle').textContent = `Edit reservation ${r.reservationCode || ''}`; $('reservationSubmit').textContent = 'Update reservation'; $('cancelReservationEdit').hidden = false;
        state.selectedReservationForServices = r._id; renderServiceCharges();
        switchTab('reservations');
      }
      if (action === 'delete-reservation' && await confirmAction('Delete/cancel this reservation?')) {
        await api(`/reservations/${id}`, { method: 'DELETE' }); toast('Reservation removed/cancelled', 'success'); await loadAll();
      }
      if (action === 'checkin-reservation') {
        await api(`/reservations/${id}/check-in`, { method: 'PATCH' }); toast('Checked in successfully', 'success'); await loadAll();
      }
      if (action === 'checkout-reservation') {
        await api(`/reservations/${id}/check-out`, { method: 'PATCH' }); toast('Checked out successfully (invoice/task generated)', 'success'); await loadAll();
      }
      if (action === 'services-reservation') {
        state.selectedReservationForServices = id; renderServiceCharges(); switchTab('reservations');
        $('serviceChargeCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (action === 'delete-service') {
        const resId = btn.dataset.resId; const serviceId = btn.dataset.serviceId;
        await api(`/reservations/${resId}/services/${serviceId}`, { method: 'DELETE' }); toast('Service charge removed', 'success'); await loadAll(); state.selectedReservationForServices = resId; renderServiceCharges();
      }

      if (action === 'edit-payment') {
        const p = state.payments.find((x) => String(x._id) === String(id)); if (!p) return;
        $('paymentId').value = p._id; $('paymentReservation').value = p.reservation?._id || p.reservation || ''; $('paymentAmount').value = p.amount ?? 0;
        $('paymentMethod').value = p.method || 'cash'; $('paymentStatus').value = p.status || 'pending'; $('paymentNotes').value = p.notes || '';
        $('paymentFormTitle').textContent = `Edit invoice ${p.invoiceNumber || ''}`; $('paymentSubmit').textContent = 'Update payment'; $('cancelPaymentEdit').hidden = false;
        switchTab('payments');
      }
      if (action === 'void-payment' && await confirmAction('Void this invoice/payment?')) {
        await api(`/payments/${id}`, { method: 'DELETE' }); toast('Invoice voided', 'success'); await loadAll();
      }

      if (action === 'edit-task') {
        const t = state.tasks.find((x) => String(x._id) === String(id)); if (!t) return;
        $('taskId').value = t._id; $('taskRoom').value = t.room?._id || t.room || ''; $('taskType').value = t.taskType || 'cleaning';
        $('taskStatus').value = t.status || 'pending'; $('taskAssignee').value = t.assignedTo?._id || t.assignedTo || ''; $('taskNotes').value = t.notes || '';
        $('taskFormTitle').textContent = 'Edit task'; $('taskSubmit').textContent = 'Update task'; $('cancelTaskEdit').hidden = false;
        switchTab('housekeeping');
      }
      if (action === 'delete-task' && await confirmAction('Delete this housekeeping task?')) {
        await api(`/housekeeping/${id}`, { method: 'DELETE' }); toast('Task deleted', 'success'); await loadAll();
      }

      if (action === 'edit-user') {
        const u = state.users.find((x) => String(x._id) === String(id)); if (!u) return;
        $('userId').value = u._id; $('userFullName').value = u.fullName || ''; $('userEmail').value = u.email || ''; $('userPhone').value = u.phone || '';
        $('userRole').value = u.role || 'frontdesk'; $('userIsActive').value = String(u.isActive !== false); $('userPassword').value = '';
        $('userFormTitle').textContent = 'Edit staff account'; $('userSubmit').textContent = 'Update user'; $('cancelUserEdit').hidden = false; $('userPassword').required = false;
        switchTab('users');
      }
      if (action === 'delete-user' && await confirmAction('Deactivate this user account?')) {
        await api(`/users/${id}`, { method: 'DELETE' }); toast('User deactivated', 'success'); await loadAll();
      }

      if (action === 'edit-feedback') {
        const f = state.feedback.find((x) => String(x._id) === String(id)); if (!f) return;
        $('feedbackId').value = f._id; $('feedbackReservation').value = f.reservation?._id || f.reservation || ''; $('feedbackGuest').value = f.guest?._id || f.guest || '';
        $('feedbackRating').value = f.rating || 5; $('feedbackComment').value = f.comment || '';
        $('feedbackFormTitle').textContent = 'Edit feedback'; $('feedbackSubmit').textContent = 'Update feedback'; $('cancelFeedbackEdit').hidden = false;
        switchTab('feedback');
      }
      if (action === 'delete-feedback' && await confirmAction('Delete this feedback?')) {
        await api(`/feedback/${id}`, { method: 'DELETE' }); toast('Feedback deleted', 'success'); await loadAll();
      }
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function init() {
  bindEvents();
  if (state.token && state.user) {
    try {
      showApp();
      await loadAll();
      return;
    } catch (_) {
      setAuth('', null);
    }
  }
  // try to detect existing session via token? we already do 401 handling
  showLogin();
}

init();
