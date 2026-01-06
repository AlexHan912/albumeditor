updateDimensions: function(container, state) {
        // Проверка на наличие контейнера
        if(!container || container.clientWidth === 0) return;
        
        // Определяем, мобильная версия или нет
        const isMobile = window.innerWidth < 900;
        const margin = isMobile ? 10 : 20; 
        
        // Текущие размеры книги
        const curBookSize = parseFloat(state.bookSize);
        const curW = curBookSize * 2 + CONFIG.spineWidthCm; 
        const curH = curBookSize;

        let basePPI;

        if (isMobile) {
            // --- ЛОГИКА ДЛЯ МОБИЛЬНЫХ ---
            // Мы подгоняем масштаб так, чтобы ТЕКУЩАЯ книга занимала максимум места.
            // Книга 20см и 30см будут выглядеть одинаково широко на экране телефона.
            
            // Доступное место в контейнере
            const safeW = container.clientWidth - (margin * 2);
            const safeH = container.clientHeight - (margin * 2);

            // Считаем PPI, чтобы вписать текущую книгу в безопасную зону
            // Math.min выбирает, во что мы упремся раньше — в ширину или высоту
            basePPI = Math.min(safeW / curW, safeH / curH);

        } else {
            // --- ЛОГИКА ДЛЯ ДЕСКТОПА (Старая) ---
            // Мы подгоняем масштаб под САМУЮ БОЛЬШУЮ книгу (30см),
            // чтобы при переключении на 20см книга визуально уменьшалась.
            
            const MAX_REF_SIZE = 30; 
            const maxRefW = MAX_REF_SIZE * 2 + CONFIG.spineWidthCm; 
            const maxRefH = MAX_REF_SIZE;
            
            basePPI = Math.max(5, Math.min(
                (container.clientWidth - margin*2) / maxRefW, 
                (container.clientHeight - margin*2) / maxRefH
            ));
        }

        // Применяем качество рендера
        state.ppi = basePPI * CONFIG.renderScale;
        
        // Устанавливаем размеры холста
        this.canvas.setWidth(curW * state.ppi); 
        this.canvas.setHeight(curH * state.ppi);
        
        // Устанавливаем CSS размеры (физический размер на экране)
        this.canvas.wrapperEl.style.width = `${curW * basePPI}px`; 
        this.canvas.wrapperEl.style.height = `${curH * basePPI}px`;
        
        // Центрируем холст средствами CSS Canvas Container (автоматически fabric делает, но можно помочь)
        // На мобильном canvas-container сам встанет по центру flex-box'а workspace
        
        this.canvas.lowerCanvasEl.style.width = '100%'; 
        this.canvas.upperCanvasEl.style.width = '100%';
        this.canvas.lowerCanvasEl.style.height = '100%'; 
        this.canvas.upperCanvasEl.style.height = '100%';
        
        this.render(state);
    },
