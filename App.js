// ================== Configuration ==================
const API_URL = window.location.origin + '/api';

// ================== State Management ==================
let allRestaurants = [];
let currentCategory = 'all';
let currentSort = 'newest';

// ================== Initialize App ==================
document.addEventListener('DOMContentLoaded', () => {
    loadRestaurants();
    loadStats();
    setupEventListeners();
});

// ================== Event Listeners ==================
function setupEventListeners() {
    // Category filter
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            loadRestaurants();
        });
    });

    // Search on Enter key
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchRestaurants();
        }
    });
}

// ================== API Functions ==================

// Load all restaurants
async function loadRestaurants() {
    try {
        showLoading(true);
        const url = new URL(`${API_URL}/restaurants`);
        
        if (currentCategory !== 'all') {
            url.searchParams.append('category', currentCategory);
        }

        const searchQuery = document.getElementById('searchInput').value;
        if (searchQuery) {
            url.searchParams.append('search', searchQuery);
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            allRestaurants = result.data;
            sortAndDisplayRestaurants();
        } else {
            showToast('حدث خطأ في تحميل المطاعم', 'error');
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        showToast('تعذر الاتصال بالخادم', 'error');
        displayRestaurants([]);
    } finally {
        showLoading(false);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const result = await response.json();

        if (result.success) {
            document.getElementById('totalRestaurants').textContent = result.data.totalRestaurants;
            document.getElementById('totalReviews').textContent = result.data.totalReviews;
            document.getElementById('totalCategories').textContent = result.data.categories.length;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Add new restaurant
async function addRestaurant(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const restaurantData = {
        name: formData.get('name'),
        description: formData.get('description'),
        category: formData.get('category'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        openingHours: formData.get('openingHours') || '9:00 AM - 11:00 PM',
        priceRange: formData.get('priceRange') || '$$',
        image: formData.get('image') || 'https://via.placeholder.com/400x300?text=Restaurant',
        features: formData.get('features') ? formData.get('features').split(',').map(f => f.trim()) : []
    };

    try {
        console.log('Sending restaurant data:', restaurantData);
        
        const response = await fetch(`${API_URL}/restaurants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(restaurantData)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            showToast('✅ تم إضافة المطعم بنجاح!', 'success');
            form.reset();
            closeAddRestaurantModal();
            loadRestaurants();
            loadStats();
        } else {
            showToast('❌ ' + (result.message || 'حدث خطأ أثناء الحفظ'), 'error');
            console.error('Error details:', result);
        }
    } catch (error) {
        console.error('Error adding restaurant:', error);
        showToast('❌ تعذر الاتصال بالخادم. تأكد من تشغيل Backend', 'error');
    }
}

// Delete restaurant
async function deleteRestaurant(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المطعم؟')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/restaurants/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast('تم حذف المطعم بنجاح', 'success');
            loadRestaurants();
            loadStats();
        } else {
            showToast(result.message || 'حدث خطأ في الحذف', 'error');
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

// View restaurant details
async function viewRestaurantDetails(id) {
    try {
        const response = await fetch(`${API_URL}/restaurants/${id}`);
        const result = await response.json();

        if (result.success) {
            const restaurant = result.data;
            
            // Get reviews
            const reviewsResponse = await fetch(`${API_URL}/restaurants/${id}/reviews`);
            const reviewsResult = await reviewsResponse.json();
            const reviews = reviewsResult.success ? reviewsResult.data : [];

            displayRestaurantDetails(restaurant, reviews);
        }
    } catch (error) {
        console.error('Error loading restaurant details:', error);
        showToast('تعذر تحميل تفاصيل المطعم', 'error');
    }
}

// Add review
async function addReview(restaurantId) {
    const userName = document.getElementById('reviewUserName').value;
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;

    if (!userName || !rating || !comment) {
        showToast('الرجاء ملء جميع حقول التقييم', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/restaurants/${restaurantId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userName, rating: parseInt(rating), comment })
        });

        const result = await response.json();

        if (result.success) {
            showToast('تم إضافة التقييم بنجاح', 'success');
            viewRestaurantDetails(restaurantId);
            loadRestaurants();
        } else {
            showToast(result.message || 'حدث خطأ في إضافة التقييم', 'error');
        }
    } catch (error) {
        console.error('Error adding review:', error);
        showToast('تعذر الاتصال بالخادم', 'error');
    }
}

// ================== Display Functions ==================

// Display restaurants
function displayRestaurants(restaurants) {
    const grid = document.getElementById('restaurantsGrid');
    const emptyState = document.getElementById('emptyState');

    if (restaurants.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = restaurants.map(restaurant => `
        <div class="restaurant-card" onclick="viewRestaurantDetails('${restaurant._id}')">
            <img src="${restaurant.image}" alt="${restaurant.name}" class="restaurant-image" 
                 onerror="this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(restaurant.name)}'">
            <div class="restaurant-content">
                <div class="restaurant-header">
                    <div>
                        <h3 class="restaurant-name">${restaurant.name}</h3>
                        <span class="restaurant-category">
                            <i class="fas fa-tag"></i> ${restaurant.category}
                        </span>
                    </div>
                    <div class="restaurant-rating">
                        <span class="stars">${getStars(restaurant.rating)}</span>
                        <span>${restaurant.rating.toFixed(1)}</span>
                    </div>
                </div>
                
                <p class="restaurant-description">${restaurant.description}</p>
                
                <div class="restaurant-info">
                    <div><i class="fas fa-map-marker-alt"></i> ${restaurant.address}</div>
                    <div><i class="fas fa-phone"></i> ${restaurant.phone}</div>
                    <div><i class="fas fa-clock"></i> ${restaurant.openingHours}</div>
                </div>
                
                <div class="restaurant-footer">
                    <span class="price-range">${restaurant.priceRange}</span>
                    <div class="restaurant-actions" onclick="event.stopPropagation()">
                        <button class="icon-btn" onclick="deleteRestaurant('${restaurant._id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display restaurant details
function displayRestaurantDetails(restaurant, reviews) {
    document.getElementById('detailsTitle').innerHTML = `
        <i class="fas fa-store"></i> ${restaurant.name}
    `;

    const content = document.getElementById('restaurantDetailsContent');
    content.innerHTML = `
        <div class="details-header">
            <img src="${restaurant.image}" alt="${restaurant.name}" class="details-image"
                 onerror="this.src='https://via.placeholder.com/900x300?text=${encodeURIComponent(restaurant.name)}'">
            <div class="details-overlay">
                <h2>${restaurant.name}</h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <span class="restaurant-category">
                        <i class="fas fa-tag"></i> ${restaurant.category}
                    </span>
                    <span>${getStars(restaurant.rating)} ${restaurant.rating.toFixed(1)} (${restaurant.reviewCount} تقييم)</span>
                    <span>${restaurant.priceRange}</span>
                </div>
            </div>
        </div>

        <div class="details-body">
            <div class="details-section">
                <h3><i class="fas fa-info-circle"></i> الوصف</h3>
                <p>${restaurant.description}</p>
            </div>

            <div class="details-section">
                <h3><i class="fas fa-location-dot"></i> معلومات الاتصال</h3>
                <div class="restaurant-info">
                    <div><i class="fas fa-map-marker-alt"></i> ${restaurant.address}</div>
                    <div><i class="fas fa-phone"></i> ${restaurant.phone}</div>
                    <div><i class="fas fa-clock"></i> ${restaurant.openingHours}</div>
                </div>
            </div>

            ${restaurant.features && restaurant.features.length > 0 ? `
                <div class="details-section">
                    <h3><i class="fas fa-star"></i> المميزات</h3>
                    <div class="features-grid">
                        ${restaurant.features.map(feature => `
                            <div class="feature-item">
                                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                                <span>${feature}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="details-section">
                <h3><i class="fas fa-comments"></i> التقييمات (${reviews.length})</h3>
                
                <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 1rem;">أضف تقييمك</h4>
                    <div class="form-group">
                        <label>اسمك</label>
                        <input type="text" id="reviewUserName" placeholder="أدخل اسمك">
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>التقييم</label>
                        <select id="reviewRating">
                            <option value="5">⭐⭐⭐⭐⭐ ممتاز</option>
                            <option value="4">⭐⭐⭐⭐ جيد جداً</option>
                            <option value="3">⭐⭐⭐ جيد</option>
                            <option value="2">⭐⭐ مقبول</option>
                            <option value="1">⭐ ضعيف</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>التعليق</label>
                        <textarea id="reviewComment" rows="3" placeholder="شارك تجربتك..."></textarea>
                    </div>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="addReview('${restaurant._id}')">
                        <i class="fas fa-paper-plane"></i> إرسال التقييم
                    </button>
                </div>

                ${reviews.length > 0 ? `
                    <div class="reviews-list">
                        ${reviews.map(review => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div>
                                        <span class="review-user"><i class="fas fa-user"></i> ${review.userName}</span>
                                        <div style="color: var(--accent); margin-top: 0.25rem;">
                                            ${getStars(review.rating)}
                                        </div>
                                    </div>
                                    <span class="review-date">${formatDate(review.createdAt)}</span>
                                </div>
                                <p style="margin-top: 0.5rem;">${review.comment}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--text-light); text-align: center; padding: 2rem;">لا توجد تقييمات بعد. كن أول من يقيّم!</p>'}
            </div>
        </div>
    `;

    showRestaurantDetailsModal();
}

// ================== Helper Functions ==================

// Sort and display restaurants
function sortRestaurants() {
    currentSort = document.getElementById('sortSelect').value;
    sortAndDisplayRestaurants();
}

function sortAndDisplayRestaurants() {
    let sorted = [...allRestaurants];

    switch (currentSort) {
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            break;
        case 'newest':
        default:
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    displayRestaurants(sorted);
}

// Search restaurants
function searchRestaurants() {
    loadRestaurants();
}

// Get star rating display
function getStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
    }
    if (hasHalfStar) {
        stars += '⭐';
    }

    return stars || '☆☆☆☆☆';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهور`;
    return `منذ ${Math.floor(diffDays / 365)} سنوات`;
}

// Show/hide loading
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ================== Modal Functions ==================

// Show add restaurant modal
function showAddRestaurantModal() {
    document.getElementById('addRestaurantModal').classList.add('active');
}

// Close add restaurant modal
function closeAddRestaurantModal() {
    document.getElementById('addRestaurantModal').classList.remove('active');
}

// Show restaurant details modal
function showRestaurantDetailsModal() {
    document.getElementById('restaurantDetailsModal').classList.add('active');
}

// Close restaurant details modal
function closeRestaurantDetails() {
    document.getElementById('restaurantDetailsModal').classList.remove('active');
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ================== Health Check ==================
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const result = await response.json();
        console.log('✅ Server Health:', result);
        return result;
    } catch (error) {
        console.error('❌ Server health check failed:', error);
        return null;
    }
}

// Check server on load
checkServerHealth();
