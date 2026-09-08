# Marketplace — Recently Viewed, Product Activity & Continue Shopping

A full-stack e-commerce app (Node/Express/MongoDB backend, React+Vite web app,
Expo/React Native mobile app) built from scratch, with a production-style
**Recently Viewed Products** and **Continue Shopping** system as the
centerpiece feature — working for guests and logged-in users, synced across
devices in real time.

---

## A. Architecture

```
Web (React/Vite)  ──┐
                     ├──► Express API (Node) ──► MongoDB
Expo (Android/iOS) ──┘            │
                                   └──► Socket.IO (per-user rooms)
```

```
Guest flow:
  Guest views product → saved to localStorage / AsyncStorage
  Guest logs in        → local history POSTed to /users/recently-viewed/sync
  Backend merges local + server history (newest timestamp wins, deduped)
  Backend returns canonical list → frontend clears local storage, uses server from now on
```

```
Real-time flow:
  Product view (web or Expo) → POST /products/:id/view → MongoDB upsert
  → server emits "recentlyViewedUpdated" to Socket.IO room "user:<id>"
  → every other open session (other tab, other device, Expo app) updates live
```

---

## B. Files created

### Backend (`/backend`)
| File | Purpose |
|---|---|
| `server.js` | Entry point: connects Mongo, starts HTTP + Socket.IO |
| `app.js` | Express app assembly, route mounting, CORS |
| `config/db.js` | Mongoose connection |
| `models/User.js` | Auth user, bcrypt password hashing |
| `models/Product.js` | Product catalog |
| `models/Cart.js`, `models/Wishlist.js` | Existing-system stand-ins, reused by the feature |
| `models/Order.js` | Order lifecycle, defines `PURCHASED_STATUSES` |
| `models/ProductActivity.js` | **Core model** for recently-viewed tracking (see §C) |
| `middleware/auth.js` | `requireAuth` / `optionalAuth`, identity always from JWT |
| `middleware/errorHandler.js` | Central error formatting |
| `controllers/recentlyViewedController.js` | **Core logic**: record view, get list, sync/merge, continue-shopping |
| `controllers/{auth,product,cart,wishlist,order}Controller.js` | Supporting systems |
| `routes/*.js` | Route wiring per resource |
| `sockets/index.js` | Authenticated Socket.IO, per-user rooms |
| `scripts/seed.js` | Sample product data |
| `tests/recentlyViewed.test.js` | Integration test suite (see §G) |

### Web (`/web`, React + Vite + Tailwind)
| File | Purpose |
|---|---|
| `src/storage/recentlyViewedStorage.js` | Guest history via `localStorage` |
| `src/services/api.js` | Axios instance, attaches JWT |
| `src/services/{authService,recentlyViewedService,socketService,authSyncService}.js` | API/service layer |
| `src/context/AuthContext.jsx` | Auth state, login/logout transitions, guest→login merge trigger |
| `src/hooks/{useRecentlyViewed,useContinueShopping,useProductView}.js` | Feature hooks (React Query-backed) |
| `src/components/ProductCard/ProductCard.jsx` | Shared card (cart/wishlist actions) |
| `src/components/RecentlyViewed/RecentlyViewed.jsx`, `.../ContinueShopping/ContinueShopping.jsx` | Sections, self-hiding when empty |
| `src/pages/{Home,ProductDetails,Login,Register}.jsx` | Pages |
| `src/App.jsx`, `src/main.jsx` | Router + QueryClient + AuthProvider wiring |

### Mobile (`/mobile`, Expo + React Navigation)
Mirrors the web structure 1:1 with identical function names in the shared
storage/service layer, swapping `localStorage` → `AsyncStorage`:
`src/storage/recentlyViewedStorage.js`, `src/storage/pendingViewsQueue.js` (offline queue),
`src/services/*.js`, `src/context/AuthContext.jsx`, `src/hooks/*.js`,
`src/components/*`, `src/screens/*`, `App.js`.

---

## C. Database design

**`ProductActivity`** — one document per `(user, product, activityType)`:

```js
{ user, product, activityType: 'viewed', viewedAt, createdAt, updatedAt }
```

Why not a single array field on `User`? Upserting one small doc per view
avoids reading/rewriting a whole array on every page view, and lets MongoDB
do the "keep latest 20" trim as a targeted query instead of in-memory array
surgery.

**Indexes:**
- `{ user: 1, product: 1, activityType: 1 }` **unique** — guarantees one
  active record per user+product. Every repeat view becomes an atomic
  `findOneAndUpdate` upsert on this index instead of a new row: this is what
  gives duplicate-prevention *and* race-condition safety for free.
- `{ user: 1, activityType: 1, viewedAt: -1 }` — covers "give me this user's
  most recent views, newest first" and the trim-to-20 query with no
  in-memory sort.

**`Order`** — `PURCHASED_STATUSES = ['pending','confirmed','shipped','delivered']`
(excludes `cancelled`/`refunded`). Continue Shopping uses a single
aggregation (`$match` → `$unwind` → `$match` → `$group`) to find which viewed
products the user has purchased, rather than loading every order into memory.

**Merge/sync** uses MongoDB's atomic `$max` update operator on `viewedAt` via
`bulkWrite` — "newest timestamp wins" is enforced by the database itself, so
concurrent or retried sync calls are automatically idempotent.

---

## D. APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | none | Create account |
| POST | `/api/auth/login` | none | Get JWT |
| GET | `/api/auth/me` | required | Current user |
| GET | `/api/products` | none | List/search products |
| GET | `/api/products/:productId` | none | Product detail |
| POST | `/api/products/:productId/view` | optional | Record a view (guest = local-only ack, user = persisted + broadcast) |
| GET | `/api/users/recently-viewed` | required | Canonical, enriched, newest-first list (max 20) |
| POST | `/api/users/recently-viewed/sync` | required | Merge guest history into account on login |
| GET | `/api/users/continue-shopping` | required | Viewed-but-not-purchased (max 10) |
| GET/POST/DELETE | `/api/cart`, `/api/cart/:productId` | required | Cart |
| GET/POST/DELETE | `/api/wishlist`, `/api/wishlist/:productId` | required | Wishlist |
| POST/GET/PATCH | `/api/orders` | required | Checkout, list, status transitions |

All responses: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`.

**Socket.IO events** (room `user:<id>`, connection requires a valid JWT in
the handshake): `recentlyViewedUpdated { userId, items }`.

---

## E. Frontend (web)

- **Recently Viewed / Continue Shopping**: horizontal-scroll sections on the
  home page, built from a shared `ProductCard`. Hidden entirely when empty.
- **View tracking**: `useProductView(productId)` fires once per mount
  (guarded against StrictMode's double-invoke and re-renders), after the
  product page has already rendered — tracking never blocks the page and
  failures are swallowed silently.
- **Guest storage**: `recentlyViewedStorage` wraps `localStorage`, capped at
  20, newest-first, deduped on every write.
- **Login merge**: `AuthContext` calls `authSyncService.syncGuestHistoryToServer()`
  right after login/register, which POSTs local items to `/sync`, then clears
  local storage so it's never merged twice.
- **Real-time**: `socketService` connects on login/app-load and disconnects
  on logout; hooks subscribe to `recentlyViewedUpdated` and patch the React
  Query cache directly, plus a `window.focus` listener re-validates against
  the server as a fallback.

## F. Mobile (Expo)

- **AsyncStorage** implementation of the identical `recentlyViewedStorage`
  interface used on web (`saveRecentlyViewed`, `getRecentlyViewed`,
  `removeRecentlyViewed`, `clearRecentlyViewed`) — hooks don't know which
  platform they're on.
- **Offline handling**: `pendingViewsQueue` stores views made while offline
  (checked via `@react-native-community/netinfo`); `useOfflineViewSync()`
  (mounted once at the app root) drains the queue through `/sync` as soon as
  connectivity returns, re-queueing anything that still fails.
- **Real-time**: same Socket.IO client pattern as web; `AppState` listener
  refetches on foreground as a fallback if a push was missed while backgrounded.
- **Android API config**: see `mobile/.env.example` — **never use
  `localhost`** for Android; the emulator needs `10.0.2.2`, physical devices
  need your machine's LAN IP.

## G. Testing

`backend/tests/recentlyViewed.test.js` (Jest + Supertest + `mongodb-memory-server`)
covers: first view, repeat view (no duplicate), 21st view evicts oldest,
concurrent duplicate requests, guest view (no auth, not persisted), guest→login
merge with newest-wins + idempotent re-sync, multi-device ordering, Continue
Shopping excluding a purchased product, cart/wishlist integration, unauthorized
access (401), cross-user isolation, invalid/non-existent product ID (400/404).

> This sandbox's network policy blocks the one-time `mongodb-memory-server`
> binary download, so I verified every backend file with `node --check` (zero
> syntax errors) and a full `require()` smoke test of the Express app (routes
> mount cleanly), but could not execute the Mongo-backed integration tests
> here. Run `npm test` in `/backend` on a machine with normal internet access
> (or a local `mongod`) to execute them — they're written and ready to go.
>
> The **web app** was verified with an actual production `npm run build`
> (Vite) — 172 modules compiled with zero errors.
>
> The **mobile app**'s 19 JS/JSX files were verified with a full Babel/JSX
> parse (zero syntax errors) and `expo-doctor` (19/21 checks passed; the 2
> failures were network calls to Expo's remote schema service, unrelated to
> the code). Running Metro/an emulator itself isn't possible in this sandbox.

## H. Running instructions

### 1. MongoDB
```bash
# any local or Atlas MongoDB works
mongod --dbpath /some/data/dir
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # edit JWT_SECRET, MONGO_URI, CORS_ORIGINS as needed
npm install
npm run seed               # populates sample products
npm run dev                # http://localhost:5000
npm test                   # run the integration suite (needs internet or local mongod)
```

### 3. Web
```bash
cd web
cp .env.example .env       # VITE_API_URL, VITE_SOCKET_URL
npm install
npm run dev                # http://localhost:5173
```

### 4. Expo (Android)
```bash
cd mobile
cp .env.example .env       # set EXPO_PUBLIC_API_URL per the Android localhost note inside
npm install
npm run android             # or `npx expo start` and scan with Expo Go
```

### Required environment variables (summary)
| Var | Where | Notes |
|---|---|---|
| `MONGO_URI` | backend | Connection string |
| `JWT_SECRET` | backend | Long random string |
| `CORS_ORIGINS` | backend | Comma-separated list of allowed frontend origins |
| `RECENTLY_VIEWED_MAX` / `CONTINUE_SHOPPING_MAX` | backend | Defaults: 20 / 10 |
| `VITE_API_URL` / `VITE_SOCKET_URL` | web | Backend URL |
| `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` | mobile | **Not** `localhost` for Android — see `mobile/.env.example` |
