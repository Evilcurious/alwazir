/* Vercel serverless entry point.
   The Express app is exported as-is; Vercel's Node runtime wraps it. */

const app = require('../app');

module.exports = app;
