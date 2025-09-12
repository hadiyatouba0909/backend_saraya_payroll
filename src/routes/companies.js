const express = require('express');
const { query } = require('../utils/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Récupérer les informations de l'entreprise de l'utilisateur connecté
router.get('/', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Récupérer l'ID de l'entreprise de l'utilisateur
    const users = await query(
      'SELECT company_id FROM users WHERE id = :userId',
      { userId }
    );
    
    if (users.length === 0 || !users[0].company_id) {
      return res.json([]);
    }
    
    const companyId = users[0].company_id;
    const companies = await query(
      'SELECT id, name, address, email, phone, created_at, updated_at FROM companies WHERE id = :companyId',
      { companyId }
    );
    
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

// Récupérer une entreprise spécifique
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.id;
    
    // Vérifier que l'utilisateur appartient à cette entreprise
    const users = await query(
      'SELECT company_id FROM users WHERE id = :userId',
      { userId }
    );
    
    if (users.length === 0 || users[0].company_id != companyId) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }
    
    const companies = await query(
      'SELECT id, name, address, email, phone, created_at, updated_at FROM companies WHERE id = :companyId',
      { companyId }
    );
    
    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(companies[0]);
  } catch (err) {
    next(err);
  }
});

// Mettre à jour les informations de l'entreprise
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.id;
    const { name, address, email, phone } = req.body;
    
    // Vérifier que l'utilisateur appartient à cette entreprise
    const users = await query(
      'SELECT company_id FROM users WHERE id = :userId',
      { userId }
    );
    
    if (users.length === 0 || users[0].company_id != companyId) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    await query(
      'UPDATE companies SET name = :name, address = :address, email = :email, phone = :phone WHERE id = :companyId',
      {
        name,
        address: address || null,
        email: email || null,
        phone: phone || null,
        companyId
      }
    );
    
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    next(err);
  }
});

// Créer une nouvelle entreprise (si l'utilisateur n'en a pas)
router.post('/', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, address, email, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Vérifier que l'utilisateur n'a pas déjà une entreprise
    const users = await query(
      'SELECT company_id FROM users WHERE id = :userId',
      { userId }
    );
    
    if (users.length > 0 && users[0].company_id) {
      return res.status(400).json({ error: 'User already has a company' });
    }
    
    // Créer la nouvelle entreprise
    const result = await query(
      'INSERT INTO companies (name, address, email, phone) VALUES (:name, :address, :email, :phone)',
      {
        name,
        address: address || null,
        email: email || null,
        phone: phone || null
      }
    );
    
    const companyId = result.insertId;
    
    // Associer l'utilisateur à cette entreprise
    await query(
      'UPDATE users SET company_id = :companyId WHERE id = :userId',
      { companyId, userId }
    );
    
    res.status(201).json({
      message: 'Company created successfully',
      company: { id: companyId, name, address, email, phone }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

