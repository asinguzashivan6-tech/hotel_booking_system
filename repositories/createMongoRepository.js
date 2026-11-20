'use strict';

const mongoose = require('mongoose');
const { badRequest } = require('../utils/AppError');
const { escapeRegex } = require('../utils/validation');

function createMongoRepository(Model, options = {}) {
  const {
    searchFields = [],
    idValidator = mongoose.isValidObjectId,
    defaultPopulate = [],
    defaultSort = { createdAt: -1 },
    defaultFilter = {}
  } = options;

  function validateId(id) {
    const value = String(id ?? '');
    if (!idValidator(value)) {
      throw badRequest(`Invalid ${Model.modelName} ID format`, 'INVALID_ID');
    }
    return value;
  }

  function toPlain(doc) {
    return doc && typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  }

  function buildFilter(query = {}) {
    const filter = { ...defaultFilter };
    const and = [];

    if (query.search && searchFields.length > 0) {
      const pattern = escapeRegex(String(query.search));
      and.push({ $or: searchFields.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })) });
    }
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    if (query.type) filter.type = query.type;
    if (query.roomType) filter.roomType = query.roomType;
    if (query.guest) filter.guest = validateId(query.guest);
    if (query.room) filter.room = validateId(query.room);
    if (query.reservation) filter.reservation = validateId(query.reservation);
    if (query.assignedTo) filter.assignedTo = validateId(query.assignedTo);
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;

    if (and.length > 0) filter.$and = and;
    return filter;
  }

  async function list(query = {}) {
    let cursor = Model.find(buildFilter(query));
    const populate = query.populate ?? defaultPopulate;
    if (populate && populate.length > 0) cursor = cursor.populate(populate);
    cursor = cursor.sort(query.sort ?? defaultSort);
    if (query.limit) cursor = cursor.limit(Number(query.limit));
    const docs = await cursor;
    return docs.map(toPlain);
  }

  async function findById(id, populate = defaultPopulate) {
    let cursor = Model.findById(validateId(id));
    if (populate && populate.length > 0) cursor = cursor.populate(populate);
    const doc = await cursor;
    return doc ? toPlain(doc) : null;
  }

  async function findOne(filter = {}, populate = defaultPopulate) {
    let cursor = Model.findOne(filter);
    if (populate && populate.length > 0) cursor = cursor.populate(populate);
    const doc = await cursor;
    return doc ? toPlain(doc) : null;
  }

  async function create(data, populate = defaultPopulate) {
    const doc = await Model.create(data);
    return findById(doc._id, populate);
  }

  async function update(id, data, populate = defaultPopulate) {
    let cursor = Model.findByIdAndUpdate(validateId(id), data, { new: true, runValidators: true });
    if (populate && populate.length > 0) cursor = cursor.populate(populate);
    const doc = await cursor;
    return doc ? toPlain(doc) : null;
  }

  async function remove(id) {
    const doc = await Model.findByIdAndDelete(validateId(id));
    return doc ? toPlain(doc) : null;
  }

  async function count(filter = {}) {
    return Model.countDocuments(filter);
  }

  return { model: Model, validateId, toPlain, buildFilter, list, findById, findOne, create, update, remove, count };
}

module.exports = { createMongoRepository };
