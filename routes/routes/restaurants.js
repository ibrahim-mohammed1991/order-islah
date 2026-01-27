const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      'SELECT id, slug, name, logo, phone, address, is_active FROM restaurants WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المطعم غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { name, slug, username, password, phone, address } = req.body;
  const pool = req.app.get('db');

  try {
    const existing = await pool.query(
      'SELECT id FROM restaurants WHERE slug = $1 OR username = $2',
      [slug, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'المطعم أو اسم المستخدم موجود مسبقاً' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO restaurants (name, slug, username, password_hash, phone, address) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, slug, name, logo`,
      [name, slug, username, passwordHash, phone, address]
    );

    res.json({ 
      success: true,
      message: 'تم تسجيل المطعم بنجاح!',
      restaurant: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      'SELECT id, slug, name, logo FROM restaurants WHERE is_active = true ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
