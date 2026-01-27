const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.set('db', pool);

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: '🍔 مرحباً بك في منصة المطاعم الذكية!',
    status: 'online',
    version: '1.0.0'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      status: 'OK',
      database: 'Connected',
      time: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error',
      database: 'Disconnected',
      error: error.message 
    });
  }
});

app.get('/api/init-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        logo VARCHAR(10) DEFAULT '🍔',
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        telegram_bot_token VARCHAR(255),
        telegram_chat_id VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        image VARCHAR(10) DEFAULT '🍽️',
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        items JSONB NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20) NOT NULL,
        customer_address TEXT,
        order_type VARCHAR(20) NOT NULL,
        total_price INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON notifications(restaurant_id);
    `);

    res.json({ 
      success: true, 
      message: 'Database initialized successfully!' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log('Server running on port: ' + PORT);
});

module.exports = app;
```

---

### **الخطوة 3️⃣: احفظ التغييرات**

1. **scroll للأسفل**

2. **اضغط الزر الأخضر:** `Commit changes`

3. **في النافذة اللي تطلع، اضغط:** `Commit changes` مرة ثانية

---

## 🔄 **Railway راح يعيد النشر تلقائياً!**

**انتظر دقيقة واحدة...**

---

## 🎯 **بعد دقيقة:**

1. **اذهب لـ Railway**

2. **افتح المشروع** `restaurant-platform`

3. **اضغط على تبويب:** `Deployments`

4. **شوف آخر deployment:**
   - لازم يكون: ✅ **Success**

5. **اضغط على:** `View Logs`

6. **لازم تشوف:**
```
   Server running on port: 4000
```

---

## ✅ **اختبار التطبيق:**

**افتح المتصفح واكتب:**
```
https://YOUR-RAILWAY-URL.up.railway.app/api/health
