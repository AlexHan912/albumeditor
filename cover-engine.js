/* cover-engine.js - V82 */

// ... (верхняя часть) ...

const CoverEngine = {
    canvas: null,
    
    init: function(canvasId) {
        this.canvas = new fabric.Canvas(canvasId, { backgroundColor: '#fff', selection: false, enableRetinaScaling: false });
        
        this.canvas.on('mouse:down', (e) => {
            if(e.target) {
                if(e.target.isMain || e.target.isPlaceholder) {
                    if(window.handleCanvasClick) window.handleCanvasClick(e.target.isMain ? 'mainImage' : 'placeholder');
                }
                else if (e.target.isIcon) {
                    if(window.openGallery) window.openGallery('symbols', 'global');
                }
            }
        });

        this.canvas.on('mouse:up', (e) => {
            // FIX V82: Use 1024px
            const isMobile = window.innerWidth < 1024;
            const hitInteractive = e.target && (e.target.isMain || e.target.isPlaceholder || e.target.isIcon);
            
            if (isMobile && e.isClick && !hitInteractive) {
                setTimeout(() => {
                    if(window.openMobilePreview) window.openMobilePreview();
                }, 100);
            }
        });
    },

    // ... (loadSimpleImage) ...

    updateDimensions: function(container, state) {
        if(!container || container.clientWidth === 0) return;
        // FIX V82: Use 1024px
        const isMobile = window.innerWidth < 1024;
        const margin = isMobile ? 10 : 20; 
        
        const curBookSize = parseFloat(state.bookSize);
        // ... (rest of the file is unchanged) ...
