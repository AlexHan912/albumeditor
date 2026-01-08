// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ПЕРЕМЕННЫЕ
// ==========================================
const canvas = new fabric.Canvas('c', {
    preserveObjectStacking: true,
    selection: false
});

let currentFont = 'Tenor Sans';
let currentPalette = null;
let activeLayout = 'text_icon'; 

// Дефолтные цвета (будут перезаписаны палитрой)
let colorBg = '#F3F3F3';
let colorText = '#1A1A1A';

// Ссылки на DOM элементы
const els = {
    input1: document.getElementById('inputLine1'),
    input2: document.getElementById('inputLine2'),
    input3: document.getElementById('inputLine3'),
    dateLine: document.getElementById('dateLine'),
    copyright: document.getElementById('copyrightInput'),
    row2: document.getElementById('row2'),
    row3: document.getElementById('row3'),
    fontSelector: document.getElementById('fontSelector'),
    sendBtn: document.getElementById('sendTgBtn') // Кнопка Телеграм
};

// Инициализация при загрузке
window.addEventListener('load', () => {
    resizeCanvas();
    // Устанавливаем палитру по умолчанию
    document.getElementById('paletteSelector').value = "Wedding Trends";
    changeCollection("Wedding Trends"); 
    
    // Рендер начального состояния
    renderCanvas();
});

window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    const workspace = document.getElementById('workspace');
    const ratio = canvas.getHeight() / canvas.getWidth();
    
    // Логика для мобильных и десктопов
    let w = workspace.clientWidth;
    if (w > 600) w = 600; // Макс ширина холста
    
    const h = w * ratio; // Сохраняем пропорции книги
    
    canvas.setDimensions({ width: w, height: h });
    canvas.setZoom(w / 1000); // 1000 - базовая ширина виртуального холста
    canvas.requestRenderAll();
}

// ==========================================
// 2. ОТПРАВКА В TELEGRAM (ОБНОВЛЕНО)
// ==========================================

async function sendToTelegram() {
    const btn = els.sendBtn;
    const originalText = btn.innerText;

    // 1. Считываем параметры из URL (адресной строки)
    // Например: ?order_id=555&name=Анна&phone=+7900...
    const urlParams = new URLSearchParams(window.location.search);
    
    const orderData = {
        orderId: urlParams.get('order_id') || 'Без номера', // Если нет в ссылке, будет "Без номера"
        clientName: urlParams.get('name') || 'Не указано',
        clientPhone: urlParams.get('phone') || 'Не указан'
    };

    try {
        // Визуальная индикация
        btn.innerText = '⏳ Генерация...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        // 2. Генерируем изображение высокого качества
        // multiplier: 2 увеличивает разрешение в 2 раза для четкости
        const dataURL = canvas.toDataURL({
            format: 'jpeg',
            quality: 0.9,
            multiplier: 2
        });
        
        // Убираем заголовок base64, оставляем только данные
        const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, "");

        btn.innerText = '🚀 Отправка...';

        // 3. Отправляем на наш сервер (api/send.js)
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64Data,
                // Передаем данные, которые достали из ссылки
                orderId: orderData.orderId,
                clientName: orderData.clientName,
                clientPhone: orderData.clientPhone
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Заказ #${orderData.orderId} успешно отправлен менеджеру!`);
        } else {
            console.error('Server Error:', result);
            alert('❌ Ошибка сервера: ' + (result.error || 'Неизвестная ошибка'));
        }

    } catch (err) {
        console.error('Network Error:', err);
        alert('❌ Ошибка сети. Проверьте интернет или попробуйте позже.');
    } finally {
        // Возвращаем кнопку в исходное состояние
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// Привязка кнопки "Скачать" (старый функционал)
document.getElementById('saveBtn').addEventListener('click', downloadImage);

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'MALEVICH_design.jpg';
    link.href = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 3 });
    link.click();
}

// ==========================================
// 3. УПРАВЛЕНИЕ ТЕКСТОМ И ПОЛЯМИ
// ==========================================

// Слушатели ввода текста
els.input1.addEventListener('input', renderCanvas);
els.input2.addEventListener('input', renderCanvas);
els.input3.addEventListener('input', renderCanvas);
els.dateLine.addEventListener('input', renderCanvas);
els.copyright.addEventListener('input', renderCanvas);

// Кнопка Tt (Регистр)
window.toggleCase = function(rowNum) {
    const input = document.getElementById(`inputLine${rowNum}`);
    if (input.value === input.value.toUpperCase()) {
        input.value = input.value.toLowerCase();
    } else {
        input.value = input.value.toUpperCase();
    }
    renderCanvas();
};

// Добавление строк
window.addSmartRow = function() {
    if (els.row2.classList.contains('hidden')) {
        els.row2.classList.remove('hidden');
    } else if (els.row3.classList.contains('hidden')) {
        els.row3.classList.remove('hidden');
    }
};

window.hideRow = function(rowNum) {
    document.getElementById(`row${rowNum}`).classList.add('hidden');
    document.getElementById(`inputLine${rowNum}`).value = '';
    renderCanvas();
};

// ==========================================
// 4. ШРИФТЫ И РАЗМЕРЫ
// ==========================================

els.fontSelector.addEventListener('change', (e) => {
    currentFont = e.target.value;
    // Подгружаем шрифт (упрощенно, так как они в CSS подключены)
    document.fonts.load(`10pt "${currentFont}"`).then(renderCanvas);
});

// Масштаб текста (слайдер)
let textScaleMultiplier = 1;

window.updateScaleFromSlider = function(val) {
    // val от 1 до 5. 3 - это норма (1.0)
    // 1 -> 0.6, 5 -> 1.4
    textScaleMultiplier = 0.6 + (val - 1) * 0.2;
    renderCanvas();
};

window.setScale = function(val, el) {
    // Сброс слайдера кнопками S/XL
    const slider = document.getElementById('textScale');
    if (val < 1) slider.value = 1;
    else slider.value = 5;
    
    textScaleMultiplier = val === 0.5 ? 0.7 : 1.3; // Фикс крайних значений
    renderCanvas();
};

// Размер книги (пропорции холста)
window.setBookSize = function(size, el) {
    document.querySelectorAll('.format-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    
    // В реальном проекте тут менялась бы геометрия Canvas
    // Сейчас просто визуальный выбор, можно добавить логику изменения пропорций
    console.log("Selected size:", size);
};


// ==========================================
// 5. ЦВЕТА И ПАЛИТРЫ
// ==========================================

window.changeCollection = function(collectionName) {
    const grid = document.getElementById('pairsGrid');
    const customPickers = document.getElementById('customPickers');
    grid.innerHTML = '';
    
    if (collectionName === 'Custom') {
        customPickers.classList.remove('hidden');
        setupCustomPickers();
        return;
    }
    
    customPickers.classList.add('hidden');
    
    // Получаем данные из assets.js (предполагаем наличие объекта palettes)
    // Если assets.js не подключен, используем заглушку
    const paletteData = (window.PALETTES && window.PALETTES[collectionName]) || [
        {bg:'#fff', text:'#000'}, {bg:'#000', text:'#fff'}
    ];

    paletteData.forEach(pair => {
        const div = document.createElement('div');
        div.className = 'color-pair';
        div.style.backgroundColor = pair.bg;
        div.style.borderColor = pair.text; // для визуализации
        
        // Кружок с цветом текста внутри
        const dot = document.createElement('div');
        dot.style.width = '10px'; 
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = pair.text;
        dot.style.margin = 'auto';
        
        div.appendChild(dot);
        
        div.onclick = () => {
            document.querySelectorAll('.color-pair').forEach(p => p.classList.remove('active'));
            div.classList.add('active');
            colorBg = pair.bg;
            colorText = pair.text;
            
            // Обновляем canvas фон
            canvas.backgroundColor = colorBg;
            renderCanvas();
        };
        grid.appendChild(div);
    });
    
    // Кликаем первый
    if(grid.firstChild) grid.firstChild.click();
};

function setupCustomPickers() {
    const bgP = document.getElementById('customCoverPicker');
    const txP = document.getElementById('customTextPicker');
    
    const apply = () => {
        colorBg = bgP.value;
        colorText = txP.value;
        canvas.backgroundColor = colorBg;
        renderCanvas();
    };
    
    bgP.oninput = apply;
    txP.oninput = apply;
}


// ==========================================
// 6. МАКЕТЫ (LAYOUTS) И РЕНДЕР
// ==========================================

window.setLayout = function(layoutName, el) {
    activeLayout = layoutName;
    document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderCanvas();
};

// ГЛАВНАЯ ФУНКЦИЯ ОТРИСОВКИ
// Вызывает логику из cover-engine.js
function renderCanvas() {
    // Собираем состояние
    const state = {
        text1: els.input1.value,
        text2: els.row2.classList.contains('hidden') ? '' : els.input2.value,
        text3: els.row3.classList.contains('hidden') ? '' : els.input3.value,
        date: els.dateLine.value,
        copyright: els.copyright.value,
        
        font: currentFont,
        layout: activeLayout,
        colors: { bg: colorBg, text: colorText },
        scale: textScaleMultiplier,
        
        spine: getSpineState(), // см. ниже
        qrLink: window.qrDataLink || null, // Если QR задан
        
        // Картинки (если загружены)
        userImage: window.uploadedImageObj || null, // Фото пользователя
        symbolImage: window.selectedSymbolObj || null // Выбранный символ
    };

    // Очищаем
    canvas.clear();
    canvas.backgroundColor = state.colors.bg;

    // Вызываем отрисовщик (предполагаем, что функция есть в cover-engine.js)
    if (window.drawCoverLayout) {
        window.drawCoverLayout(canvas, state);
    } else {
        console.warn('Cover Engine not loaded');
    }
}


// ==========================================
// 7. ЗАГРУЗКА КАРТИНОК И СИМВОЛОВ
// ==========================================

// Открытие галереи
window.openGallery = function(type, target) {
    const modal = document.getElementById('galleryModal');
    modal.classList.remove('hidden');
    window.galleryTarget = target; // 'main' or 'global'
    
    // Тут логика рендера табов и картинок
    // (Упрощенно берем из assets.js)
    if (window.renderGalleryContents) {
        window.renderGalleryContents(type);
    }
};

window.closeGallery = function() {
    document.getElementById('galleryModal').classList.add('hidden');
};

// Загрузка фото пользователя
const imgLoader = document.getElementById('imageLoader');
imgLoader.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    // HEIC конвертация (если библиотека подключена)
    if (file.name.toLowerCase().endsWith('.heic') && window.heic2any) {
        heic2any({ blob: file, toType: "image/jpeg" })
            .then(blob => loadBlob(blob))
            .catch(e => alert("Ошибка HEIC"));
    } else {
        loadBlob(file);
    }
});

function loadBlob(blob) {
    const reader = new FileReader();
    reader.onload = function(f) {
        const imgObj = new Image();
        imgObj.src = f.target.result;
        imgObj.onload = function() {
            // Открываем кроппер
            openCropper(imgObj);
        }
    };
    reader.readAsDataURL(blob);
}

// ==========================================
// 8. CROPPER (КАДРИРОВАНИЕ)
// ==========================================
let cropperImage = null; // Исходная картинка
let cropCanvasEl = document.getElementById('cropCanvas');
let cropCtx = cropCanvasEl.getContext('2d');
let cropState = { scale: 1, x: 0, y: 0, rotation: 0 };
let currentMaskRatio = 1; // 6x6 по умолчанию

function openCropper(img) {
    document.getElementById('cropperModal').classList.remove('hidden');
    cropperImage = img;
    
    // Сброс
    cropState = { scale: 1, x: 0, y: 0, rotation: 0 };
    document.getElementById('zoomSlider').value = 1;
    
    drawCropper();
}

// Простая отрисовка кроппера (упрощенно)
function drawCropper() {
    if (!cropperImage) return;
    
    // Размер канваса
    cropCanvasEl.width = 300;
    cropCanvasEl.height = 300;
    
    // Рисуем картинку с учетом cropState
    // ... тут сложная логика трансформации, оставим базовую для примера
    cropCtx.clearRect(0,0,300,300);
    cropCtx.save();
    cropCtx.translate(150 + cropState.x, 150 + cropState.y);
    cropCtx.rotate(cropState.rotation * Math.PI/180);
    cropCtx.scale(cropState.scale, cropState.scale);
    cropCtx.drawImage(cropperImage, -cropperImage.width/2, -cropperImage.height/2);
    cropCtx.restore();
    
    // Рисуем маску сверху (белая рамка с дыркой)
    // ...
}

// Кнопка "Применить" в кроппере
document.getElementById('applyCropBtn').addEventListener('click', () => {
    // Сохраняем результат кропа в переменную
    // В реальности тут нужно вырезать кусок канваса
    window.uploadedImageObj = cropperImage; // Пока просто сохраняем оригинал
    document.getElementById('cropperModal').classList.add('hidden');
    
    // Если активен лейаут без фото, переключаем на фото
    if (activeLayout !== 'photo_text' && activeLayout !== 'magazine') {
        setLayout('photo_text', document.querySelectorAll('.layout-card')[4]);
    } else {
        renderCanvas();
    }
});

document.getElementById('cancelCropBtn').addEventListener('click', () => {
    document.getElementById('cropperModal').classList.add('hidden');
});

// ==========================================
// 9. СПАЙН (КОРЕШОК) И QR
// ==========================================

let spineState = { symbol: true, title: true, date: true };

window.toggleSpinePart = function(part) {
    spineState[part] = !spineState[part];
    
    const btn = document.getElementById(
        part === 'symbol' ? 'btnSpineSymbol' : 
        part === 'title' ? 'btnSpineTitle' : 'btnSpineDate'
    );
    btn.classList.toggle('active');
    renderCanvas();
};

function getSpineState() {
    return spineState;
}

// QR Логика
window.openQRModal = function() {
    document.getElementById('qrModal').classList.remove('hidden');
};

window.applyQR = function() {
    const link = document.getElementById('qrLinkInput').value;
    if(link.length > 0) {
        window.qrDataLink = link;
        document.getElementById('qrBtn').style.border = "1px solid var(--accent-gold)";
    }
    document.getElementById('qrModal').classList.add('hidden');
    renderCanvas();
};

window.removeQR = function() {
    window.qrDataLink = null;
    document.getElementById('qrBtn').style.border = "1px solid #ddd";
    document.getElementById('qrModal').classList.add('hidden');
    renderCanvas();
};

// ==========================================
// 10. МОБИЛЬНОЕ ПРЕВЬЮ
// ==========================================
window.openMobilePreview = function() {
    const previewDiv = document.getElementById('mobilePreview');
    const img = document.getElementById('mobilePreviewImg');
    
    // Генерим картинку
    img.src = canvas.toDataURL({ multiplier: 2 });
    
    previewDiv.classList.remove('hidden');
    
    // Инит Panzoom (если библиотека подключена)
    if (window.Panzoom) {
       const pz = Panzoom(document.getElementById('panzoomContainer'), { maxScale: 5 });
       // Привязка кнопок зума...
    }
};

document.getElementById('closePreviewBtn').addEventListener('click', () => {
    document.getElementById('mobilePreview').classList.add('hidden');
});
