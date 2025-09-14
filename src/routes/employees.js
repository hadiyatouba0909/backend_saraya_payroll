import { Router } from 'express';
import db from '../utils/db.js';
const { query } = db;
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    // Si l'utilisateur n'a pas de company_id, retourner une liste vide
    if (!req.user.company_id) {
      return res.json([]);
    }
    
    // Filtrer par company_id de l'utilisateur connecté
    const employees = await query(
      'SELECT e.* FROM employees e WHERE e.company_id = :company_id ORDER BY e.created_at DESC',
      { company_id: req.user.company_id }
    );
    res.json(employees);
  } catch (err) { next(err); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    // Si l'utilisateur n'a pas de company_id, retourner 404
    if (!req.user.company_id) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const rows = await query(
      'SELECT * FROM employees WHERE id = :id AND company_id = :company_id', 
      { id: req.params.id, company_id: req.user.company_id }
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { name, email, phone, position, contract, startDate, salaryCFA, salaryUSD } = req.body;
    if (!name || !position || !contract) {
      return res.status(400).json({ error: 'name, position and contract are required' });
    }

    let companyId = req.user.company_id;

    // Si l'utilisateur n'a pas de company_id, créer automatiquement une entreprise
    if (!companyId) {
      const companyResult = await query(
        'INSERT INTO companies (name, email) VALUES (:name, :email)',
        {
          name: `Entreprise de ${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email
        }
      );
      companyId = companyResult.insertId;

      // Mettre à jour l'utilisateur avec le company_id
      await query(
        'UPDATE users SET company_id = :company_id WHERE id = :user_id',
        { company_id: companyId, user_id: req.user.id }
      );

      // Mettre à jour l'objet user dans la session
      req.user.company_id = companyId;
    }

    const result = await query(
      `INSERT INTO employees (company_id, name, email, phone, position, contract, salary_cfa, salary_usd, start_date)
       VALUES (:company_id, :name, :email, :phone, :position, :contract, :salary_cfa, :salary_usd, :start_date)`,
      {
        company_id: companyId,
        name,
        email: email || null,
        phone: phone || null,
        position,
        contract,
        salary_cfa: salaryCFA || null,
        salary_usd: salaryUSD || null,
        start_date: startDate || null
      }
    );
    const created = await query('SELECT * FROM employees WHERE id = :id', { id: result.insertId });
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    // Si l'utilisateur n'a pas de company_id, retourner 404
    if (!req.user.company_id) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const { name, email, phone, position, contract, startDate, salaryCFA, salaryUSD } = req.body;
    const result = await query(
      `UPDATE employees SET name = COALESCE(:name, name), email = COALESCE(:email, email), phone = COALESCE(:phone, phone),
       position = COALESCE(:position, position), contract = COALESCE(:contract, contract), start_date = COALESCE(:start_date, start_date),
       salary_cfa = COALESCE(:salary_cfa, salary_cfa), salary_usd = COALESCE(:salary_usd, salary_usd)
       WHERE id = :id AND company_id = :company_id`,
      {
        id: req.params.id,
        company_id: req.user.company_id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        position: position || null,
        contract: contract || null,
        start_date: startDate || null,
        salary_cfa: salaryCFA || null,
        salary_usd: salaryUSD || null
      }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    const updated = await query('SELECT * FROM employees WHERE id = :id', { id: req.params.id });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    // Si l'utilisateur n'a pas de company_id, retourner 404
    if (!req.user.company_id) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const result = await query(
      'DELETE FROM employees WHERE id = :id AND company_id = :company_id', 
      { id: req.params.id, company_id: req.user.company_id }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
