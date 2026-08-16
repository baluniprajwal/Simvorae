import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { seedProducts } from '../data/seedProducts.js';
import { Product } from '../models/Product.js';

dotenv.config();

async function seedDatabase() {
  try {
    await connectDB();
    await Product.deleteMany({});
    await Product.insertMany(seedProducts);
    console.log(`Seeded ${seedProducts.length} products.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed products:', error.message);
    process.exit(1);
  }
}

seedDatabase();
