/* app.js - UI Controller & State Management V70 */

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
    initColors();
    initListeners();
    initMobilePreview(); 
    
    const input1 = document.getElementById('inputLine1');
    if (input1) input1.value = "THE VISUAL DIARY";
    
    setTimeout(() => {
        refresh();
        checkOrientation();
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

// --- GALLERY LOGIC (REVERTED TO FLAT STRUCTURE V70) ---
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
    
    // V70 FIX: Use simple paths
    const folder = (type === 'symbols') ? 'symbols' : 'graphics';
    
    files.forEach(f => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        const img = document.createElement('img');
        
        const previewName = f.replace('.png', '_icon.png');
        const previewUrl = `assets/${folder}/${previewName}`;
        const printUrl = `assets/${folder}/${f}`;
        
        img.src = previewUrl;
        img.onerror = () => { item.classList.add('broken-file'); item.title = "Ошибка: Нет файла иконки"; };

        const checkPrint = new Image();
        checkPrint.src = printUrl;
        checkPrint.onerror = () => { item.classList.add('broken-file'); item.title = "Ошибка: Нет файла для печати"; };

        item.appendChild(img);
        
        item.onclick = () => {
            if (item.classList.contains('broken-file')) { alert("Файл отсутствует."); return; }
            
            if(type === 'graphics' && !userModifiedText) {
                state.text.lines[0].text = "";
                state.text.lines[1].text = "";
                document.getElementById('inputLine1').value = "";
                document.getElementById('inputLine2').value = "";
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
                
                if (!userModifiedText && (state.layout === 'magazine' || state.layout === 'photo_text' || state.layout === 'graphic')) {
                    state.text.lines[0].text = ""; state.text.lines[1].text = "";
                    document.getElementById('inputLine1').value = ""; document.getElementById('inputLine2').value = "";
                }

                if(state.layout === 'graphic') {
                    state.images.main = { src: resizedUrl, natural: true };
                    refresh();
                } else {
                    document.getElementById('cropperModal').classList.remove('hidden');
                    updateCropperUI();
                    
                    if(state.layout === 'photo_text') {
                        state.slotSize = { w: 6, h: 6 };
                    }

                    if (state.layout === 'magazine') {
                        CropperTool.start(resizedUrl, 1, 1, 'rect'); 
                    } else {
                        CropperTool.start(resizedUrl, state.slotSize.w, state.slotSize.h, state.maskType);
                    }
                }
            });
        }
        e.target.value = '';
    };

    // FIX: Update state dimensions when mask is chosen (with cm units)
    window.setCropMask = (w, h) => {
        if(w === 'circle') { 
            state.slotSize = { w: 6, h: 6 }; 
            state.maskType = 'circle'; 
        } else { 
            state.slotSize = { w: w, h: h }; 
            state.maskType = 'rect'; 
        }
        CropperTool.maskType = state.maskType;
        CropperTool.drawOverlay(state.slotSize.w, state.slotSize.h);
    };
    
    document.getElementById('applyCropBtn').onclick = () => {
        state.images.main = CropperTool.apply();
        refresh();
        document.getElementById('cropperModal').classList.add('hidden');
    };
    
    const rotBtn = document.getElementById('rotateBtn');
    if(rotBtn) { rotBtn.onclick = () => CropperTool.rotate(); }

    document.getElementById('cancelCropBtn').onclick = () => document.getElementById('cropperModal').classList.add('hidden');
}

// ... Mobile Preview ...
function initMobilePreview() {
    const modal = document.getElementById('mobilePreview');
    const container = document.getElementById('panzoomContainer');
    const closeBtn = document.getElementById('closePreviewBtn');
    if(window.Panzoom && container) {
        panzoomInstance = Panzoom(container, { maxScale: 4, minScale: 0.8, contain: 'outside' });
        container.parentElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);
    }
    if (closeBtn) {
        closeBtn.onclick = (e) => { e.stopPropagation(); closeMobilePreview(); };
    }
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
    if (window.innerWidth > 1024 && window.innerHeight > 800) return; 
    const modal = document.getElementById('mobilePreview');
    const img = document.getElementById('mobilePreviewImg');
    const dataUrl = CoverEngine.canvas.toDataURL({ format: 'png', multiplier: 2.5 });
    img.src = dataUrl;
    modal.classList.remove('hidden');
    if(panzoomInstance) { setTimeout(() => { panzoomInstance.reset(); panzoomInstance.zoom(1, { animate: false }); }, 50); }
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
