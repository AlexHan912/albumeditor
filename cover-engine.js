/* cover-engine.js - Logic for Rendering & Cropping */

const CONFIG = {
    dpi: 300, cmToInch: 2.54, spineWidthCm: 1.5, renderScale: 3.0,
    globalOpacity: 0.85, typo: { baseTitle: 1.2, baseDetails: 0.5, baseCopy: 0.35 },
    scales: [0.7, 0.9, 1.1, 1.3]
};

const CoverEngine = {
    canvas: null,
    
    init: function(canvasId) {
        this.canvas = new fabric.Canvas(canvasId, { backgroundColor: '#fff', selection: false, enableRetinaScaling: false });
        
        // Слушаем клики по объектам (картинка или пустой контейнер)
        this.canvas.on('mouse:down', (e) => {
            if(e.target) {
                if(e.target.isMain) {
                    // Клик по загруженной картинке
                    if(window.handleCanvasClick) window.handleCanvasClick('mainImage');
                } else if (e.target.isPlaceholder) {
                    // Клик по пустому пунктиру
                    if(window.handleCanvasClick) window.handleCanvasClick('placeholder');
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
        
        const c = { 
            h: h, 
            spineX: x1 + ((x2 - x1) / 2), 
            frontCenter: x2 + (bookSize * state.ppi / 2), 
            backCenter: (bookSize * state.ppi) / 2, 
            bottomBase: h - (1.5 * state.ppi), 
            centerY: h / 2, 
            gap: 2.0 * state.ppi 
        };

        this._drawGuides(x1, x2, h, state);
        this._renderSpine(c, state);
        this._renderBackCover(c, state);
        this._renderFrontCover(c, state);
        
        // Координаты для Плюсика (HTML)
        let trigY = c.centerY;
        if(state.layout === 'graphic') {
            const style = getComputedStyle(document.documentElement);
            const offsetCm = parseFloat(style.getPropertyValue('--graphic-offset-y-cm')) || 2;
            trigY = c.centerY - (offsetCm * state.ppi);
        }
        else if(state.layout === 'photo_text') trigY = c.centerY - c.gap/2;
        
        return { 
            triggerX: c.frontCenter, 
            triggerY: trigY,
            scale: CONFIG.renderScale 
        };
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
            if(state.images.main) this._placeClippedImage(state.images.main, x, y, state.bookSize*state.ppi, c.h, 'rect', true, state);
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
                
                // Если картинка есть - рисуем её
                if(state.images.main) {
                    this._renderNaturalImage(x, imgY, state);
                } else {
                    // Если нет - рисуем интерактивный пунктир
                    this._renderImageSlot(x, imgY, state);
                }
            } 
            else {
                if(layout === 'photo_text') imgY = c.centerY - gap/2;
                this._renderImageSlot(x, imgY, state);
                if(layout === 'photo_text') this._renderTextBlock(x, y + gap*1.5, true, false, state); 
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
        
        const tObj = new fabric.Text(renderTxt, { fontFamily: state.text.font, fontSize: finalSize, textAlign: 'center', lineHeight: 1.3, fill: state.text.color, opacity: opacity, selectable: false, originX: 'center', originY: 'center' });
        const group = new fabric.Group([tObj], { originX: 'center', originY: 'center' });
        
        if(state.text.date || !hasText) { 
            const dateStr = state.text.date ? state.text.date : "2025"; 
            const dateOp = state.text.date ? CONFIG.globalOpacity : 0.3; 
            const dateSize = CONFIG.typo.baseDetails * state.ppi * state.text.scale;
            const dObj = new fabric.Text(dateStr, { fontFamily: state.text.font, fontSize: dateSize, fill: state.text.color, opacity: dateOp, originX: 'center', originY: 'top', top: tObj.height/2 + (compact ? 1.0 : 2.0)*state.ppi });
            group.addWithUpdate(dObj);
        }
        return group;
    },

    _renderTextBlock: function(x, y, compact, isMag, state) {
        if(state.layout === 'graphic') return;
        if(isMag) {
            let txt = [state.text.lines[0].text, state.text.lines[1].text].filter(Boolean).join("\n");
            if(!txt) txt = "MAGAZINE";
            this.canvas.add(new fabric.Text(txt, { fontFamily: 'Bodoni Moda', fontSize: 2.5 * state.ppi * state.text.scale, textAlign: 'center', lineHeight: 1.0, originX: 'center', originY: 'top', left: x, top: y, fill: state.text.color, selectable: false }));
            return;
        }
        const group = this._createTextBlockObj(compact, state); 
        group.set({ left: x, top: y }); 
        this.canvas.add(group);
    },

    _renderIcon: function(x, y, forcedSize, state) {
        let iconUrl = state.images.icon; 
        let isGhost = false;
        if(!iconUrl) { 
            iconUrl = 'assets/symbols/love_heart_icon.png'; 
            isGhost = true; 
        }
        this._placeImage(iconUrl, x, y, forcedSize || (2.0/1.6)*state.ppi*state.text.scale, { color: state.text.color, opacity: isGhost ? 0.3 : CONFIG.globalOpacity });
    },

    // Рисование Пунктирного Плейсхолдера (Интерактивного)
    _renderImageSlot: function(x, y, state) {
        // Применяем зум к пунктирному контейнеру
        const zoom = state.text.scale || 1.0;
        const w = state.slotSize.w * state.ppi * zoom; 
        const h = state.slotSize.h * state.ppi * zoom;
        
        let shape;
        const opts = { 
            fill: 'transparent', stroke: '#ddd', strokeWidth: 2, strokeDashArray: [20,20], 
            left: x, top: y, originX: 'center', originY: 'center', 
            // ВАЖНО: Делаем его кликабельным
            selectable: false, evented: true, hoverCursor: 'pointer', isPlaceholder: true 
        };
        
        if(state.maskType === 'circle') shape = new fabric.Circle({ radius: w/2, ...opts });
        else shape = new fabric.Rect({ width: w, height: h, ...opts });
        
        this.canvas.add(shape);
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

                img.set({
                    left: x, 
                    top: y, 
                    originX: 'center', 
                    originY: 'center', 
                    scaleX: finalScaleX,
                    scaleY: finalScaleY,
                    opacity: CONFIG.globalOpacity,
                    selectable: false, 
                    evented: true, 
                    hoverCursor: 'pointer',
                    isMain: true
                });

                const filter = new fabric.Image.filters.BlendColor({ color: state.text.color, mode: 'tint', alpha: 1 }); 
                img.filters.push(filter); 
                img.applyFilters();
                
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
                img.set({ scaleX: scale, scaleY: scale, left: x, top: h/2, originX: 'center', originY: 'center', selectable: false });
                img.clipPath = new fabric.Rect({ width: coverW/scale, height: h/scale, left: -coverW/2/scale, top: -h/2/scale });
                this.canvas.add(img); 
                this.canvas.sendToBack(img);
            } else {
                img.set({ 
                    scaleX: info.scale * scaleFactor, 
                    scaleY: info.scale * scaleFactor, 
                    left: x + (info.left * scaleFactor), 
                    top: y + (info.top * scaleFactor), 
                    originX: 'center', 
                    originY: 'center', 
                    selectable: false, evented: true, hoverCursor: 'pointer', isMain: true
                });
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
