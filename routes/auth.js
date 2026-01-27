const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password, restaurant_slug } = req.body;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      'SELECT * FROM restaurants WHERE username = $1 AND slug = $2',
      [username, restaurant_slug]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const restaurant = result.rows[0];
    const isValid = await bcrypt.compare(password, restaurant.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { 
        id: restaurant.id, 
        username: restaurant.username,
        slug: restaurant.slug
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
