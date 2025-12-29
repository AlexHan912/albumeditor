/* app.js - UI Controller & State Management */

let state = {
    bookSize: 30, layout: 'text_icon', ppi: 10, slotSize: { w: 6, h: 6 }, maskType: 'rect',
    text: { lines: [ { text: "", upper: false }, { text: "", upper: false }, { text: "", upper: false } ], date: "", copyright: "", font: "Tenor Sans", color: "#1a1a1a", scale: 1.0 },
    coverColor: "#FFFFFF", images: { icon: null, main: null }, 
    spine: { symbol: true, title: true, date: true },
    qr: { enabled: false, url: "" }
};

// --- BOOTSTRAP ---
window.onload = () => {
    CoverEngine.init('c');
    loadDefaultAssets();
    initColors();
    initListeners();
    setTimeout(refresh, 500);
};
window.addEventListener('resize', () => setTimeout(refresh, 100));

function refresh() {
    const res = CoverEngine.updateDimensions(document.getElementById('workspace'), state);
    if(res) updateTriggerPosition(res.triggerX, res.triggerY, res.scale);
}

function loadDefaultAssets() {
    setTimeout(() => { document.getElementById('app-loader').style.opacity = '0'; setTimeout(() => document.getElementById('app-loader').style.display='none', 800); }, 1500);
    
    // Дефолтный символ
    const defaultPath = 'assets/symbols/love_heart.png';
    const defaultPreview = 'assets/symbols/love_heart_icon.png';

    CoverEngine.loadSimpleImage(defaultPath, (url) => {
        const final = url || defaultPreview;
        if(final) {
            CoverEngine.loadSimpleImage(final, (valid) => { 
                if(valid) state.images.icon = valid; 
                finishInit(); 
            });
        } else {
            finishInit();
        }
    });
}

function finishInit() {
    updateSymbolUI();
    const defCard = document.querySelector('.layout-card[title="Текст+Символ"]') || document.querySelector('.layout-card');
    setLayout('text_icon', defCard); 
    refresh();
}

// --- UI HELPERS ---
function updateTriggerPosition(tx, ty, scale) {
    const t = document.getElementById('photoTrigger');
    
    // Логика: Триггер ("+") показываем, если выбран макет с графикой/фото, НО самой картинки нет
    const needsTrigger = (state.layout === 'graphic' || state.layout === 'photo_text' || state.layout === 'magazine') && !state.images.main;
    
    if(needsTrigger) {
        t.classList.remove('hidden');
        // Переводим координаты Canvas в координаты CSS
        const cssX = tx / scale; 
        const cssY = ty / scale;
        // Центрируем div 50x50
        t.style.left = `calc(${cssX}px - 25px)`; 
        t.style.top = `calc(${cssY}px - 25px)`;
    } else { 
        t.classList.add('hidden'); 
    }
    
    document.getElementById('debugInfo').innerText = `Print: ${state.bookSize}cm @ 300DPI`;
}

function updateSymbolUI() {
    const btn = document.getElementById('globalSymbolBtn');
    if(state.images.icon) {
        btn.style.backgroundImage = `url(${state.images.icon})`;
        btn.classList.add('active'); btn.style.borderColor = state.text.color;
    } else {
        btn.style.backgroundImage = 'none'; btn.classList.remove('active'); btn.style.borderColor = '#444';
    }
}

// --- GLOBAL ACTIONS ---
window.toggleCase = (i) => { state.text.lines[i-1].upper = !state.text.lines[i-1].upper; document.getElementById(`btnTt${i}`).classList.toggle('active'); refresh(); };
window.showRow = (i) => document.getElementById(`row${i}`).classList.remove('hidden');
window.hideRow = (i) => { document.getElementById(`row${i}`).classList.add('hidden'); document.getElementById(`inputLine${i}`).value = ''; state.text.lines[i-1].text = ''; refresh(); };

window.toggleSpinePart = (part) => {
    state.spine[part] = !state.spine[part];
    const btnMap = { 'symbol': 'btnSpineSymbol', 'title': 'btnSpineTitle', 'date': 'btnSpineDate' };
    document.getElementById(btnMap[part]).classList.toggle('active', state.spine[part]);
    refresh();
};

window.setLayout = (l, btn) => {
    const isSameMode = (state.layout === l);
    state.layout = l;
    
    document.querySelectorAll('.layout-card').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Если сменили режим - сбрасываем главную картинку, чтобы появился Плюсик
    if (!isSameMode) {
        state.images.main = null; 
    }
    
    if(l === 'magazine') state.text.font = 'Bodoni Moda';
    
    if(l === 'graphic') { 
        state.maskType = 'circle'; // Для пунктира
        // Размер слота ставим 12x12 условно для пунктира, реальный размер будет от файла
        state.slotSize = { w: 12, h: 12 }; 
        
        // ВАЖНО: Мы НЕ открываем галерею автоматически.
        // Пользователь увидит плюсик и нажмет сам.
    }
    else { 
        state.maskType = 'rect'; 
        state.slotSize = { w: 6, h: 6 }; 
    }
    refresh();
};

// Обработка клика по уже загруженной картинке (для замены)
window.handleCanvasClick = (objType) => {
    if (objType === 'mainImage') {
        if (state.layout === 'graphic') openGallery('graphics', 'main');
        else if (state.layout === 'photo_text' || state.layout === 'magazine') document.getElementById('imageLoader').click();
    }
};

window.setBookSize = (s, btn) => {
    state.bookSize = s; document.querySelectorAll('.format-card').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); refresh();
};

window.updateScaleFromSlider = (v) => { 
    state.text.scale = CONFIG.scales[v-1]; 
    refresh(); 
};
window.setScale = (s) => { 
    const idx = CONFIG.scales.indexOf(s); 
    if(idx > -1) { 
        document.getElementById('textScale').value = idx+1; 
        window.updateScaleFromSlider(idx+1); 
    } 
};

window.changeCollection = (name) => {
    const grid = document.getElementById('pairsGrid'); const custom = document.getElementById('customPickers');
    grid.innerHTML = '';
    if(name === 'Custom') { grid.classList.add('hidden'); custom.classList.remove('hidden'); return; }
    grid.classList.remove('hidden'); custom.classList.add('hidden');
    if(typeof DESIGNER_PALETTES !== 'undefined' && DESIGNER_PALETTES[name]) {
        DESIGNER_PALETTES[name].forEach(pair => {
            const btn = document.createElement('div'); btn.className = 'pair-btn'; btn.style.backgroundColor = pair.bg;
            if(pair.bg.toUpperCase() === '#FFFFFF') btn.style.border = '1px solid #ccc';
            const h = document.createElement('div'); h.className = 'pair-heart'; h.innerText = '❤'; h.style.color = pair.text;
            btn.appendChild(h); 
            btn.onclick = () => {
                state.coverColor = pair.bg; state.text.color = pair.text;
                document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateSymbolUI();
                if(state.qr.enabled) { document.getElementById('qrBtn').style.color = pair.text; document.getElementById('qrBtn').style.borderColor = pair.text; }
                refresh();
            };
            grid.appendChild(btn);
        });
        if(DESIGNER_PALETTES[name].length > 0) grid.firstChild.click();
    }
};

window.triggerAssetLoader = () => {
    if(state.layout === 'graphic') openGallery('graphics', 'main');
    else document.getElementById('imageLoader').click();
};

// --- INITIALIZERS ---
function initColors() {
    if(typeof DESIGNER_PALETTES !== 'undefined') changeCollection('Wedding Trends');
    document.getElementById('customCoverPicker').oninput = (e) => { state.coverColor = e.target.value; refresh(); };
    document.getElementById('customTextPicker').oninput = (e) => { state.text.color = e.target.value; updateSymbolUI(); refresh(); };
}

function initListeners() {
    ['inputLine1','inputLine2','inputLine3','dateLine','copyrightInput'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.oninput = () => {
            if(id === 'inputLine1') state.text.lines[0].text = el.value;
            if(id === 'inputLine2') state.text.lines[1].text = el.value;
            if(id === 'inputLine3') state.text.lines[2].text = el.value;
            if(id === 'dateLine') state.text.date = el.value;
            if(id === 'copyrightInput') state.text.copyright = el.value;
            refresh();
        };
    });
    
    document.getElementById('fontSelector').addEventListener('change', (e) => { state.text.font = e.target.value; refresh(); });
    document.getElementById('saveBtn').onclick = () => CoverEngine.download(state);

    document.getElementById('iconLoader').onchange = (e) => { 
        const r = new FileReader(); 
        r.onload = (ev) => { 
            state.images.icon = ev.target.result; 
            updateSymbolUI(); refresh(); 
            document.getElementById('galleryModal').classList.add('hidden'); 
        };
        if(e.target.files[0]) r.readAsDataURL(e.target.files[0]);
    };
    
    document.getElementById('imageLoader').onchange = (e) => {
        const r = new FileReader();
        r.onload = (ev) => { 
            document.getElementById('galleryModal').classList.add('hidden'); 
            if(state.layout === 'graphic') {
                state.images.main = { src: ev.target.result, natural: true };
                refresh();
            } else {
                document.getElementById('cropperModal').classList.remove('hidden');
                CropperTool.start(ev.target.result, state.slotSize.w, state.slotSize.h, state.maskType);
            }
        };
        if(e.target.files[0]) r.readAsDataURL(e.target.files[0]);
        e.target.value = '';
    };

    window.setCropMask = (w, h) => {
        if(w === 'circle') { state.slotSize = { w: 6, h: 6 }; state.maskType = 'circle'; }
        else { state.slotSize = { w: w, h: h }; state.maskType = 'rect'; }
        CropperTool.maskType = state.maskType;
        CropperTool.drawOverlay(state.slotSize.w, state.slotSize.h);
    };
    document.getElementById('applyCropBtn').onclick = () => {
        state.images.main = CropperTool.apply();
        refresh();
        document.getElementById('cropperModal').classList.add('hidden');
    };
    document.getElementById('cancelCropBtn').onclick = () => document.getElementById('cropperModal').classList.add('hidden');
}

// --- GALLERY ---
window.openGallery = (type, target) => {
    document.getElementById('globalSymbolBtn').classList.remove('pulse-attention');
    document.getElementById('galleryModal').classList.remove('hidden');
    const upBtn = document.getElementById('galUploadBtn');
    
    const galTitle = document.getElementById('galleryTitle');
    let db;
    if(type === 'symbols') {
        db = ASSETS_DB.symbols;
        galTitle.innerText = "Галерея символов";
        upBtn.innerText = "Загрузить свой символ"; 
        upBtn.onclick = () => document.getElementById('iconLoader').click();
    } else {
        db = ASSETS_DB.graphics;
        galTitle.innerText = "Галерея графики";
        upBtn.innerText = "Загрузить свою графику"; 
        upBtn.onclick = () => document.getElementById('imageLoader').click();
    }
    
    const tabs = document.getElementById('galleryTabs'); tabs.innerHTML = '';
    if(!db) return;
    
    Object.keys(db).forEach((cat, i) => {
        const t = document.createElement('div'); t.className = `gallery-tab ${i===0?'active':''}`; t.innerText = cat;
        t.onclick = () => { document.querySelectorAll('.gallery-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); loadGal(type, cat, target); };
        tabs.appendChild(t);
    });
    if(Object.keys(db).length) loadGal(type, Object.keys(db)[0], target);
};

function loadGal(type, cat, target) {
    const grid = document.getElementById('galleryGrid'); grid.innerHTML = '';
    let files = (type === 'symbols' ? ASSETS_DB.symbols[cat] : ASSETS_DB.graphics[cat]) || [];
    
    files.forEach(f => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        const img = document.createElement('img');
        
        const folder = (type === 'symbols') ? 'symbols' : 'graphics';
        const previewName = f.replace('.png', '_icon.png');
        const previewUrl = `assets/${folder}/${previewName}`;
        const printUrl = `assets/${folder}/${f}`;
        
        img.src = previewUrl;
        img.onerror = () => {
            item.classList.add('broken-file');
            item.title = "Ошибка: Нет файла иконки";
        };

        const checkPrint = new Image();
        checkPrint.src = printUrl;
        checkPrint.onerror = () => {
            item.classList.add('broken-file');
            item.title = "Ошибка: Нет файла для печати";
        };

        item.appendChild(img);
        
        item.onclick = () => {
            if (item.classList.contains('broken-file')) {
                alert("Файл отсутствует.");
                return;
            }
            CoverEngine.loadSimpleImage(printUrl, (final) => {
                final = final || previewUrl;
                document.getElementById('galleryModal').classList.add('hidden');
                
                if(target === 'global') { 
                    state.images.icon = final; updateSymbolUI(); refresh(); 
                }
                else if(type === 'graphics') { 
                    state.images.main = { src: final, natural: true }; 
                    refresh(); 
                }
            });
        };
        grid.appendChild(item);
    });
}
window.closeGallery = () => document.getElementById('galleryModal').classList.add('hidden');
window.handleGalleryUpload = () => {}; 

window.openQRModal = () => document.getElementById('qrModal').classList.remove('hidden');
window.applyQR = () => { state.qr.enabled = true; state.qr.url = document.getElementById('qrLinkInput').value; document.getElementById('qrModal').classList.add('hidden'); refresh(); };
window.removeQR = () => { state.qr.enabled = false; document.getElementById('qrModal').classList.add('hidden'); refresh(); };
