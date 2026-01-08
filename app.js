/* app.js - FAILSAFE VERSION (Loader will always hide) */

// 1. Глобальное состояние
let state = {
    bookSize: 30, layout: 'text_icon', ppi: 10, slotSize: { w: 6, h: 6 }, maskType: 'rect',
    text: { 
        lines: [ { text: "THE VISUAL DIARY", upper: true }, { text: "", upper: false }, { text: "", upper: false } ], 
        date: "", copyright: "", font: "Tenor Sans", color: "#1a1a1a", scale: 1.0 
    },
    coverColor: "#FFFFFF", images: { icon: null, main: null }, 
    spine: { symbol: true, title: true, date: true },
    qr: { enabled: false, url: "" }
};

let userModifiedText = false;

// ==========================================
// ГАРАНТИРОВАННОЕ УДАЛЕНИЕ ЗАСТАВКИ
// ==========================================
// Этот код сработает, даже если всё остальное сломается
setTimeout(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}, 1500);

// ==========================================
// ОСНОВНОЙ ЗАПУСК
// ==========================================
window.onload = () => {
    console.log("App starting...");

    try {
        // Проверка движка
        if(window.CoverEngine) {
            CoverEngine.init('c');
        } else {
            console.error("CoverEngine not loaded!");
            alert("Ошибка: CoverEngine не найден. Проверьте файлы.");
        }

        // Чтение параметров из ссылки
        const urlParams = new URLSearchParams(window.location.search);
        
        // Авто-год
        const currentYear = new Date().getFullYear().toString();
        state.text.date = currentYear;
        const dateInput = document.getElementById('dateLine');
        if(dateInput) dateInput.value = currentYear;

        // Если передано имя в ссылке — заполняем
        const nameFromUrl = urlParams.get('name');
        if(nameFromUrl) {
           // Декодируем и ставим в верхний регистр
           state.text.lines[0].text = nameFromUrl.toUpperCase();
           const inp = document.getElementById('inputLine1');
           if(inp) inp.value = nameFromUrl.toUpperCase();
        }

        // Загрузка ресурсов
        loadDefaultAssets();
        initColors();
        initListeners();
        initMobilePreview(); 
        
        // Синхронизация UI
        const input1 = document.getElementById('inputLine1');
        if (input1 && input1.value === "") input1.value = "THE VISUAL DIARY";
        if(state.text.lines[0].upper) document.getElementById('btnTt1').classList.add('active');

        // Отрисовка
        setTimeout(() => {
            refresh();
            checkOrientation();
            updateActionButtons();
        }, 500);

    } catch (e) {
        console.error("Critical Error:", e);
        // Если случилась критическая ошибка, покажем её
        // alert("Ошибка запуска: " + e.message);
    }
};

window.addEventListener('resize', () => {
    if (document.activeElement.tagName === 'INPUT') return;
    setTimeout(() => {
        refresh();
        checkOrientation();
    }, 100);
});

function refresh() {
    if(window.CoverEngine) {
        CoverEngine.updateDimensions(document.getElementById('workspace'), state);
    }
}

function loadDefaultAssets() {
    // Загрузка дефолтного сердца
    const defaultPath = 'assets/symbols/love_heart.png';
    const defaultPreview = 'assets/symbols/love_heart_icon.png';
    
    if(window.CoverEngine) {
        CoverEngine.loadSimpleImage(defaultPath, (url) => {
            const final = url || defaultPreview;
            if(final) {
                CoverEngine.loadSimpleImage(final, (valid) => { if(valid) state.images.icon = valid; finishInit(); });
            } else { finishInit(); }
        });
    } else { finishInit(); }
}

function finishInit() {
    updateSymbolUI();
    const defCard = document.querySelector('.layout-card[title="Текст+Символ"]') || document.querySelector('.layout-card');
    if(defCard) setLayout('text_icon', defCard); 
    refresh();
}

// ==========================================
// ЛОГИКА ТЕЛЕГРАМА
// ==========================================
window.sendToTelegram = function() {
    const btn = document.getElementById('sendTgBtn');
    const originalText = btn.innerText;
    
    // Читаем параметры
    const urlParams = new URLSearchParams(window.location.search);
    const orderData = {
        orderId: urlParams.get('order_id') || 'Без номера',
        clientName: urlParams.get('name') || 'Не указано',
        clientPhone: urlParams.get('phone') || 'Не указан'
    };

    btn.innerText = "ОТПРАВКА...";
    btn.style.opacity = "0.7";
    btn.disabled = true;

    if(!window.CoverEngine || !CoverEngine.canvas) {
        alert("Ошибка: Холст не инициализирован");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    // Рендер картинки
    const dataUrl = CoverEngine.canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 2.5 });
    const base64Clean = dataUrl.replace(/^data:image\/\w+;base64,/, "");

    // Отправка
    fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageBase64: base64Clean,
            orderId: orderData.orderId,
            clientName: orderData.clientName,
            clientPhone: orderData.clientPhone
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`✅ Заказ #${orderData.orderId} успешно отправлен!`);
        } else {
            alert("Ошибка отправки: " + (data.error || "Неизвестная ошибка"));
        }
    })
    .catch(error => {
        alert("Ошибка сети. Проверьте соединение.");
    })
    .finally(() => {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.disabled = false;
    });
};

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Цвета, Галереи и т.д.)
// ==========================================

function initColors() {
    const collectionName = 'Kinfolk - Cinema';
    const selector = document.getElementById('paletteSelector');
    if(selector) selector.value = collectionName;

    if(window.DESIGNER_PALETTES && window.DESIGNER_PALETTES[collectionName]) {
        changeCollection(collectionName);
        const palette = window.DESIGNER_PALETTES[collectionName];
        const randomIdx = Math.floor(Math.random() * palette.length);
        setTimeout(() => {
            const btns = document.querySelectorAll('#pairsGrid .pair-btn');
            if (btns[randomIdx]) btns[randomIdx].click();
        }, 100);
    }
    
    const bgPicker = document.getElementById('customCoverPicker');
    const textPicker = document.getElementById('customTextPicker');
    if(bgPicker) bgPicker.oninput = (e) => { state.coverColor = e.target.value; refresh(); };
    if(textPicker) textPicker.oninput = (e) => { state.text.color = e.target.value; updateSymbolUI(); refresh(); };
}

window.changeCollection = (name) => { 
    const grid = document.getElementById('pairsGrid'); 
    const custom = document.getElementById('customPickers'); 
    grid.innerHTML = ''; 
    
    if(name === 'Custom') { 
        grid.classList.add('hidden'); 
        custom.classList.remove('hidden'); 
        return; 
    } 
    grid.classList.remove('hidden'); 
    custom.classList.add('hidden'); 
    
    const palette = (window.DESIGNER_PALETTES && window.DESIGNER_PALETTES[name]) || [];
    
    palette.forEach(pair => { 
        const btn = document.createElement('div'); 
        btn.className = 'pair-btn'; 
        btn.style.backgroundColor = pair.bg; 
        if(pair.bg.toLowerCase() === '#ffffff') btn.style.border = '1px solid #ccc'; 
        
        const h = document.createElement('div'); 
        h.className = 'pair-heart'; 
        h.innerText = '❤'; 
        h.style.color = pair.text; 
        btn.appendChild(h); 
        
        btn.onclick = () => { 
            state.coverColor = pair.bg; 
            state.text.color = pair.text; 
            document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active')); 
            btn.classList.add('active'); 
            updateSymbolUI(); 
            if(state.qr.enabled) { 
                const qrBtn = document.getElementById('qrBtn');
                if(qrBtn) { qrBtn.style.color = pair.text; qrBtn.style.borderColor = pair.text; }
            } 
            refresh(); 
        }; 
        grid.appendChild(btn); 
    }); 
    
    if(palette.length > 0 && grid.firstChild) grid.firstChild.click(); 
};

window.openGallery = (type, target) => {
    document.getElementById('globalSymbolBtn').classList.remove('pulse-attention');
    document.getElementById('galleryModal').classList.remove('hidden');
    const upBtn = document.getElementById('galUploadBtn');
    const galTitle = document.getElementById('galleryTitle');
    
    const DB = window.ASSETS_DB || {};
    let dbSection;

    if(type === 'symbols') {
        dbSection = DB.symbols; 
        galTitle.innerText = "Галерея символов";
        upBtn.innerText = "Загрузить свой символ"; 
        upBtn.onclick = () => document.getElementById('iconLoader').click();
    } else {
        dbSection = DB.graphics; 
        galTitle.innerText = "Галерея графики";
        upBtn.innerText = "Загрузить свою графику"; 
        upBtn.onclick = () => document.getElementById('imageLoader').click();
    }

    const tabs = document.getElementById('galleryTabs'); tabs.innerHTML = '';
    if(!dbSection) return;

    Object.keys(dbSection).forEach((cat, i) => {
        const t = document.createElement('div'); t.className = `gallery-tab ${i===0?'active':''}`; t.innerText = cat;
        t.onclick = () => { document.querySelectorAll('.gallery-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); loadGal(type, cat, target); };
        tabs.appendChild(t);
    });
    if(Object.keys(dbSection).length) loadGal(type, Object.keys(dbSection)[0], target);
};

function loadGal(type, cat, target) {
    const grid = document.getElementById('galleryGrid'); grid.innerHTML = '';
    const DB = window.ASSETS_DB || {};
    let files = (type === 'symbols' ? DB.symbols[cat] : DB.graphics[cat]) || [];
    const folder = (type === 'symbols') ? 'symbols' : 'graphics';
    
    files.forEach(f => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        const img = document.createElement('img');
        const previewName = f.includes('_icon') ? f : f.replace('.png', '_icon.png');
        const previewUrl = `assets/${folder}/${previewName}`;
        const printUrl = `assets/${folder}/${f}`;
        img.src = previewUrl;
        img.onerror = () => { img.src = printUrl; };
        item.appendChild(img);
        item.onclick = () => {
            if(window.CoverEngine) {
                CoverEngine.loadSimpleImage(printUrl, (final) => {
                    final = final || previewUrl;
                    document.getElementById('galleryModal').classList.add('hidden');
                    if(target === 'global') { state.images.icon = final; updateSymbolUI(); refresh(); }
                    else if(type === 'graphics') { state.images.main = { src: final, natural: true }; refresh(); updateActionButtons(); }
                });
            }
        };
        grid.appendChild(item);
    });
}

window.updateActionButtons = () => {
    const btnGallery = document.getElementById('btnActionGallery');
    const btnUpload = document.getElementById('btnActionUpload');
    if(!btnGallery || !btnUpload) return;
    btnGallery.classList.add('hidden');
    btnUpload.classList.add('hidden');
    if (state.layout === 'graphic') btnGallery.classList.remove('hidden');
    else if (state.layout === 'photo_text' || state.layout === 'magazine') btnUpload.classList.remove('hidden');
};

window.closeGallery = () => document.getElementById('galleryModal').classList.add('hidden');
window.handleGalleryUpload = () => {}; 
window.openQRModal = () => document.getElementById('qrModal').classList.remove('hidden');
window.applyQR = () => { state.qr.enabled = true; state.qr.url = document.getElementById('qrLinkInput').value; document.getElementById('qrModal').classList.add('hidden'); refresh(); };
window.removeQR = () => { state.qr.enabled = false; document.getElementById('qrModal').classList.add('hidden'); refresh(); };

function initListeners() {
    ['inputLine1','inputLine2','inputLine3','dateLine','copyrightInput'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.oninput = () => {
                userModifiedText = true;
                if(id === 'inputLine1') state.text.lines[0].text = el.value;
                if(id === 'inputLine2') state.text.lines[1].text = el.value;
                if(id === 'inputLine3') state.text.lines[2].text = el.value;
                if(id === 'dateLine') state.text.date = el.value;
                if(id === 'copyrightInput') state.text.copyright = el.value;
                refresh();
            };
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
        }
    });
    
    const fontSel = document.getElementById('fontSelector');
    if(fontSel) fontSel.addEventListener('change', (e) => { state.text.font = e.target.value; refresh(); });
    
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.onclick = () => { if(window.CoverEngine) CoverEngine.download(state); };

    const iconLoader = document.getElementById('iconLoader');
    if(iconLoader) iconLoader.onchange = (e) => { 
        if(e.target.files[0]) {
            processAndResizeImage(e.target.files[0], 500, 'image/png', (resizedUrl) => {
                state.images.icon = resizedUrl; updateSymbolUI(); refresh(); document.getElementById('galleryModal').classList.add('hidden'); 
            });
        }
    };
    
    const imageLoader = document.getElementById('imageLoader');
    if(imageLoader) imageLoader.onchange = (e) => {
        if(e.target.files[0]) {
            let limit = 2500; let type = 'image/jpeg';
            if (state.layout === 'graphic') { limit = 1417; type = 'image/png'; }
            processAndResizeImage(e.target.files[0], limit, type, (resizedUrl) => {
                document.getElementById('galleryModal').classList.add('hidden'); 
                if(state.layout === 'graphic') {
                    state.images.main = { src: resizedUrl, natural: true };
                    refresh();
                    updateActionButtons();
                } else {
                    document.getElementById('cropperModal').classList.remove('hidden');
                    updateCropperUI();
                    if(state.layout === 'photo_text') { state.slotSize = { w: 6, h: 6 }; }
                    if (state.layout === 'magazine') { CropperTool.start(resizedUrl, 1, 1, 'rect'); } 
                    else { CropperTool.start(resizedUrl, state.slotSize.w, state.slotSize.h, state.maskType); }
                }
            });
        }
        e.target.value = '';
    };

    window.setCropMask = (w, h) => {
        if(w === 'circle') { state.slotSize = { w: 6, h: 6 }; state.maskType = 'circle'; } 
        else { state.slotSize = { w: w, h: h }; state.maskType = 'rect'; }
        CropperTool.maskType = state.maskType;
        CropperTool.drawOverlay(state.slotSize.w, state.slotSize.h);
    };
    
    const applyCrop = document.getElementById('applyCropBtn');
    if(applyCrop) applyCrop.onclick = () => {
        state.images.main = CropperTool.apply(); refresh(); document.getElementById('cropperModal').classList.add('hidden'); updateActionButtons();
    };
    const rotBtn = document.getElementById('rotateBtn');
    if(rotBtn) { rotBtn.onclick = () => CropperTool.rotate(); }
    const cancelCrop = document.getElementById('cancelCropBtn');
    if(cancelCrop) cancelCrop.onclick = () => document.getElementById('cropperModal').classList.add('hidden');
}

function processAndResizeImage(file, maxSize, outputType, callback) {
    if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        if(window.heic2any) {
            heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 }).then((res) => {
                const blob = Array.isArray(res) ? res[0] : res;
                const newFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
                processAndResizeImage(newFile, maxSize, outputType, callback);
            }).catch((e) => { alert("HEIC Error"); });
            return;
        }
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width; let height = img.height;
            if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
            else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL(outputType, 0.9));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateSymbolUI() {
    const btn = document.getElementById('globalSymbolBtn');
    if(state.images.icon) { btn.style.backgroundImage = `url(${state.images.icon})`; btn.classList.add('active'); btn.style.borderColor = state.text.color; } 
    else { btn.style.backgroundImage = 'none'; btn.classList.remove('active'); btn.style.borderColor = '#444'; }
}

function updateCropperUI() {
