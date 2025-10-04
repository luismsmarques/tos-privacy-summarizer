#!/usr/bin/env node

/**
 * Script para atualizar o manifest.json com os ícones
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json não encontrado');
    process.exit(1);
}

try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Verificar se os ícones existem
    const sizes = [16, 32, 48, 128];
    const missingIcons = [];
    
    sizes.forEach(size => {
        const iconPath = path.join(__dirname, `icon${size}.png`);
        if (!fs.existsSync(iconPath)) {
            missingIcons.push(`icon${size}.png`);
        }
    });
    
    if (missingIcons.length > 0) {
        console.log('⚠️  Ícones em falta:', missingIcons.join(', '));
        console.log('Por favor, gere os ícones PNG primeiro usando icon-generator.html');
        process.exit(1);
    }
    
    // Atualizar manifest com ícones
    manifest.icons = {
        "16": "icon16.png",
        "32": "icon32.png", 
        "48": "icon48.png",
        "128": "icon128.png"
    };
    
    manifest.action.default_icon = {
        "16": "icon16.png",
        "32": "icon32.png",
        "48": "icon48.png",
        "128": "icon128.png"
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ manifest.json atualizado com os ícones');
    
} catch (error) {
    console.error('❌ Erro ao atualizar manifest.json:', error.message);
    process.exit(1);
}
