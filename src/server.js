const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const { testConnection } = require('./utils/db');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await testConnection();
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
