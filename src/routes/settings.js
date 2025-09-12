const express = require('express');
const { query } = require('../utils/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/exchange-rate', authRequired, async (req, res, next) => {
  try {
    const rows = await query("SELECT `value` FROM settings WHERE `key` = 'usd_to_xof'", {});
    const value = rows.length ? rows[0].value : null;
    res.json({ key: 'usd_to_xof', value });
  } catch (err) { next(err); }
});

router.put('/exchange-rate', authRequired, async (req, res, next) => {
  try {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });
    await query(
      `INSERT INTO settings (\`key\`, \`value\`) VALUES ('usd_to_xof', :value)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      { value: String(value) }
    );
    res.json({ success: true, key: 'usd_to_xof', value: String(value) });
  } catch (err) { next(err); }
});

module.exports = router;
