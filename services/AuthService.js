'use strict';

const bcrypt = require('bcryptjs');
const { badRequest, conflict, notFound, unauthorized } = require('../utils/AppError');
const { validateLoginInput, validateUserInput, validateId } = require('../utils/validation');
const { signToken } = require('../middleware/auth');

class AuthService {
  constructor({ users }) {
    this.users = users;
  }

  async login(payload) {
    const { email, password } = validateLoginInput(payload);
    const user = await this.users.model.findOne({ email }).lean();
    if (!user) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    if (user.isActive === false) throw unauthorized('Account is deactivated', 'ACCOUNT_INACTIVE');
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    return { token: signToken(user), user: safeUser };
  }

  async listUsers(query = {}) {
    const users = await this.users.list({ search: query.search, role: query.role, sort: { createdAt: -1 } });
    return users.map((u) => {
      const copy = { ...u };
      delete copy.passwordHash;
      return copy;
    });
  }

  async getUser(id) {
    const user = await this.users.findById(id);
    if (!user) throw notFound('User not found', 'USER_NOT_FOUND');
    delete user.passwordHash;
    return user;
  }

  async createUser(payload) {
    const data = validateUserInput(payload, { partial: false });
    if (!data.password) throw badRequest('Password is required', 'PASSWORD_REQUIRED');
    const existing = await this.users.model.findOne({ email: data.email }).lean();
    if (existing) throw conflict('Email must be unique', 'DUPLICATE_EMAIL');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const created = await this.users.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || '',
      isActive: data.isActive !== false
    });
    delete created.passwordHash;
    return created;
  }

  async updateUser(id, payload) {
    validateId(id, 'id');
    const existing = await this.users.findById(id);
    if (!existing) throw notFound('User not found', 'USER_NOT_FOUND');
    const data = validateUserInput(payload, { partial: true });
    const update = { ...data };
    if (data.password) {
      update.passwordHash = await bcrypt.hash(data.password, 10);
      delete update.password;
    } else {
      delete update.password;
    }
    if (data.email && data.email !== existing.email) {
      const dup = await this.users.model.findOne({ email: data.email, _id: { $ne: id } }).lean();
      if (dup) throw conflict('Email must be unique', 'DUPLICATE_EMAIL');
    }
    const updated = await this.users.update(id, update);
    if (updated) delete updated.passwordHash;
    return updated;
  }

  async removeUser(id) {
    validateId(id, 'id');
    const existing = await this.users.findById(id);
    if (!existing) throw notFound('User not found', 'USER_NOT_FOUND');
    // Soft delete / deactivate to preserve history
    const updated = await this.users.update(id, { isActive: false });
    if (updated) delete updated.passwordHash;
    return updated;
  }
}

module.exports = AuthService;
