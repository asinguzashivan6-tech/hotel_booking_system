'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createApp } = require('./app');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marriott_hms';
const PORT = Number(process.env.PORT) || 5000;
const app = createApp();

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', mongoose.connection.name);

    const server = app.listen(PORT, () => {
      console.log(`Marriott Hotel Management System running at http://localhost:${PORT}`);
      console.log(`API base URL: http://localhost:${PORT}/api`);
      console.log('Default seeded users (after npm run seed): admin@marriott.test / Admin@123');
    });

    const shutdown = (signal) => {
      console.log(`\n${signal} received. Closing server...`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error('Check that MongoDB is running or update MONGO_URI in .env');
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start();
