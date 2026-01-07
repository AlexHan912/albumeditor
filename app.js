/* app.js - UI Controller & State Management V80 */

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
let panzoomInstance = null; 

window.onload = () => {
    CoverEngine.init('c');
    loadDefaultAssets();
    
    // Auto Year
    const currentYear = new Date().getFullYear().toString();
    state.text.date = currentYear;
    const dateInput = document.getElementById('dateLine');
    if(dateInput) dateInput.value = currentYear;

    initColors();
    initListeners();
    initMobilePreview(); 
    
    const input1 = document.getElementById('inputLine1');
    if (input1) input1.value = "THE VISUAL DIARY";
    
    if(state.text.lines[0].upper) document.getElementById('btnTt1').classList.add('active');
    
    setTimeout(() => {
        refresh();
        checkOrientation();
        updateActionButtons();
    }, 500);
};

window.addEventListener('resize', () => {
    if (document.activeElement.tagName === 'INPUT') return;
    setTimeout(() => {
        refresh();
        checkOrientation();
    }, 100);
});

function refresh() {
    CoverEngine.updateDimensions(document.getElementById('workspace'), state);
}

function loadDefaultAssets() {
    setTimeout(() => { document.getElementById('app-loader').style.opacity = '0'; setTimeout(() => document.getElementById('app-loader').style.display='none', 800); }, 1500);
    const defaultPath = 'assets/symbols/love_heart.png';
    const defaultPreview = 'assets/symbols/love_heart_icon.png';
    CoverEngine.loadSimpleImage(defaultPath, (url) => {
        const final = url || defaultPreview;
        if(final) {
            CoverEngine.loadSimpleImage(final, (valid) => { if(valid) state.images.icon = valid; finishInit(); });
        } else { finishInit(); }
    });
}

function finishInit() {
    updateSymbolUI();
    const defCard = document.querySelector('.layout-card[title="Текст+Символ"]') || document.querySelector('.layout-card');
    setLayout('text_icon', defCard); 
    refresh();
}

// Random Color from Kinfolk
function initColors() {
    const collectionName = 'Kinfolk - Cinema';
    
    // FIX V80: Set Dropdown Value
    const selector = document.getElementById('paletteSelector');
    if(selector) selector.value = collectionName;

    if(typeof DESIGNER_PALETTES !== 'undefined' && DESIGNER_PALETTES[collectionName]) {
        changeCollection(collectionName);
        const palette = DESIGNER_PALETTES[collectionName];
        const randomIdx = Math.floor(Math.random() * palette.length);
        const btns = document.querySelectorAll('#pairsGrid .pair-btn');
        if (btns[randomIdx]) btns[randomIdx].click();
    }
    
    const bgPicker = document.getElementById('customCoverPicker');
    const textPicker = document.getElementById('customTextPicker');
    if(bgPicker) bgPicker.oninput = (e) => { state.coverColor = e.target.value; refresh(); };
    if(textPicker) textPicker.oninput = (e) => { state.text.color = e.target.value; updateSymbolUI(); refresh(); };
}

function updateActionButtons() {
    const btnGallery = document.getElementById('btnActionGallery');
    const btnUpload = document.getElementById('btnActionUpload');
    btnGallery.classList.add('hidden');
    btnUpload.classList.add('hidden');
    
    // Always show action buttons for relevant layouts (even if image exists)
    if (state.layout === 'graphic') btnGallery.classList.remove('hidden');
    else if (state.layout === 'photo_text' || state.layout === 'magazine') btnUpload.classList.remove('hidden');
}

window.openGallery = (type, target) => {
    document.getElementById('globalSymbolBtn').classList.remove('pulse-attention');
    document.getElementById('galleryModal').classList.remove('hidden');
    const upBtn = document.getElementById('galUploadBtn');
    const galTitle = document.getElementById('galleryTitle');
    let db;
    if(type === 'symbols') {
        db = ASSETS_DB.symbols; galTitle.innerText = "Галерея символов";
        upBtn.innerText = "Загрузить свой символ"; 
        upBtn.onclick = () => document.getElementById('iconLoader').click();
    } else {
        db = ASSETS_DB.graphics; galTitle.innerText = "Галерея графики";
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
    const folder = (type === 'symbols') ? 'symbols' : 'graphics';
    files.forEach(f => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        const img = document.createElement('img');
        const previewName = f.replace('.png', '_icon.png');
        const previewUrl = `assets/${folder}/${previewName}`;
        const printUrl = `assets/${folder}/${f}`;
        img.src = previewUrl;
        img.onerror = () => { item.classList.add('broken-file'); item.title = "Файл не найден"; };
        item.appendChild(img);
        item.onclick = () => {
            if (item.classList.contains('broken-file')) { alert("Файл отсутствует."); return; }
            CoverEngine.loadSimpleImage(printUrl, (final) => {
                final = final || previewUrl;
                document.getElementById('galleryModal').classList.add('hidden');
                if(target === 'global') { state.images.icon = final; updateSymbolUI(); refresh(); }
                else if(type === 'graphics') { state.images.main = { src: final, natural: true }; refresh(); updateActionButtons(); }
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

function initListeners() {
    ['inputLine1','inputLine2','inputLine3','dateLine','copyrightInput'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.oninput = () => {
            userModifiedText = true;
            if(id === 'inputLine1') state.text.lines[0].text = el.value;
            if(id === 'inputLine2') state.text.lines[1].text = el.value;
            if(id === 'inputLine3') state.text.lines[2].text = el.value;
            if(id === 'dateLine') state.text.date = el.value;
            if(id === 'copyrightInput') state.text.copyright = el.value;
            refresh();
        };

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });

        el.addEventListener('focus', () => {
            if (window.innerWidth < 900) {
                document.body.classList.add('keyboard-open');
                setTimeout(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); 
            }
        });

        el.addEventListener('blur', () => {
            if (window.innerWidth < 900) {
                setTimeout(() => {
                    if (document.activeElement.tagName !== 'INPUT') {
                        document.body.classList.remove('keyboard-open');
                        refresh();
                        checkOrientation();
                    }
                }, 100);
            }
        });
    });
    
    document.getElementById('fontSelector').addEventListener('change', (e) => { state.text.font = e.target.value; refresh(); });
    document.getElementById('saveBtn').onclick = () => CoverEngine.download(state);

    document.getElementById('iconLoader').onchange = (e) => { 
        if(e.target.files[0]) {
            processAndResizeImage(e.target.files[0], 500, 'image/png', (resizedUrl) => {
                state.images.icon = resizedUrl; 
                updateSymbolUI(); refresh(); 
                document.getElementById('galleryModal').classList.add('hidden'); 
            });
        }
    };
    
    document.getElementById('imageLoader').onchange = (e) => {
        if(e.target.files[0]) {
            let limit = 2500;
            let type = 'image/jpeg';
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
    
    document.getElementById('applyCropBtn').onclick = () => {
        state.images.main = CropperTool.apply();
        refresh();
        document.getElementById('cropperModal').classList.add('hidden');
        updateActionButtons();
    };
    const rotBtn = document.getElementById('rotateBtn');
    if(rotBtn) { rotBtn.onclick = () => CropperTool.rotate(); }
    document.getElementById('cancelCropBtn').onclick = () => document.getElementById('cropperModal').classList.add('hidden');
}

function initMobilePreview() {
    const modal = document.getElementById('mobilePreview');
    const container = document.getElementById('panzoomContainer');
    const closeBtn = document.getElementById('closePreviewBtn');
    
    // FIX V80: Apply Panzoom to the container inside the wrapper
    if(window.Panzoom && container) {
        panzoomInstance = Panzoom(container, {
            maxScale: 4,
            minScale: 0.8,
            contain: null, 
            canvas: true 
        });
        container.parentElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);
    }
    
    if (closeBtn) {
        closeBtn.onclick = (e) => { e.stopPropagation(); closeMobilePreview(); };
    }

    document.getElementById('btnZoomIn').onclick = (e) => { e.stopPropagation(); panzoomInstance.zoomIn(); };
    document.getElementById('btnZoomOut').onclick = (e) => { e.stopPropagation(); panzoomInstance.zoomOut(); };
    
    // FIX V80: Reset Zoom AND Position to Center
    document.getElementById('btnZoomFit').onclick = (e) => { 
        e.stopPropagation(); 
        panzoomInstance.zoom(1, { animate: true });
        panzoomInstance.pan(0, 0, { animate: true });
    };
}

function checkOrientation() {
    if (document.activeElement.tagName === 'INPUT' || document.body.classList.contains('keyboard-open')) return;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
    if (isMobileDevice) {
        if (window.innerWidth > window.innerHeight) {
            if (document.getElementById('mobilePreview').classList.contains('hidden')) openMobilePreview();
        } else { closeMobilePreview(); }
    }
}
window.openMobilePreview = () => {
    const modal = document.getElementById('mobilePreview');
    const img = document.getElementById('mobilePreviewImg');
    const dataUrl = CoverEngine.canvas.toDataURL({ format: 'png', multiplier: 2.5 });
    img.src = dataUrl;
    modal.classList.remove('hidden');
    if(panzoomInstance) { 
        setTimeout(() => { 
            panzoomInstance.reset(); 
            // Force Center on Open
            panzoomInstance.zoom(1, { animate: false });
            panzoomInstance.pan(0, 0, { animate: false });
        }, 50); 
    }
};
window.closeMobilePreview = () => { document.getElementById('mobilePreview').classList.add('hidden'); };
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
    const controls = document.querySelector('.crop-controls');
    if (state.layout === 'magazine') controls.style.display = 'none'; else controls.style.display = 'flex'; 
}
window.toggleCase = (i) => { state.text.lines[i-1].upper = !state.text.lines[i-1].upper; document.getElementById(`btnTt${i}`).classList.toggle('active'); refresh(); };
window.showRow = (i) => document.getElementById(`row${i}`).classList.remove('hidden');
window.hideRow = (i) => { document.getElementById(`row${i}`).classList.add('hidden'); document.getElementById(`inputLine${i}`).value = ''; state.text.lines[i-1].text = ''; refresh(); };
window.toggleSpinePart = (part) => { state.spine[part] = !state.spine[part]; document.getElementById('btnSpine'+part.charAt(0).toUpperCase()+part.slice(1)).classList.toggle('active', state.spine[part]); refresh(); };
window.setLayout = (l, btn) => { 
    const isSame = state.layout===l; 
    state.layout=l; 
    document.querySelectorAll('.layout-card').forEach(b=>b.classList.remove('active')); 
    btn.classList.add('active'); 
    if(!isSame) state.images.main=null; 
    if(l==='magazine') state.maskType='rect'; 
    else if(l==='graphic') { state.maskType='rect'; state.slotSize={w:12,h:12}; } 
    else { state.maskType='rect'; state.slotSize={w:6,h:6}; } 
    refresh(); 
    updateActionButtons(); 
};
window.handleCanvasClick = (objType) => { if (objType === 'mainImage' || objType === 'placeholder') { if (state.layout === 'graphic') openGallery('graphics', 'main'); else if (state.layout === 'photo_text' || state.layout === 'magazine') document.getElementById('imageLoader').click(); } };
window.setBookSize = (s, btn) => { state.bookSize = s; document.querySelectorAll('.format-card').forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (state.layout === 'magazine') state.slotSize = { w: s, h: s }; refresh(); };
window.updateScaleFromSlider = (v) => { state.text.scale = CONFIG.scales[v-1]; refresh(); };
window.setScale = (s) => { const idx = CONFIG.scales.indexOf(s); if(idx > -1) { document.getElementById('textScale').value = idx+1; window.updateScaleFromSlider(idx+1); } };
window.changeCollection = (name) => { const grid = document.getElementById('pairsGrid'); const custom = document.getElementById('customPickers'); grid.innerHTML = ''; if(name === 'Custom') { grid.classList.add('hidden'); custom.classList.remove('hidden'); return; } grid.classList.remove('hidden'); custom.classList.add('hidden'); if(typeof DESIGNER_PALETTES !== 'undefined' && DESIGNER_PALETTES[name]) { DESIGNER_PALETTES[name].forEach(pair => { const btn = document.createElement('div'); btn.className = 'pair-btn'; btn.style.backgroundColor = pair.bg; if(pair.bg.toUpperCase() === '#FFFFFF') btn.style.border = '1px solid #ccc'; const h = document.createElement('div'); h.className = 'pair-heart'; h.innerText = '❤'; h.style.color = pair.text; btn.appendChild(h); btn.onclick = () => { state.coverColor = pair.bg; state.text.color = pair.text; document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); updateSymbolUI(); if(state.qr.enabled) { document.getElementById('qrBtn').style.color = pair.text; document.getElementById('qrBtn').style.borderColor = pair.text; } refresh(); }; grid.appendChild(btn); }); if(DESIGNER_PALETTES[name].length > 0) grid.firstChild.click(); } };
window.triggerAssetLoader = () => { if(state.layout === 'graphic') openGallery('graphics', 'main'); else document.getElementById('imageLoader').click(); };
