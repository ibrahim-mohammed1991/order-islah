const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-restaurants';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB متصل بنجاح');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    // استمر في العمل حتى بدون قاعدة بيانات (للتطوير)
  }
};

connectDB();

// Restaurant Schema
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/400x300?text=Restaurant' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  openingHours: { type: String, default: '9:00 AM - 11:00 PM' },
  priceRange: { type: String, default: '$$' },
  features: [String],
  coordinates: {
    lat: Number,
    lng: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// ==================== API Routes ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const restaurants = await Restaurant.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: restaurants, count: restaurants.length });
  } catch (error) {
    console.error('❌ خطأ في جلب المطاعم:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المطاعم', error: error.message });
  }
});

// Get single restaurant
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('❌ خطأ في جلب المطعم:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المطعم', error: error.message });
  }
});

// Create restaurant
app.post('/api/restaurants', async (req, res) => {
  try {
    console.log('📥 طلب إضافة مطعم:', req.body);

    // Validate required fields
    const { name, description, category, address, phone } = req.body;
    if (!name || !description || !category || !address || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'الرجاء ملء جميع الحقول المطلوبة',
        missing: {
          name: !name,
          description: !description,
          category: !category,
          address: !address,
          phone: !phone
        }
      });
    }

    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    
    console.log('✅ تم إضافة المطعم بنجاح:', restaurant._id);
    res.status(201).json({ 
      success: true, 
      message: 'تم إضافة المطعم بنجاح', 
      data: restaurant 
    });
  } catch (error) {
    console.error('❌ خطأ في إضافة المطعم:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ أثناء الحفظ', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors) : []
    });
  }
});

// Update restaurant
app.put('/api/restaurants/:id', async (req, res) => {
  try {
    req.body.updatedAt = Date.now();
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
    }

    res.json({ success: true, message: 'تم تحديث المطعم بنجاح', data: restaurant });
  } catch (error) {
    console.error('❌ خطأ في تحديث المطعم:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في التحديث', error: error.message });
  }
});

// Delete restaurant
app.delete('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
    }

    // Delete associated reviews
    await Review.deleteMany({ restaurantId: req.params.id });

    res.json({ success: true, message: 'تم حذف المطعم بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في حذف المطعم:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الحذف', error: error.message });
  }
});

// Get restaurant reviews
app.get('/api/restaurants/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ restaurantId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews, count: reviews.length });
  } catch (error) {
    console.error('❌ خطأ في جلب التقييمات:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب التقييمات', error: error.message });
  }
});

// Add review
app.post('/api/restaurants/:id/reviews', async (req, res) => {
  try {
    const { userName, rating, comment } = req.body;

    if (!userName || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'الرجاء ملء جميع حقول التقييم' });
    }

    const review = new Review({
      restaurantId: req.params.id,
      userName,
      rating,
      comment
    });

    await review.save();

    // Update restaurant rating
    const reviews = await Review.find({ restaurantId: req.params.id });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await Restaurant.findByIdAndUpdate(req.params.id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length
    });

    res.status(201).json({ success: true, message: 'تم إضافة التقييم بنجاح', data: review });
  } catch (error) {
    console.error('❌ خطأ في إضافة التقييم:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في إضافة التقييم', error: error.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalRestaurants = await Restaurant.countDocuments();
    const totalReviews = await Review.countDocuments();
    const categories = await Restaurant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalRestaurants,
        totalReviews,
        categories: categories.map(c => ({ name: c._id, count: c.count }))
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الإحصائيات', error: error.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ خطأ في الخادم:', err);
  res.status(500).json({ 
    success: false, 
    message: 'حدث خطأ في الخادم', 
    error: err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
});
