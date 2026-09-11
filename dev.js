/* Local development launcher (npm start / npm run dev). */

const app = require('./lib/app');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Load (and seed) the data file on startup.
store.getData();

app.listen(PORT, HOST, () => {
  console.log(`Alwazir server running at http://${HOST}:${PORT}`);
});
