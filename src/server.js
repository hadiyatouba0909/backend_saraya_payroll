require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./utils/db');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');
const currencyRoutes = require('./routes/currency');
const companyRoutes = require('./routes/companies');

const app = express();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'payroll-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/companies', companyRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Gestion erreur
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Démarrage serveur
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test de connexion DB
    await testConnection();
    console.log('Database connection successful');
    
    // Démarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;