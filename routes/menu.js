const express = require('express');
const router = express.Router();

router.get('/:restaurant_slug', async (req, res) => {
  const { restaurant_slug } = req.params;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      `SELECT m.* FROM menu_items m
       JOIN restaurants r ON m.restaurant_id = r.id
       WHERE r.slug = $1
       ORDER BY m.category, m.name`,
      [restaurant_slug]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { restaurant_id, name, description, price, category, image } = req.body;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, description, price, category, image)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant_id, name, description, price, category, image || '🍽️']
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { available } = req.body;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      'UPDATE menu_items SET available = $1 WHERE id = $2 RETURNING *',
      [available, id]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const pool = req.app.get('db');

  try {
    await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم حذف الصنف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
