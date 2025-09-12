const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

function generateToken(payload) {
  const secret = process.env.JWT_SECRET || 'change_me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'change_me';
    const decoded = jwt.verify(token, secret);

    const rows = await query(
      'SELECT id, email, first_name, last_name, phone, company_id FROM users WHERE id = :id',
      { id: decoded.id }
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
    const u = rows[0];
    req.user = {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      company_id: u.company_id
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authRequired, generateToken };
