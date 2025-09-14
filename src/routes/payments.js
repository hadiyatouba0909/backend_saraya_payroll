import { Router } from 'express';
import db from '../utils/db.js';
const { query } = db;
import _default from '../middleware/auth.js';
const { authRequired } = _default;

const router = Router();

// Dans votre fichier de routes (ex: routes/payments.js)

router.get('/', authRequired, async (req, res, next) => {
  try {
    // Récupération du terme de recherche depuis la requête
    const { search } = req.query;

    let whereClause = 'WHERE e.company_id = :company_id';
    const params = { company_id: req.user.company_id };

    // Si un terme de recherche est fourni, on construit la clause WHERE
    if (search) {
      whereClause += `
        AND (
          e.name LIKE :search_term OR
          e.email LIKE :search_term OR
          e.phone LIKE :search_term OR
          p.reference LIKE :search_term
        )
      `;
      // On ajoute les wildcards '%' pour une recherche partielle
      params.search_term = `%${search}%`;
    }

    const sql = `
      SELECT 
        p.*, 
        e.name as employee_name, 
        e.position as employee_position,
        e.email as employee_email,  -- Assurez-vous que ces colonnes existent
        e.phone as employee_phone   -- dans votre table 'employees'
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      ${whereClause}
      ORDER BY p.date DESC, p.created_at DESC
    `;

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.post('/', authRequired, async (req, res, next) => {
  try {
    const { employeeId, amountCFA, amountUSD, date, status } = req.body;
    if (!employeeId || !amountCFA || !amountUSD || !date) {
      return res.status(400).json({ error: 'employeeId, amountCFA, amountUSD and date are required' });
    }

    // Vérifier que l'employé appartient à la même entreprise
    const employeeCheck = await query(
      'SELECT id FROM employees WHERE id = :employee_id AND company_id = :company_id',
      { employee_id: employeeId, company_id: req.user.company_id }
    );
    if (employeeCheck.length === 0) {
      return res.status(404).json({ error: 'Employee not found or not accessible' });
    }

    // Generate reference like PAY-YYYY-XXX with global uniqueness and retry on race condition
    const year = new Date(date).getFullYear();

    let reference;
    let attempts = 0;
    while (attempts < 3) {
      const [{ maxRef }] = await query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)), 0) AS maxRef FROM payments WHERE reference LIKE :prefix",
        { prefix: `PAY-${year}-%` }
      );
      const next = Number(maxRef) + 1;
      const refNumber = String(next).padStart(3, '0');
      reference = `PAY-${year}-${refNumber}`;

      try {
        const result = await query(
          `INSERT INTO payments (employee_id, amount_cfa, amount_usd, date, status, reference)
           VALUES (:employee_id, :amount_cfa, :amount_usd, :date, :status, :reference)`,
          {
            employee_id: employeeId,
            amount_cfa: amountCFA,
            amount_usd: amountUSD,
            date,
            status: status || 'paid', // default to 'paid'
            reference
          }
        );
        const created = await query('SELECT * FROM payments WHERE id = :id', { id: result.insertId });
        return res.status(201).json(created[0]);
      } catch (e) {
        if (e && e.code === 'ER_DUP_ENTRY') {
          attempts += 1;
          continue; // retry with a new MAX
        }
        throw e;
      }
    }
    return res.status(409).json({ error: 'Could not generate unique payment reference, please retry' });
    const created = await query('SELECT * FROM payments WHERE id = :id', { id: result.insertId });
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { amountCFA, amountUSD, date, status } = req.body;
    const result = await query(
      `UPDATE payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       SET p.amount_cfa = COALESCE(:amount_cfa, p.amount_cfa), 
           p.amount_usd = COALESCE(:amount_usd, p.amount_usd),
           p.date = COALESCE(:date, p.date), 
           p.status = COALESCE(:status, p.status) 
       WHERE p.id = :id AND e.company_id = :company_id`,
      {
        id: req.params.id,
        company_id: req.user.company_id,
        amount_cfa: amountCFA || null,
        amount_usd: amountUSD || null,
        date: date || null,
        status: status || null
      }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
    const updated = await query('SELECT * FROM payments WHERE id = :id', { id: req.params.id });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE p FROM payments p
       LEFT JOIN employees e ON e.id = p.employee_id
       WHERE p.id = :id AND e.company_id = :company_id`,
      { id: req.params.id, company_id: req.user.company_id }
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
