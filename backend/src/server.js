import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

dotenv.config();

const port = process.env.PORT || 5000;

try {
  await connectDb(process.env.MONGODB_URI);
  const app = createApp();

  app.listen(port, () => {
    console.log(`DeskFlow API listening on port ${port}`);
  });
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}
