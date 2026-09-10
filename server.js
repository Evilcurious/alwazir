/* Local development launcher (npm start).
   On Vercel the app is exported from api/index.js instead. */

const app = require('./app');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

async function start() {
  // Persist the seed database locally on first run (no-op once data/db.json exists).
  try {
    const db = await store.getData();
    await store.saveData(db);
  } catch (e) {
    console.warn('Could not persist seed data:', e.message);
  }
  app.listen(PORT, HOST, () => {
    console.log(`Alwazir server running at http://${HOST}:${PORT}`);
  });
}

start();
