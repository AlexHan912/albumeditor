/* app.js - FINAL STABLE VERSION (With Telegram Params) */

// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ
// ==========================================
const canvas = new fabric.Canvas('c', {
    preserveObjectStacking: true,
    selection: false
});

// Глобальное состояние
let currentFont = 'Tenor Sans';
let currentPalette = null;
let activeLayout = 'text_icon'; 
let colorBg = '#F3F3F3';
let colorText = '#1A1A1A';

// Ссылки на элементы UI
const els = {
    input1: document.getElementById('inputLine1'),
    input2: document.getElementById('inputLine2'),
    input3: document.getElementById('inputLine3'),
    dateLine: document.getElementById('dateLine'),
    copyright: document.getElementById('copyrightInput'),
    row2: document.getElementById('row2'),
    row3: document.getElementById('row3'),
    fontSelector: document.getElementById('fontSelector'),
    sendBtn: document.getElementById('sendTgBtn')
};

// Запуск при загрузке
window.addEventListener('load', () => {
    resizeCanvas();
    
    // 1. Убираем черный экран загрузки
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    }, 500);

    // 2. Инициализируем палитру (с защитой от ошибок)
    const startPalette = "Wedding Trends";
    const paletteSelector = document.getElementById('paletteSelector');
    if(paletteSelector) {
        paletteSelector.value = startPalette;
        changeCollection(startPalette);
    }

    // 3. Заполняем поля, если есть параметры в URL (опционально)
    const params = new URLSearchParams(window.location.search);
    if(params.get('name')) els.input1.value = params.get('name').toUpperCase();
    if(params.get('year')) els.dateLine.value = params.get('year');

    // 4. Первый рендер
    renderCanvas();
});

window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    const workspace = document.getElementById('workspace');
    if(!workspace) return;
    const ratio = canvas.getHeight() / canvas.getWidth();
    let w = workspace.clientWidth;
    if (w > 600) w = 600; 
    const h = w * ratio;
    canvas.setDimensions({ width: w, height: h });
    canvas.setZoom(w / 1000); 
    canvas.requestRenderAll();
}

// ==========================================
// 2. ТЕЛЕГРАМ: ОТПРАВКА С ПАРАМЕТРАМИ ИЗ URL
// ==========================================

async function sendToTelegram() {
    const btn = els.sendBtn;
    const originalText = btn.innerText;

    // 1. Читаем данные из адресной строки (ссылки)
    // Ссылка вида: domain.com/?order_id=1055&name=Ivan&phone=+7999...
    const urlParams = new URLSearchParams(window.location.search);
    
    const orderData = {
        orderId: urlParams.get('order_id') || 'Без номера',
        clientName: urlParams.get('name') || 'Не указано',
        clientPhone: urlParams.get('phone') || 'Не указан'
    };

    try {
        btn.innerText = '⏳ Генерация...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        // 2. Генерируем картинку
        const dataURL = canvas.toDataURL({
            format: 'jpeg',
            quality: 0.9,
            multiplier: 2 // Высокое качество
        });
        
        const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, "");

        btn.innerText = '🚀 Отправка...';

        // 3. Отправляем на сервер Vercel
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64Data,
                orderId: orderData.orderId,
                clientName: orderData.clientName,
                clientPhone: orderData.clientPhone
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Заказ #${orderData.orderId} успешно отправлен!`);
        } else {
            console.error('Server response:', result);
            alert('❌ Ошибка сервера: ' + (result.error || 'Неизвестная ошибка'));
        }

    } catch (err) {
        console.error('Network Error:', err);
        alert('❌ Ошибка сети. Проверьте интернет.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// ==========================================
// 3. ЦВЕТА И ПАЛИТРЫ (ИСПРАВЛЕНО)
// ==========================================

window.changeCollection = function(collectionName) {
    const grid = document.getElementById('pairsGrid');
    const customPickers = document.getElementById('customPickers');
    if(!grid) return;

    grid.innerHTML = '';
    
    // Режим своих цветов
    if (collectionName === 'Custom') {
        customPickers.classList.remove('hidden');
        setupCustomPickers();
        return;
    }
    
    customPickers.classList.add('hidden');
    
    // Получаем данные. Поддержка разных версий assets.js
    // Ищем в window.PALETTES или window.DESIGNER_PALETTES или используем заглушку
    let paletteData = [];
    if (window.PALETTES && window.PALETTES[collectionName]) {
        paletteData = window.PALETTES[collectionName];
    } else if (window.DESIGNER_PALETTES && window.DESIGNER_PALETTES[collectionName]) {
        paletteData = window.DESIGNER_PALETTES[collectionName];
    } else {
        // Заглушка, если assets.js не загрузился
        console.warn('Assets not loaded, using fallback colors');
        paletteData = [
            {bg:'#fff', text:'#000'}, 
            {bg:'#f3f3f3', text:'#1a1a1a'},
            {bg:'#000', text:'#fff'}
        ];
    }

    paletteData.forEach(pair => {
        const div = document.createElement('div');
        div.className = 'color-pair';
        div.style.backgroundColor = pair.bg;
        // Если фон белый, добавляем рамку
        if(pair.bg.toLowerCase() === '#ffffff' || pair.bg.toLowerCase() === '#fff') {
            div.style.border = '1px solid #ddd';
        }
        
        const dot = document.createElement('div');
        dot.style.width = '10px'; 
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = pair.text;
        dot.style.margin = 'auto';
        dot.style.marginTop = '12px'; // Центрирование
        
        div.appendChild(dot);
        
        div.onclick = () => {
            document.querySelectorAll('.color-pair').forEach(p => p.classList.remove('active'));
            div.classList.add('active');
            colorBg = pair.bg;
            colorText = pair.text;
            canvas.backgroundColor = colorBg;
            renderCanvas();
        };
        grid.appendChild(div);
    });
    
    // Кликаем первый цвет по умолчанию
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
// 4. ГАЛЕРЕЯ (ИСПРАВЛЕНО)
// ==========================================

window.openGallery = function(type, target) {
    const modal = document.getElementById('galleryModal');
    const grid = document.getElementById('galleryGrid');
    const tabs = document.getElementById('galleryTabs');
    const title = document.getElementById('galleryTitle');
    
    modal.classList.remove('hidden');
    window.galleryTarget = target;
    grid.innerHTML = '';
    tabs.innerHTML = '';

    // Определяем источник данных (поддержка разных assets.js)
    let sourceDB = {};
    const ASSETS = window.ASSETS_DB || window.ASSETS || {};

    if (type === 'symbols') {
        title.innerText = "Символы";
        sourceDB = ASSETS.symbols || {};
    } else {
        title.innerText = "Графика";
        sourceDB = ASSETS.graphics || {};
    }

    // Если база пустая, показываем сообщение
    if (Object.keys(sourceDB).length === 0) {
        grid.innerHTML = '<div style="padding:20px; text-align:center; color:#888">Галерея загружается или пуста...</div>';
        // Попытка показать хотя бы заглушки, если assets.js отвалился
        return;
    }

    // Создаем табы
    Object.keys(sourceDB).forEach((cat, index) => {
        const tab = document.createElement('div');
        tab.className = 'gallery-tab';
        if (index === 0) tab.classList.add('active');
        tab.innerText = cat;
        
        tab.onclick = () => {
            document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderGalleryImages(sourceDB[cat], type);
        };
        tabs.appendChild(tab);
    });

    // Рендерим первую категорию
    const firstCat = Object.keys(sourceDB)[0];
    if (firstCat) renderGalleryImages(sourceDB[firstCat], type);
};

function renderGalleryImages(files, type) {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    
    const folder = type === 'symbols' ? 'symbols' : 'graphics';
    
    files.forEach(fileName => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        const img = document.createElement('img');
        // Предполагаем, что превью имеет суффикс _icon.png, иначе грузим оригинал
        // Если у вас в assets.js полные пути, используйте их
        const path = `assets/${folder}/${fileName}`;
        img.src = path;
        
        item.appendChild(img);
        
        item.onclick = () => {
            document.getElementById('galleryModal').classList.add('hidden');
            
            // Загружаем картинку
            loadBlobFromUrl(path, (imgObj) => {
                 if (window.galleryTarget === 'global') {
                     window.selectedSymbolObj = imgObj;
                 } else {
                     window.uploadedImageObj = imgObj; // Для графики
                 }
                 renderCanvas();
            });
        };
        grid.appendChild(item);
    });
}

window.closeGallery = function() {
    document.getElementById('galleryModal').classList.add('hidden');
};

// Загрузчик из URL в Image Object
function loadBlobFromUrl(url, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => callback(img);
    img.onerror = () => alert("Не удалось загрузить изображение");
}


// ==========================================
// 5. ТЕКСТ, ЛЕЙАУТЫ И РЕНДЕР
// ==========================================

// Слушатели ввода
els.input1.addEventListener('input', renderCanvas);
els.input2.addEventListener('input', renderCanvas);
els.input3.addEventListener('input', renderCanvas);
els.dateLine.addEventListener('input', renderCanvas);
if(els.copyright) els.copyright.addEventListener('input', renderCanvas);

// Кнопка Tt
window.toggleCase = function(rowNum) {
    const input = document.getElementById(`inputLine${rowNum}`);
    if(!input) return;
    if (input.value === input.value.toUpperCase()) {
        input.value = input.value.toLowerCase();
    } else {
        input.value = input.value.toUpperCase();
    }
    renderCanvas();
};

window.addSmartRow = function() {
    if (els.row2.classList.contains('hidden')) els.row2.classList.remove('hidden');
    else if (els.row3.classList.contains('hidden')) els.row3.classList.remove('hidden');
};

window.hideRow = function(rowNum) {
    document.getElementById(`row${rowNum}`).classList.add('hidden');
    document.getElementById(`inputLine${rowNum}`).value = '';
    renderCanvas();
};

// Шрифты
els.fontSelector.addEventListener('change', (e) => {
    currentFont = e.target.value;
    renderCanvas();
});

// Лейауты
window.setLayout = function(layoutName, el) {
    activeLayout = layoutName;
    document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    
    // Показываем/скрываем кнопки загрузки
    const btnUp = document.getElementById('btnActionUpload');
    const btnGal = document.getElementById('btnActionGallery');
    
    if(btnUp) btnUp.classList.add('hidden');
    if(btnGal) btnGal.classList.add('hidden');

    if (layoutName === 'graphic') {
        if(btnGal) btnGal.classList.remove('hidden');
    } else if (layoutName === 'photo_text' || layoutName === 'magazine') {
        if(btnUp) btnUp.classList.remove('hidden');
    }

    renderCanvas();
};


// === MAIN RENDER LOOP ===
function renderCanvas() {
    // Собираем стейт
    const state = {
        text1: els.input1.value,
        text2: !els.row2.classList.contains('hidden') ? els.input2.value : '',
        text3: !els.row3.classList.contains('hidden') ? els.input3.value : '',
        date: els.dateLine.value,
        copyright: els.copyright ? els.copyright.value : '',
        
        font: currentFont,
        layout: activeLayout,
        colors: { bg: colorBg, text: colorText },
        scale: window.textScaleMultiplier || 1,
        
        spine: window.spineState || { symbol: true, title: true, date: true },
        qrLink: window.qrDataLink || null,
        
        userImage: window.uploadedImageObj || null,
        symbolImage: window.selectedSymbolObj || null
    };

    canvas.clear();
    canvas.backgroundColor = state.colors.bg;

    // Вызываем отрисовщик (из cover-engine.js)
    if (window.drawCoverLayout) {
        window.drawCoverLayout(canvas, state);
    }
}

// ==========================================
// 6. ЗАГРУЗКА СВОИХ ФОТО И CROPPER
// ==========================================

const imgLoader = document.getElementById('imageLoader');
if(imgLoader) {
    imgLoader.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = function(f) {
            const imgObj = new Image();
            imgObj.src = f.target.result;
            imgObj.onload = function() {
                openCropper(imgObj);
            }
        };
        reader.readAsDataURL(file);
    });
}

// CROPPER LOGIC (Упрощенная)
let cropperImage = null;
function openCropper(img) {
    const modal = document.getElementById('cropperModal');
    if(modal) modal.classList.remove('hidden');
    cropperImage = img;
    // Отрисовка превью кропа...
    const cCanvas = document.getElementById('cropCanvas');
    if(cCanvas) {
        const ctx = cCanvas.getContext('2d');
        cCanvas.width = 300; cCanvas.height = 300;
        ctx.drawImage(img, 0,0, 300, 300 * (img.height/img.width));
    }
}

document.getElementById('applyCropBtn').addEventListener('click', () => {
    window.uploadedImageObj = cropperImage; // Сохраняем
    document.getElementById('cropperModal').classList.add('hidden');
    renderCanvas();
});

document.getElementById('cancelCropBtn').addEventListener('click', () => {
    document.getElementById('cropperModal').classList.add('hidden');
});

// Кнопка скачать (на всякий случай)
document.getElementById('saveBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'MALEVICH_design.jpg';
    link.href = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 3 });
    link.click();
});

// ==========================================
// 7. ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ
// ==========================================

// Слайдер масштаба текста
window.textScaleMultiplier = 1;
window.updateScaleFromSlider = function(val) {
    window.textScaleMultiplier = 0.6 + (val - 1) * 0.2;
    renderCanvas();
};
window.setScale = function(val) {
    const slider = document.getElementById('textScale');
    if(slider) slider.value = val < 1 ? 1 : 5;
    window.textScaleMultiplier = val === 0.5 ? 0.7 : 1.3;
    renderCanvas();
};

// QR
window.applyQR = function() {
    window.qrDataLink = document.getElementById('qrLinkInput').value;
    document.getElementById('qrModal').classList.add('hidden');
    renderCanvas();
};
window.removeQR = function() {
    window.qrDataLink = null;
    document.getElementById('qrModal').classList.add('hidden');
    renderCanvas();
};

// Spine
window.spineState = { symbol: true, title: true, date: true };
window.toggleSpinePart = function(part) {
    window.spineState[part] = !window.spineState[part];
    document.getElementById(
        part === 'symbol' ? 'btnSpineSymbol' : 
        part === 'title' ? 'btnSpineTitle' : 'btnSpineDate'
    ).classList.toggle('active');
    renderCanvas();
};

window.triggerAssetLoader = () => { 
    document.getElementById('imageLoader').click(); 
};

window.openMobilePreview = () => {
    document.getElementById('mobilePreview').classList.remove('hidden');
    document.getElementById('mobilePreviewImg').src = canvas.toDataURL({multiplier:2});
};
