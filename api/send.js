// api/send.js
import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { imageBase64, orderId, clientName, clientPhone } = req.body;

        if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

        const BOT_TOKEN = process.env.TG_BOT_TOKEN;
        const CHAT_ID = process.env.TG_CHAT_ID;

        // Текст сообщения
        const captionText = `
📦 <b>ЗАКАЗ #${orderId} (PRINT FILE)</b>

👤 <b>Имя:</b> ${clientName}
📱 <b>Телефон:</b> ${clientPhone}
📐 <b>Качество:</b> 300 DPI (JPEG MAX)
        `.trim();

        // Подготовка файла
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        // ВАЖНО: поле называется 'document', а не 'photo'
        formData.append('document', imageBuffer, `order_${orderId}_print.jpg`);
        formData.append('caption', captionText);
        formData.append('parse_mode', 'HTML');

        // ВАЖНО: Используем метод sendDocument
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
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
