import { Router } from 'express';
import bcryptPkg from 'bcryptjs';
const { hash, compare } = bcryptPkg;
import db from '../utils/db.js';
const { query } = db;
import _default from '../middleware/auth.js';
const { generateToken, authRequired } = _default;

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, companyName, companyAddress } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'firstName, lastName, email and password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    let companyId = null;
    if (companyName) {
      const result = await query(
        'INSERT INTO companies (name, address) VALUES (?, ?)',
        [companyName, companyAddress || '']
      );
      companyId = result.insertId;
    }

    const passwordHash = await hash(password, 10);
    const result = await query(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone || null, passwordHash, companyId]
    );

    const userId = result.insertId;
    const token = generateToken({ id: userId, email });

    res.status(201).json({
      token,
      user: { id: userId, firstName, lastName, email, phone, companyId }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const ok = await compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        companyId: user.company_id
      }
    });
  } catch (err) { 
    next(err); 
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const users = await query('SELECT id, first_name, last_name, email, phone, company_id FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = users[0];
    res.json({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      companyId: u.company_id
    });
  } catch (err) { 
    next(err); 
  }
});

// Route pour récupérer le profil utilisateur
router.get('/profile', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const users = await query(
      'SELECT id, first_name, last_name, email, phone, company_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      companyId: user.company_id
    });
  } catch (err) {
    next(err);
  }
});

// Route pour mettre à jour le profil utilisateur
router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phone } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName and email are required' });
    }
    
    // Vérifier si l'email n'est pas déjà utilisé par un autre utilisateur
    const existing = await query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already used by another user' });
    }
    
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
      [firstName, lastName, email, phone || null, userId]
    );
    
    res.json({
      message: 'Profile updated successfully',
      user: { id: userId, firstName, lastName, email, phone }
    });
  } catch (err) {
    next(err);
  }
});

// Route pour changer le mot de passe
router.put('/password', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    
    // Récupérer le mot de passe actuel
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Vérifier le mot de passe actuel
    const isValidPassword = await compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hasher le nouveau mot de passe
    const newPasswordHash = await hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;