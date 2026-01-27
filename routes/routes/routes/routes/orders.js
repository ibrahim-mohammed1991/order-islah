const express = require('express');
const router = express.Router();
const { sendTelegramNotification } = require('../telegram/bot');

router.post('/create', async (req, res) => {
  const { restaurant_slug, items, customer_info } = req.body;
  const pool = req.app.get('db');

  try {
    const restaurantResult = await pool.query(
      'SELECT * FROM restaurants WHERE slug = $1',
      [restaurant_slug]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'المطعم غير موجود' });
    }

    const restaurant = restaurantResult.rows[0];
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderNumber = `ORD-${Date.now()}`;

    const orderResult = await pool.query(
      `INSERT INTO orders 
       (restaurant_id, order_number, items, customer_name, customer_phone, customer_address, order_type, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        restaurant.id,
        orderNumber,
        JSON.stringify(items),
        customer_info.name || '',
        customer_info.phone,
        customer_info.address || '',
        customer_info.type,
        total
      ]
    );

    const order = orderResult.rows[0];

    await pool.query(
      'INSERT INTO notifications (restaurant_id, order_id, message, type) VALUES ($1, $2, $3, $4)',
      [restaurant.id, order.id, `طلب جديد #${order.id}`, 'new_order']
    );

    if (restaurant.telegram_bot_token && restaurant.telegram_chat_id) {
      await sendTelegramNotification(restaurant, order);
    }

    res.json({ 
      success: true,
      message: 'تم إرسال طلبك بنجاح!',
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total_price,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:restaurant_slug', async (req, res) => {
  const { restaurant_slug } = req.params;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      `SELECT o.* FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE r.slug = $1
       ORDER BY o.created_at DESC`,
      [restaurant_slug]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const pool = req.app.get('db');

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
