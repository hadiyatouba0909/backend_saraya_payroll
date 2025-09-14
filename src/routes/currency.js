import { Router } from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth.js';

const { authRequired } = authMiddleware;
const router = Router();

const cache = {
    rates: {},
    lastFetched: 0,
    ttlMs: 10 * 60 * 1000 // 10 minutes
};

async function fetchRates(base = 'USD') {
    const now = Date.now();
    if (cache.rates[base] && (now - cache.lastFetched) < cache.ttlMs) {
        return cache.rates[base];
    }
    
    const url = process.env.CURRENCY_API_URL || 'https://api.freecurrencyapi.com/v1/latest';
    const apiKey = process.env.CURRENCY_API_KEY;
    if (!apiKey) throw new Error('CURRENCY_API_KEY missing');
    
    const response = await axios.get(url, {
        params: { base_currency: base },
        headers: { apikey: apiKey }
    });
    
    const data = response.data?.data || {};
    cache.rates[base] = data;
    cache.lastFetched = now;
    return data;
}

router.get('/rates', authRequired, async (req, res, next) => {
    try {
        const base = (req.query.base || 'USD').toString().toUpperCase();
        const symbols = (req.query.symbols || '').toString().toUpperCase();
        
        const all = await fetchRates(base);
        
        if (!symbols) return res.json({ base, rates: all });
        
        const subset = {};
        symbols.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
            if (all[s] != null) subset[s] = all[s];
        });
        
        res.json({ base, rates: subset });
    } catch (err) { 
        next(err); 
    }
});

router.get('/convert', authRequired, async (req, res, next) => {
    try {
        const from = (req.query.from || 'USD').toString().toUpperCase();
        const to = (req.query.to || 'XOF').toString().toUpperCase();
        const amount = parseFloat(req.query.amount || '1');
        
        if (isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
        
        const rates = await fetchRates(from);
        const rate = rates[to];
        
        if (!rate) return res.status(400).json({ error: `Rate ${from}->${to} not available` });
        
        const converted = amount * rate;
        res.json({ from, to, amount, rate, converted });
    } catch (err) { 
        next(err); 
    }
});

export default router;