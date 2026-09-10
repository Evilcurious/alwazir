/* Local development launcher (npm start / npm run dev).
   On Vercel, index.js is auto-detected as the Express entrypoint instead. */

const app = require('./index');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Persist the seed database locally on first run (no-op once data/db.json exists).
if (store.storageMode() === 'local') {
  store
    .getData()
    .then((db) => store.saveData(db))
    .catch((e) => console.warn('Could not persist seed data:', e.message));
}

app.listen(PORT, HOST, () => {
  console.log(`Alwazir server running at http://${HOST}:${PORT}`);
});
