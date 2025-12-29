/* cover-engine.js - Logic for Rendering & Cropping */

const CONFIG = {
    dpi: 300, cmToInch: 2.54, spineWidthCm: 1.5, renderScale: 3.0,
    globalOpacity: 1.0, 
    typo: { baseTitle: 1.2, baseDetails: 0.5, baseCopy: 0.35 },
    scales: [0.7, 0.9, 1.1, 1.3]
};

const CoverEngine = {
    canvas: null,
    
    init: function(canvasId) {
        this.canvas = new fabric.Canvas(canvasId, { backgroundColor: '#fff', selection: false, enableRetinaScaling: false });
        this.canvas.on('mouse:down', (e) => {
            if(e.target) {
                if(e.target.isMain || e.target.isPlaceholder) {
                    if(window.handleCanvasClick) window.handleCanvasClick(e.target.isMain ? 'mainImage' : 'placeholder');
                }
            }
        });
    },

    loadSimpleImage: function(path, callback) {
        const img = new Image();
        img.onload = () => callback(path);
        img.onerror = () => { callback(null); };
        img.src = path;
    },

    updateDimensions: function(container, state) {
        if(!container || container.clientWidth === 0) return;
        const margin = 20; 
        const bookSize = parseFloat(state.bookSize);
        const maxBookW = bookSize*2 + CONFIG.spineWidthCm; 
        const maxBookH = bookSize;
        const basePPI = Math.max(5, Math.min((container.clientWidth - margin*2) / maxBookW, (container.clientHeight - margin*2) / maxBookH));
        state.ppi = basePPI * CONFIG.renderScale;
        const curW = bookSize*2 + CONFIG.spineWidthCm; 
        const curH = bookSize;
        
        this.canvas.setWidth(curW * state.ppi); 
        this.canvas.setHeight(curH * state.ppi);
        this.canvas.wrapperEl.style.width = `${curW * basePPI}px`; 
        this.canvas.wrapperEl.style.height = `${curH * basePPI}px`;
        this.canvas.lowerCanvasEl.style.width = '100%'; this.canvas.upperCanvasEl.style.width = '100%';
        this.canvas.lowerCanvasEl.style.height = '100%'; this.canvas.upperCanvasEl.style.height = '100%';
        
        this.render(state);
    },

    render: function(state) {
        if(!this.canvas) return;
        this.canvas.clear(); 
        this.canvas.setBackgroundColor(state.coverColor);
        const h = this.canvas.height;
        const bookSize = parseFloat(state.bookSize);
        const x1 = bookSize * state.ppi; 
        const x2 = (bookSize + 1.5) * state.ppi;
        
        const c = { h: h, spineX: x1 + ((x2 - x1) / 2), frontCenter: x2 + (bookSize * state.ppi / 2), backCenter: (bookSize * state.ppi) / 2, bottomBase: h - (1.5 * state.ppi), centerY: h / 2, gap: 2.0 * state.ppi };

        this._drawGuides(x1, x2, h, state);
        this._renderSpine(c, state);
        this._renderBackCover(c, state);
        this._renderFrontCover(c, state);
    },

    _drawGuides: function(x1, x2, h, state) {
        const opts = { stroke: state.text.color, strokeWidth: 2, strokeDashArray: [10,10], selectable: false, evented: false, opacity: 0.3 };
        this.canvas.add(new fabric.Line([x1, 0, x1, h], opts)); 
        this.canvas.add(new fabric.Line([x2, 0, x2, h], opts));
    },

    _renderSpine: function(c, state) {
        if(state.spine.symbol && state.images.icon) {
            this._placeImage(state.images.icon, c.spineX, c.bottomBase, 1.0 * state.ppi, { originY: 'bottom', color: state.text.color });
        }
        let parts = [];
        const raw = state.text.lines.map(l => l.text);
        if(state.spine.title) {
            const processed = raw.map((txt, i) => state.text.lines[i].upper ? txt.toUpperCase() : txt).filter(Boolean);
            if(processed.length > 0) parts.push(processed.join(" "));
        }
        if(state.spine.date && state.text.date) parts.push(state.text.date);
        if(parts.length > 0) {
            const spineStr = parts.join("  •  ");
            let yPos = c.bottomBase; 
            if(state.spine.symbol && state.images.icon) yPos -= (1.8 * state.ppi);
            this.canvas.add(new fabric.Text(spineStr, { fontFamily: state.text.font, fontSize: CONFIG.typo.baseDetails * state.ppi * state.text.scale, fill: state.text.color, opacity: CONFIG.globalOpacity, originX: 'left', originY: 'center', left: c.spineX, top: yPos, angle: -90, selectable: false }));
        }
    },

    _renderBackCover: function(c, state) {
        if(state.text.copyright) {
            this.canvas.add(new fabric.Text(state.text.copyright, { left: c.backCenter, top: c.bottomBase, fontSize: CONFIG.typo.baseCopy * state.ppi * state.text.scale, fontFamily: state.text.font, fill: state.text.color, opacity: CONFIG.globalOpacity * 0.7, originX: 'center', originY: 'bottom', selectable: false, letterSpacing: 50 }));
        }
        if(state.qr.enabled && state.qr.url) {
            const qrObj = new QRious({ value: state.qr.url, size: 500, level: 'H', foreground: state.text.color, backgroundAlpha: 0 });
            this._placeImage(qrObj.toDataURL(), c.backCenter, c.bottomBase - (0.5 * state.ppi) - (0.35 * state.ppi) - (0.5*state.ppi), 1.2 * state.ppi, { originY: 'bottom' });
        }
    },

    _renderFrontCover: function(c, state) {
        const layout = state.layout; 
        const x = c.frontCenter; 
        const y = c.centerY; 
        const gap = c.gap;

        if (layout === 'magazine') {
            const coverW = state.bookSize * state.ppi; 
            const coverH = c.h; 
            if(state.images.main) this._placeClippedImage(state.images.main, x, y, coverW, coverH, 'rect', true, state);
            else this._renderImageSlot(x, y, state, { w: coverW, h: coverH });
            this._renderTextBlock(x, 2.0 * state.ppi, false, true, state);
        } 
        else if (layout === 'icon') {
            this._renderIcon(x, y, null, state);
        }
        else if (layout === 'text_icon') {
            const dynGap = gap * state.text.scale; 
            const tObj = this._createTextBlockObj(true, state);
            const iconSize = (2.0 / 1.6) * state.ppi * state.text.scale;
            const visualGap = dynGap * 1.5; 
            const totalH = tObj.height + visualGap + iconSize;
            const startY = y - (totalH / 2); 
            tObj.set({ left: x, top: startY + tObj.height/2 }); 
            this.canvas.add(tObj);
            this._renderIcon(x, startY + tObj.height + visualGap + iconSize/2, iconSize, state);
        } 
        else if (layout === 'graphic' || layout === 'photo_text') {
            let imgY = c.centerY; 
            if(layout === 'graphic') {
                const style = getComputedStyle(document.documentElement);
                const offsetCm = parseFloat(style.getPropertyValue('--graphic-offset-y-cm')) || 2;
                imgY = c.centerY - (offsetCm * state.ppi);
                if(state.images.main) this._renderNaturalImage(x, imgY, state);
                else this._renderImageSlot(x, imgY, state);
            } 
            else {
                imgY = c.centerY - (2.0 * state.ppi); 
                if(state.images.main) {
                    const w = state.slotSize.w * state.ppi;
                    const h = state.slotSize.h * state.ppi;
                    this._placeClippedImage(state.images.main, x, imgY, w, h, state.maskType, false, state);
                } else {
                    this._renderImageSlot(x, imgY, state);
                }
                const textY = imgY + (state.slotSize.h * state.ppi / 2) + (1.5 * state.ppi);
                this._renderTextBlock(x, textY, true, false, state, 'top'); 
            }
        }
        else if (layout === 'text') { 
            const tObj = this._createTextBlockObj(false, state); 
            tObj.set({ left: x, top: c.centerY }); 
            this.canvas.add(tObj); 
        } 
    },

    _createTextBlockObj: function(compact, state) {
        const rawLines = state.text.lines.map(l => l.text); 
        const processedLines = rawLines.map((txt, i) => { return state.text.lines[i].upper ? txt.toUpperCase() : txt; });
        const hasText = rawLines.some(t => t.length > 0);
        
        let renderTxt = hasText ? processedLines.filter(Boolean).join("\n") : "THE VISUAL DIARY\n\n\n";
        let opacity = hasText ? CONFIG.globalOpacity : 0.3;
        const baseSize = compact ? 0.8 : CONFIG.typo.baseTitle; 
        const finalSize = baseSize * state.ppi * state.text.scale;
        
        const tObj = new fabric.Text(renderTxt, { fontFamily: 'Tenor Sans', fontSize: finalSize, textAlign: 'center', lineHeight: 1.3, fill: state.text.color, opacity: opacity, selectable: false, originX: 'center', originY: 'center' });
        const group = new fabric.Group([tObj], { originX: 'center', originY: 'center' });
        
        if(state.text.date) { 
            const dateStr = state.text.date; 
            const dateOp = CONFIG.globalOpacity; 
            const dateSize = CONFIG.typo.baseDetails * state.ppi * state.text.scale;
            const gap = (compact ? 1.0 : 2.0) * state.ppi;
            const dObj = new fabric.Text(dateStr, { fontFamily: 'Tenor Sans', fontSize: dateSize, fill: state.text.color, opacity: dateOp, originX: 'center', originY: 'top', top: (tObj.height / 2) + gap });
            group.addWithUpdate(dObj);
        }
        return group;
    },

    _renderTextBlock: function(x, y, compact, isMag, state, verticalOrigin = 'center') {
        if(state.layout === 'graphic') return;
        if(isMag) {
            let l1 = String(state.text.lines[0].text || "");
            let l2 = String(state.text.lines[1].text || "");
            if(state.text.lines[0].upper) l1 = l1.toUpperCase();
            if(state.text.lines[1].upper) l2 = l2.toUpperCase();
            let txtParts = [l1, l2].filter(t => t.length > 0);
            let txt = txtParts.length > 0 ? txtParts.join("\n") : "THE VISUAL DIARY";
            
            const shadow = new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 5, offsetX: 0, offsetY: 0 });
            this.canvas.add(new fabric.Text(txt, { fontFamily: 'Tenor Sans', fontSize: 2.5 * state.ppi * state.text.scale, textAlign: 'center', lineHeight: 1.0, originX: 'center', originY: 'top', left: x, top: y, fill: state.text.color, selectable: false, evented: false, shadow: shadow }));
            return;
        }
        const group = this._createTextBlockObj(compact, state); 
        group.set({ left: x, top: y, originY: verticalOrigin }); 
        this.canvas.add(group);
    },

    _renderIcon: function(x, y, forcedSize, state) {
        let iconUrl = state.images.icon; 
        let isGhost = false;
        if(!iconUrl) { iconUrl = 'assets/symbols/love_heart_icon.png'; isGhost = true; }
        this._placeImage(iconUrl, x, y, forcedSize || (2.0/1.6)*state.ppi*state.text.scale, { color: state.text.color, opacity: isGhost ? 0.3 : CONFIG.globalOpacity });
    },

    _renderImageSlot: function(x, y, state, customSize = null) {
        let w, h;
        if (customSize) { w = customSize.w; h = customSize.h; } 
        else { const zoom = state.text.scale || 1.0; w = state.slotSize.w * state.ppi * zoom; h = state.slotSize.h * state.ppi * zoom; }
        
        let shape;
        const commonOpts = { fill: 'transparent', stroke: '#aaaaaa', strokeWidth: 1.5, strokeDashArray: [10, 10], left: x, top: y, originX: 'center', originY: 'center', selectable: false, evented: true, hoverCursor: 'pointer', isPlaceholder: true };
        
        if(state.maskType === 'circle') shape = new fabric.Circle({ radius: w/2, ...commonOpts });
        else shape = new fabric.Rect({ width: w, height: h, ...commonOpts });
        this.canvas.add(shape);

        const centerIconSize = 1.5 * state.ppi; 
        const btnCircle = new fabric.Circle({ radius: centerIconSize / 2, fill: 'transparent', stroke: '#aaaaaa', strokeWidth: 1.5, originX: 'center', originY: 'center', left: x, top: y, selectable: false, evented: false });
        this.canvas.add(btnCircle);

        const plusLen = centerIconSize * 0.5; 
        const plusThick = 1.5 * (state.ppi / 30); 
        const vLine = new fabric.Rect({ width: plusThick, height: plusLen, fill: '#aaaaaa', originX: 'center', originY: 'center', left: x, top: y, selectable: false, evented: false });
        const hLine = new fabric.Rect({ width: plusLen, height: plusThick, fill: '#aaaaaa', originX: 'center', originY: 'center', left: x, top: y, selectable: false, evented: false });
        this.canvas.add(vLine);
        this.canvas.add(hLine);
    },
    
    _renderNaturalImage: function(x, y, state) {
        if(state.images.main && state.images.main.src) {
            fabric.Image.fromURL(state.images.main.src, (img) => {
                if(!img) return;
                const pxPerCm_Real = 300 / 2.54; 
                const realW_cm = img.width / pxPerCm_Real;
                const realH_cm = img.height / pxPerCm_Real;
                const targetW_px = realW_cm * state.ppi;
                const targetH_px = realH_cm * state.ppi;
                const userZoom = state.text.scale || 1.0;
                const finalScaleX = (targetW_px / img.width) * userZoom;
                const finalScaleY = (targetH_px / img.height) * userZoom;

                img.set({ left: x, top: y, originX: 'center', originY: 'center', scaleX: finalScaleX, scaleY: finalScaleY, opacity: CONFIG.globalOpacity, selectable: false, evented: true, hoverCursor: 'pointer', isMain: true });
                const filter = new fabric.Image.filters.BlendColor({ color: state.text.color, mode: 'tint', alpha: 1 }); 
                img.filters.push(filter); img.applyFilters();
                this.canvas.add(img);
            });
        }
    },

    _placeImage: function(url, x, y, width, opts = {}) {
        fabric.Image.fromURL(url, (img) => {
            if(!img) return;
            img.scaleToWidth(width);
            img.set({ left: x, top: y, originX: 'center', originY: 'center', selectable: false, opacity: CONFIG.globalOpacity, ...opts });
            if(opts.color) { img.filters.push(new fabric.Image.filters.BlendColor({ color: opts.color, mode: 'tint', alpha: 1 })); img.applyFilters(); }
            this.canvas.add(img); 
            if(opts.sendBack) this.canvas.sendToBack(img);
        });
    },

    _placeClippedImage: function(imgData, x, y, w, h, maskType, isBack, state) {
        if(!imgData || !imgData.src) return;
        fabric.Image.fromURL(imgData.src, (img) => {
            const info = imgData.cropInfo; 
            const scaleFactor = w / info.slotPixelSize;
            if(isBack) {
                const coverW = w; 
                const scale = Math.max(coverW / img.width, h / img.height);
                img.set({ scaleX: scale, scaleY: scale, left: x, top: h/2, originX: 'center', originY: 'center', selectable: false, evented: true, hoverCursor: 'pointer', isMain: true });
                img.clipPath = new fabric.Rect({ width: coverW/scale, height: h/scale, left: -coverW/2/scale, top: -h/2/scale });
                this.canvas.add(img); 
                this.canvas.sendToBack(img);
            } else {
                img.set({ scaleX: info.scale * scaleFactor, scaleY: info.scale * scaleFactor, left: x + (info.left * scaleFactor), top: y + (info.top * scaleFactor), originX: 'center', originY: 'center', selectable: false, evented: true, hoverCursor: 'pointer', isMain: true });
                let clip;
                if(maskType === 'circle') clip = new fabric.Circle({ radius: (w * (1/(info.scale * scaleFactor))) / 2, left: -(info.left * scaleFactor) / (info.scale * scaleFactor), top: -(info.top * scaleFactor) / (info.scale * scaleFactor), originX: 'center', originY: 'center' });
                else clip = new fabric.Rect({ width: w * (1/(info.scale * scaleFactor)), height: h * (1/(info.scale * scaleFactor)), left: -(info.left * scaleFactor) / (info.scale * scaleFactor), top: -(info.top * scaleFactor) / (info.scale * scaleFactor), originX: 'center', originY: 'center' });
                img.clipPath = clip;
                this.canvas.add(img);
            }
        });
    },
    
    download: function(state) {
        const mult = (CONFIG.dpi / CONFIG.cmToInch) / state.ppi;
        this.canvas.getObjects('line').forEach(o => o.opacity = 0);
        const data = this.canvas.toDataURL({ format: 'png', multiplier: mult, quality: 1 });
        this.canvas.getObjects('line').forEach(o => o.opacity = 0.3);
        const a = document.createElement('a'); a.download = `malevich_cover_${state.bookSize}.png`; a.href = data; a.click();
    }
};

/* --- CROPPER TOOL (ZOOM LIMIT FIXED) --- */
const CropperTool = {
    canvas: null,
    tempImgObject: null,
    activeSlot: { w: 0, h: 0 },
    maskType: 'rect',
    
    init: function() {
        if(!this.canvas) {
            this.canvas = new fabric.Canvas('cropCanvas', { 
                width: 500, height: 500, backgroundColor: '#111', selection: false,
                preserveObjectStacking: true 
            });
        }
        this.canvas.clear(); 
        this.canvas.setBackgroundColor('#111', this.canvas.renderAll.bind(this.canvas));
    },

    start: function(url, slotW, slotH, maskType) {
        this.init();
        this.maskType = maskType;
        
        // 1. Сначала вычисляем размеры слота (оверлея)
        this.drawOverlay(slotW, slotH);
        
        fabric.Image.fromURL(url, (img) => {
            if(!img) return;
            this.tempImgObject = img;
            
            // 2. Логика Object-fit: Cover
            // Картинка должна быть не меньше, чем слот
            const minScaleX = this.activeSlot.w / img.width;
            const minScaleY = this.activeSlot.h / img.height;
            const minCoverScale = Math.max(minScaleX, minScaleY); // Берем максимальный, чтобы покрыть всё
            
            // 3. Ставим картинку по центру с этим масштабом
            img.set({ 
                left: 250, top: 250, originX: 'center', originY: 'center', 
                scaleX: minCoverScale, scaleY: minCoverScale, 
                hasControls: false, hasBorders: false 
            });
            
            this.canvas.add(img);
            this.canvas.sendToBack(img); // Под рамку
            
            // 4. Ограничиваем слайдер
            const slider = document.getElementById('zoomSlider');
            slider.min = minCoverScale; // Нельзя сделать меньше слота!
            slider.max = minCoverScale * 4; // Можно увеличить в 4 раза
            slider.step = minCoverScale * 0.05;
            slider.value = minCoverScale;
            
            slider.oninput = () => { 
                img.scale(parseFloat(slider.value)); 
                this.canvas.requestRenderAll(); 
            };
            
            this.canvas.requestRenderAll();
        });
    },

    drawOverlay: function(slotW, slotH) {
        // Удаляем старые рамки
        this.canvas.getObjects().forEach(o => { 
            if(o !== this.tempImgObject) this.canvas.remove(o); 
        });
        
        // Вычисляем пропорции слота
        let aspect = slotW / slotH;
        let pW, pH;
        const maxSize = 400; // Макс. размер внутри 500px окна
        
        if(this.maskType === 'circle') { pW = maxSize; pH = maxSize; }
        else if(aspect >= 1) { pW = maxSize; pH = maxSize / aspect; } 
        else { pH = maxSize; pW = maxSize * aspect; }
        
        // Сохраняем размеры слота для расчета зума
        this.activeSlot = { w: pW, h: pH };
        
        const cx = 250, cy = 250;
        let pathStr = `M 0 0 H 500 V 500 H 0 Z`; 
        
        if(this.maskType === 'circle') {
            const r = pW/2;
            pathStr += ` M ${cx} ${cy-r} A ${r} ${r} 0 1 0 ${cx} ${cy+r} A ${r} ${r} 0 1 0 ${cx} ${cy-r} Z`;
            this.canvas.add(new fabric.Circle({ radius: r, left: cx, top: cy, originX:'center', originY:'center', fill: 'transparent', stroke: '#fff', strokeWidth: 1, selectable: false, evented: false }));
        } else {
            pathStr += ` M ${cx-pW/2} ${cy-pH/2} H ${cx+pW/2} V ${cy+pH/2} H ${cx-pW/2} Z`;
            this.canvas.add(new fabric.Rect({ left: cx, top: cy, width: pW, height: pH, fill: 'transparent', stroke: '#fff', strokeWidth: 1, originX: 'center', originY: 'center', selectable: false, evented: false }));
        }
        
        this.canvas.add(new fabric.Path(pathStr, { fill: 'rgba(0,0,0,0.7)', selectable: false, evented: false, fillRule: 'evenodd' }));
    },

    apply: function() {
        if(!this.tempImgObject) return null;
        const offX = this.tempImgObject.left - 250; 
        const offY = this.tempImgObject.top - 250;
        
        return { 
            src: this.tempImgObject.getSrc(), 
            cropInfo: { left: offX, top: offY, scale: this.tempImgObject.scaleX, slotPixelSize: this.activeSlot.w } 
        };
    }
};
