import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { isValidEmail } from '../utils/validators.js';

async function createAdmin() {
  const name = process.env.ADMIN_NAME?.trim() || 'Simvorae Admin';
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!isValidEmail(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email.');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  await connectDB();

  const passwordHash = await hashPassword(password);
  const admin = await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      role: 'admin',
      source: 'admin',
      isPortalEnabled: true,
      emailVerifiedAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log(`Admin ready: ${admin.email}`);
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
