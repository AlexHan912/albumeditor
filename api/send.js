// api/send.js
import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Получаем картинку И данные клиента из запроса
        const { imageBase64, orderId, clientName, clientPhone } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const BOT_TOKEN = process.env.TG_BOT_TOKEN;
        const CHAT_ID = process.env.TG_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
            return res.status(500).json({ error: 'Server misconfiguration (tokens missing)' });
        }

        // 2. Формируем красивый текст сообщения
        // \n - это перенос строки
        const captionText = `
📦 <b>НОВЫЙ ЗАКАЗ #${orderId}</b>

👤 <b>Имя:</b> ${clientName}
📱 <b>Телефон:</b> ${clientPhone}

🎨 <i>Дизайн прикреплен к сообщению.</i>
        `.trim();

        // 3. Подготавливаем данные для Телеграма
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', imageBuffer, 'design.jpg');
        formData.append('caption', captionText);
        formData.append('parse_mode', 'HTML'); // Чтобы работало жирное выделение

        // 4. Отправляем в Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const telegramResult = await telegramResponse.json();

        if (!telegramResult.ok) {
            throw new Error(telegramResult.description || 'Telegram API Error');
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
