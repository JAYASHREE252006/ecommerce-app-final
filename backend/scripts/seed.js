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
  {
    name: 'Classic Cotton T-Shirt',
    category: 'Fashion',
    brand: 'Urbanite',
    price: 599,
    originalPrice: 799,
    stock: 0, // ignored - this product uses variants instead
    rating: 4.3,
    ratingCount: 210,
    images: ['https://picsum.photos/seed/tshirt/400'],
    variants: [
      { size: 'S', color: 'Black', stock: 20, sku: 'TSHIRT-S-BLK' },
      { size: 'M', color: 'Black', stock: 15, sku: 'TSHIRT-M-BLK' },
      { size: 'L', color: 'Black', stock: 0, sku: 'TSHIRT-L-BLK' },
      { size: 'S', color: 'White', stock: 10, sku: 'TSHIRT-S-WHT' },
      { size: 'M', color: 'White', stock: 12, sku: 'TSHIRT-M-WHT', priceModifier: 50 },
    ],
  },
  {
    name: 'Canvas Sneakers',
    category: 'Footwear',
    brand: 'Stride',
    price: 1499,
    originalPrice: 1899,
    stock: 0,
    rating: 4.1,
    ratingCount: 95,
    images: ['https://picsum.photos/seed/sneakers/400'],
    variants: [
      { size: '7', color: 'Grey', stock: 8, sku: 'SNKR-7-GRY' },
      { size: '8', color: 'Grey', stock: 5, sku: 'SNKR-8-GRY' },
      { size: '9', color: 'Grey', stock: 0, sku: 'SNKR-9-GRY' },
      { size: '8', color: 'Navy', stock: 6, sku: 'SNKR-8-NVY' },
    ],
  },
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
