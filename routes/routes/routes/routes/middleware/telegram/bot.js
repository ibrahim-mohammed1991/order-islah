const TelegramBot = require('node-telegram-bot-api');

async function sendTelegramNotification(restaurant, order) {
  if (!restaurant.telegram_bot_token || !restaurant.telegram_chat_id) {
    return;
  }

  try {
    const bot = new TelegramBot(restaurant.telegram_bot_token);
    
    const items = JSON.parse(order.items);
    const itemsList = items.map(item => 
      `• ${item.name} × ${item.quantity} - ${(item.price * item.quantity).toLocaleString()} د.ع`
    ).join('\n');

    const orderTypeEmoji = {
      delivery: '🚚',
      pickup: '🏪',
      reservation: '🪑'
    };

    const orderTypeText = {
      delivery: 'توصيل',
      pickup: 'استلام من المطعم',
      reservation: 'حجز طاولة'
    };

    const message = `
🔔 *طلب جديد في ${restaurant.name}*

📋 رقم الطلب: \`${order.order_number}\`
🕐 الوقت: ${new Date(order.created_at).toLocaleString('ar-IQ')}

👤 بيانات العميل:
📱 الهاتف: ${order.customer_phone}
${order.customer_address ? `📍 العنوان: ${order.customer_address}` : ''}

${orderTypeEmoji[order.order_type]} نوع الطلب: ${orderTypeText[order.order_type]}

📦 *الأصناف:*
${itemsList}

💰 *المجموع الكلي: ${order.total_price.toLocaleString()} د.ع*

${order.notes ? `📝 ملاحظات: ${order.notes}` : ''}

⏳ الحالة: قيد الانتظار
    `;

    await bot.sendMessage(restaurant.telegram_chat_id, message, { 
      parse_mode: 'Markdown' 
    });

    console.log(`✅ تم إرسال إشعار تلجرام للطلب #${order.id}`);
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار تلجرام:', error.message);
  }
}

module.exports = { sendTelegramNotification };
