require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = require('../app');

const MONGO_URI = process.env.MONGO_URI;
let connectionPromise = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!MONGO_URI) throw new Error('MONGO_URI is not set.');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGO_URI).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
}

const handler = express();

handler.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

handler.use(app);

handler.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Database connection failed.' });
});

module.exports = handler;
