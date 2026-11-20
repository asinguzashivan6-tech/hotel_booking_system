'use strict';

const mongoose = require('mongoose');
const { createApp } = require('../app');

// Cache the Express app and MongoDB connection across serverless invocations.
let cached = global.__hotelBookingCached;
if (!cached) {
  cached = global.__hotelBookingCached = { app: null, conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // Sensible defaults for serverless environments
        bufferCommands: false
      })
      .then((mongooseInstance) => {
        cached.conn = mongooseInstance.connection;
        return cached.conn;
      })
      .catch((error) => {
        cached.promise = null; // allow retry on next request
        throw error;
      });
  }

  return cached.promise;
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();

    if (!cached.app) {
      cached.app = createApp();
    }

    return cached.app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message:
        error.message ||
        'Internal server error. Check server logs and MONGO_URI configuration.',
      code: error.code || 'SERVERLESS_ERROR'
    });
  }
};
