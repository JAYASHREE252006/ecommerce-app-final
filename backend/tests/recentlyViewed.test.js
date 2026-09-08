/**
 * Integration tests. Requires network access to download the mongodb-memory-server
 * binary the first time (not available inside this sandbox, but works in a normal
 * dev machine/CI). Run with: npm test
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const createApp = require('../app');
const Product = require('../models/Product');
const Order = require('../models/Order');

let mongod;
let app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

async function registerUser(email = 'a@test.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email, password: 'password123' });
  return res.body.data.token;
}

async function createProducts(n) {
  const docs = [];
  for (let i = 0; i < n; i++) {
    docs.push({ name: `Product ${i}`, price: 100 + i, stock: 5 });
  }
  return Product.insertMany(docs);
}

describe('Recently Viewed & Continue Shopping', () => {
  test('1. first product view is recorded', async () => {
    const token = await registerUser();
    const [p] = await createProducts(1);

    await request(app)
      .post(`/api/products/${p._id}/view`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get('/api/users/recently-viewed')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe(p._id.toString());
  });

  test('2. repeated view moves product to front, does not duplicate', async () => {
    const token = await registerUser();
    const [a, b, c] = await createProducts(3);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/products/${a._id}/view`).set(auth);
    await request(app).post(`/api/products/${b._id}/view`).set(auth);
    await request(app).post(`/api/products/${c._id}/view`).set(auth);
    await request(app).post(`/api/products/${a._id}/view`).set(auth); // view A again

    const res = await request(app).get('/api/users/recently-viewed').set(auth);
    const ids = res.body.data.items.map((i) => i.id);
    expect(ids).toEqual([a._id.toString(), c._id.toString(), b._id.toString()]);
    expect(ids).toHaveLength(3); // NOT 4 - no duplicate
  });

  test('3. viewing 21 unique products keeps only latest 20, oldest removed', async () => {
    const token = await registerUser();
    const products = await createProducts(21);
    const auth = { Authorization: `Bearer ${token}` };

    for (const p of products) {
      await request(app).post(`/api/products/${p._id}/view`).set(auth);
    }

    const res = await request(app).get('/api/users/recently-viewed').set(auth);
    expect(res.body.data.items).toHaveLength(20);
    const ids = res.body.data.items.map((i) => i.id);
    expect(ids).not.toContain(products[0]._id.toString()); // oldest removed
    expect(ids).toContain(products[20]._id.toString()); // newest present
  });

  test('4. duplicate concurrent view requests do not create duplicate rows', async () => {
    const token = await registerUser();
    const [p] = await createProducts(1);
    const auth = { Authorization: `Bearer ${token}` };

    await Promise.all([
      request(app).post(`/api/products/${p._id}/view`).set(auth),
      request(app).post(`/api/products/${p._id}/view`).set(auth),
      request(app).post(`/api/products/${p._id}/view`).set(auth),
    ]);

    const res = await request(app).get('/api/users/recently-viewed').set(auth);
    expect(res.body.data.items).toHaveLength(1);
  });

  test('5. guest view does not require auth and is not persisted server-side', async () => {
    const [p] = await createProducts(1);
    const res = await request(app).post(`/api/products/${p._id}/view`).expect(200);
    expect(res.body.data.tracked).toBe('local');
  });

  test('6-7. guest -> login merge: dedupes and newest timestamp wins', async () => {
    const token = await registerUser();
    const [a, b] = await createProducts(2);
    const auth = { Authorization: `Bearer ${token}` };

    // Server already has B viewed a while ago
    await request(app).post(`/api/products/${b._id}/view`).set(auth);

    const oldServerViewedAt = (
      await request(app).get('/api/users/recently-viewed').set(auth)
    ).body.data.items[0].viewedAt;

    // Guest local history has A (newer) and B (newer than server's B)
    const now = new Date();
    const localItems = [
      { productId: a._id.toString(), viewedAt: new Date(now.getTime() + 10000).toISOString() },
      { productId: b._id.toString(), viewedAt: new Date(now.getTime() + 20000).toISOString() },
    ];

    const syncRes = await request(app)
      .post('/api/users/recently-viewed/sync')
      .set(auth)
      .send({ items: localItems })
      .expect(200);

    const ids = syncRes.body.data.items.map((i) => i.id);
    expect(ids).toHaveLength(2); // no duplicate of B
    expect(new Date(syncRes.body.data.items.find((i) => i.id === b._id.toString()).viewedAt).getTime())
      .toBeGreaterThan(new Date(oldServerViewedAt).getTime());

    // Sync again with the same payload (simulating a retried/duplicate call) - idempotent
    const syncRes2 = await request(app)
      .post('/api/users/recently-viewed/sync')
      .set(auth)
      .send({ items: localItems })
      .expect(200);
    expect(syncRes2.body.data.items).toHaveLength(2);
  });

  test('8. multi-device: server is canonical, later device view wins ordering', async () => {
    const token = await registerUser();
    const [a, b, c, d, e] = await createProducts(5);
    const auth = { Authorization: `Bearer ${token}` };

    // "Device A"
    await request(app).post(`/api/products/${a._id}/view`).set(auth);
    await request(app).post(`/api/products/${b._id}/view`).set(auth);
    await request(app).post(`/api/products/${c._id}/view`).set(auth);

    // "Device B"
    await request(app).post(`/api/products/${d._id}/view`).set(auth);
    await request(app).post(`/api/products/${e._id}/view`).set(auth);

    const res = await request(app).get('/api/users/recently-viewed').set(auth);
    const ids = res.body.data.items.map((i) => i.id);
    expect(ids).toEqual([
      e._id.toString(),
      d._id.toString(),
      c._id.toString(),
      b._id.toString(),
      a._id.toString(),
    ]);
  });

  test('9-10. continue shopping excludes purchased products', async () => {
    const token = await registerUser();
    const [a, b, c] = await createProducts(3);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/products/${a._id}/view`).set(auth);
    await request(app).post(`/api/products/${b._id}/view`).set(auth);
    await request(app).post(`/api/products/${c._id}/view`).set(auth);

    // Purchase B via a real order in 'confirmed' status
    await Order.create({
      user: (await request(app).get('/api/auth/me').set(auth)).body.data.user.id,
      items: [{ product: b._id, quantity: 1, priceAtPurchase: b.price }],
      totalAmount: b.price,
      status: 'confirmed',
    });

    const res = await request(app).get('/api/users/continue-shopping').set(auth).expect(200);
    const ids = res.body.data.items.map((i) => i.id);
    expect(ids).toEqual([c._id.toString(), a._id.toString()]);
    expect(ids).not.toContain(b._id.toString());
  });

  test('11. add to cart via existing cart system', async () => {
    const token = await registerUser();
    const [p] = await createProducts(1);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post('/api/cart')
      .set(auth)
      .send({ productId: p._id, quantity: 1 })
      .expect(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  test('12. wishlist add via existing wishlist system', async () => {
    const token = await registerUser();
    const [p] = await createProducts(1);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post('/api/wishlist')
      .set(auth)
      .send({ productId: p._id })
      .expect(200);
    expect(res.body.data.products.map(String)).toContain(p._id.toString());
  });

  test('13. unauthorized access to recently-viewed is rejected', async () => {
    await request(app).get('/api/users/recently-viewed').expect(401);
  });

  test('13b. a user cannot see another user\'s recently viewed history', async () => {
    const tokenA = await registerUser('userA@test.com');
    const tokenB = await registerUser('userB@test.com');
    const [p] = await createProducts(1);

    await request(app)
      .post(`/api/products/${p._id}/view`)
      .set('Authorization', `Bearer ${tokenA}`);

    const resB = await request(app)
      .get('/api/users/recently-viewed')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(resB.body.data.items).toHaveLength(0);
  });

  test('14. invalid product id is rejected', async () => {
    const token = await registerUser();
    await request(app)
      .post('/api/products/not-a-valid-id/view')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  test('14b. viewing a non-existent product returns 404', async () => {
    const token = await registerUser();
    const fakeId = new mongoose.Types.ObjectId();
    await request(app)
      .post(`/api/products/${fakeId}/view`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
