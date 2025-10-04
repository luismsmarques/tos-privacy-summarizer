#!/usr/bin/env node

/**
 * Script para gerar ícones da extensão ToS & Privacy Summarizer
 * Converte o SVG base para PNG nos tamanhos necessários
 */

const fs = require('fs');
const path = require('path');

// Tamanhos necessários para a extensão Chrome
const sizes = [16, 32, 48, 128];

// SVG base do ícone
const svgTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="{{SIZE}}" height="{{SIZE}}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fundo com bordas arredondadas -->
  <rect width="128" height="128" rx="25" ry="25" fill="url(#gradient)"/>
  
  <!-- Documento -->
  <rect x="25" y="32" width="51" height="64" fill="white" rx="4" ry="4"/>
  
  <!-- Linhas do documento -->
  <line x1="35" y1="48" x2="70" y2="48" stroke="#667eea" stroke-width="2"/>
  <line x1="35" y1="56" x2="70" y2="56" stroke="#667eea" stroke-width="2"/>
  <line x1="35" y1="64" x2="70" y2="64" stroke="#667eea" stroke-width="2"/>
  <line x1="35" y1="72" x2="60" y2="72" stroke="#667eea" stroke-width="2"/>
  
  <!-- Lupa -->
  <circle cx="85" cy="45" r="19" fill="none" stroke="white" stroke-width="4"/>
  
  <!-- Cabo da lupa -->
  <line x1="100" y1="60" x2="110" y2="70" stroke="white" stroke-width="4" stroke-linecap="round"/>
  
  <!-- Ponto no centro da lupa -->
  <circle cx="85" cy="45" r="3" fill="white"/>
</svg>`;

console.log('🎨 Gerador de Ícones - ToS & Privacy Summarizer');
console.log('================================================');

// Criar diretório de ícones se não existir
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
    console.log('📁 Diretório "icons" criado');
}

// Gerar SVG para cada tamanho
sizes.forEach(size => {
    const svgContent = svgTemplate.replace('{{SIZE}}', size);
    const filename = `icon${size}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ ${filename} gerado (${size}x${size}px)`);
});

console.log('\n📋 Próximos passos:');
console.log('1. Abra cada ficheiro SVG no seu editor de imagem preferido');
console.log('2. Exporte como PNG com o mesmo nome (ex: icon16.png)');
console.log('3. Coloque os ficheiros PNG na pasta raiz da extensão');
console.log('4. Execute o script update-manifest.js para atualizar o manifest.json');

console.log('\n🔗 Alternativa online:');
console.log('- Use o ficheiro icon-generator.html no navegador');
console.log('- Clique em "Gerar Todos os Ícones" e depois "Descarregar Todos"');

// Criar script de atualização do manifest
const updateManifestScript = `#!/usr/bin/env node

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
        const iconPath = path.join(__dirname, \`icon\${size}.png\`);
        if (!fs.existsSync(iconPath)) {
            missingIcons.push(\`icon\${size}.png\`);
        }
    });
    
    if (missingIcons.length > 0) {
        console.log('⚠️  Ícones em falta:', missingIcons.join(', '));
        console.log('Por favor, gere os ícones PNG primeiro');
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
}`;

fs.writeFileSync(path.join(__dirname, 'update-manifest.js'), updateManifestScript);
console.log('✅ Script update-manifest.js criado');

console.log('\n🎉 Processo concluído!');
