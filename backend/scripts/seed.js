require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const sampleProducts = [
  { name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', brand: 'Soundwave', price: 4999, originalPrice: 6999, stock: 25, rating: 4.5, ratingCount: 210, images: ['https://picsum.photos/seed/headphones/400'] },
  { name: 'Mechanical Keyboard, RGB', category: 'Electronics', brand: 'KeyForge', price: 3499, originalPrice: 3999, stock: 15, rating: 4.2, ratingCount: 88, images: ['https://picsum.photos/seed/keyboard/400'] },
  { name: 'Running Shoes, Lightweight', category: 'Footwear', brand: 'Stride', price: 2299, originalPrice: 2999, stock: 40, rating: 4.0, ratingCount: 156, images: ['https://picsum.photos/seed/shoes/400'] },
  { name: 'Stainless Steel Water Bottle 1L', category: 'Home', brand: 'HydroFlow', price: 799, originalPrice: 999, stock: 100, rating: 4.7, ratingCount: 320, images: ['https://picsum.photos/seed/bottle/400'] },
  { name: '4K Ultra HD Smart TV 55"', category: 'Electronics', brand: 'Visio', price: 34999, originalPrice: 42999, stock: 8, rating: 4.3, ratingCount: 64, images: ['https://picsum.photos/seed/tv/400'] },
  { name: 'Ceramic Non-Stick Cookware Set', category: 'Home', brand: 'ChefLine', price: 2999, originalPrice: 3999, stock: 20, rating: 4.1, ratingCount: 45, images: ['https://picsum.photos/seed/cookware/400'] },
  { name: 'Yoga Mat, Extra Thick', category: 'Fitness', brand: 'FlexFit', price: 899, originalPrice: 1199, stock: 60, rating: 4.6, ratingCount: 198, images: ['https://picsum.photos/seed/yoga/400'] },
  { name: 'Leather Backpack', category: 'Fashion', brand: 'Urbanite', price: 1999, originalPrice: 2699, stock: 30, rating: 4.4, ratingCount: 77, images: ['https://picsum.photos/seed/backpack/400'] },
  { name: 'Bluetooth Portable Speaker', category: 'Electronics', brand: 'Soundwave', price: 1599, originalPrice: 1999, stock: 0, rating: 3.9, ratingCount: 52, images: ['https://picsum.photos/seed/speaker/400'] },
  { name: 'Espresso Machine, Compact', category: 'Home', brand: 'BrewMaster', price: 8999, originalPrice: 10999, stock: 12, rating: 4.5, ratingCount: 33, images: ['https://picsum.photos/seed/espresso/400'] },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
  console.log('[seed] Connected. Clearing existing products...');
  await Product.deleteMany({});
  await Product.insertMany(sampleProducts);
  console.log(`[seed] Inserted ${sampleProducts.length} products.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
