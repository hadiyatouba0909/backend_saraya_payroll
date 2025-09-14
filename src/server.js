import { createServer } from 'http';
import app from './app.js';
import db from './utils/db.js';
const PORT = process.env.PORT || 5000;

// La configuration dotenv est gérée dans app.js
(async () => {
    try {
        await db.testConnection();
        const server = createServer(app);
        server.listen(PORT, () => {
            console.log(`API running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();