// assets.js - База данных (Иконки + Графика + Цвета)

const ASSETS_DB = {
    // 1. ИКОНКИ (1x1 см)
    icons: {
        "Love": ["01heart.png"]
    },

    // 2. ГРАФИКА (Большие арты)
    graphics: {
        "Love": ["01heart.png"]
    }
};

// БАЗА ЦВЕТОВ (23 + Custom)
const COLORS_DB = {
    // Цвета обложки
    covers: [
        // Row 1: Lights & Creams
        { hex: "#FFFFFF", contrast: "#1a1a1a", name: "White" },
        { hex: "#F9F9F5", contrast: "#1a1a1a", name: "Cream" },
        { hex: "#F0EAD6", contrast: "#1a1a1a", name: "Eggshell" },
        { hex: "#E5E4E2", contrast: "#1a1a1a", name: "Stone" },
        { hex: "#D8C8B8", contrast: "#1a1a1a", name: "Beige" },
        { hex: "#EBC8B2", contrast: "#1a1a1a", name: "Blush" },
        { hex: "#DCAE96", contrast: "#FFFFFF", name: "Dusty Rose" },
        { hex: "#F4C2C2", contrast: "#1a1a1a", name: "Baby Pink" },

        // Row 2: Naturals & Greens
        { hex: "#B2AC88", contrast: "#FFFFFF", name: "Sage" },
        { hex: "#8F9779", contrast: "#FFFFFF", name: "Artichoke" },
        { hex: "#808000", contrast: "#FFFFFF", name: "Olive" },
        { hex: "#556B2F", contrast: "#FFFFFF", name: "Dark Olive" },
        { hex: "#2E4631", contrast: "#FFFFFF", name: "Forest" },
        { hex: "#A8C0D3", contrast: "#1a1a1a", name: "Sky" },
        { hex: "#7D99A9", contrast: "#FFFFFF", name: "Dusty Blue" },
        { hex: "#647C90", contrast: "#FFFFFF", name: "Steel" },

        // Row 3: Darks & Bolds + Custom
        { hex: "#1C2E4A", contrast: "#FFFFFF", name: "Navy" },
        { hex: "#C1795E", contrast: "#FFFFFF", name: "Terracotta" },
        { hex: "#800020", contrast: "#FFFFFF", name: "Burgundy" },
        { hex: "#6D5648", contrast: "#FFFFFF", name: "Cocoa" },
        { hex: "#AD9C8F", contrast: "#FFFFFF", name: "Taupe" },
        { hex: "#555555", contrast: "#FFFFFF", name: "Grey" },
        { hex: "#1a1a1a", contrast: "#FFFFFF", name: "Graphite" },
        { hex: "custom", name: "Custom" } // 24th item
    ],

    // Цвета элементов (7 + Custom)
    elements: [
        { hex: "#D4AF37", name: "Gold" },
        { hex: "#C0C0C0", name: "Silver" },
        { hex: "#B87333", name: "Copper" },
        { hex: "#FFFFFF", name: "White" },
        { hex: "#1a1a1a", name: "Black" },
        { hex: "#962f2f", name: "Red" },
        { hex: "#5D4037", name: "Chocolate" },
        { hex: "custom", name: "Custom" } // 8th item
    ]
};