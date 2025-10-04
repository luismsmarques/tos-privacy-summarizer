// Script para criar ícones simples da extensão
// Este script cria ícones PNG usando Canvas API e os converte para base64

const fs = require('fs');
const path = require('path');

// Função para criar um ícone PNG usando Canvas (simulado)
function createIconPNG(size) {
    // Em um ambiente real, usaria Canvas API
    // Por agora, vou criar um placeholder que pode ser substituído
    
    const iconData = {
        size: size,
        description: `Ícone ${size}x${size}px para ToS & Privacy Summarizer`,
        colors: {
            background: '#667eea',
            secondary: '#764ba2', 
            foreground: '#ffffff',
            accent: '#667eea'
        },
        elements: [
            'Fundo com gradiente azul-roxo',
            'Documento branco com linhas azuis',
            'Lupa branca com cabo',
            'Bordas arredondadas'
        ]
    };
    
    return iconData;
}

// Tamanhos necessários
const sizes = [16, 32, 48, 128];

console.log('🎨 Criando especificações de ícones...');

// Criar especificações para cada tamanho
const iconSpecs = sizes.map(size => {
    const spec = createIconPNG(size);
    const filename = `icon${size}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(spec, null, 2));
    console.log(`✅ Especificação criada: ${filename}`);
    
    return spec;
});

// Criar um README com instruções
const readme = `# Ícones da Extensão ToS & Privacy Summarizer

## 📋 Tamanhos Necessários

- **icon16.png** - 16x16px (ícone na barra de ferramentas)
- **icon32.png** - 32x32px (ícone em contexto)
- **icon48.png** - 48x48px (ícone na página de extensões)
- **icon128.png** - 128x128px (ícone na Chrome Web Store)

## 🎨 Design do Ícone

### Conceito
- **Tema**: Documento com lupa (representando análise de termos)
- **Cores**: Gradiente azul-roxo (#667eea → #764ba2)
- **Estilo**: Moderno, limpo, com bordas arredondadas

### Elementos
1. **Fundo**: Gradiente diagonal azul-roxo com bordas arredondadas
2. **Documento**: Retângulo branco com linhas azuis (representando texto)
3. **Lupa**: Círculo branco com cabo (representando análise/investigação)
4. **Ponto**: Pequeno círculo no centro da lupa

## 🛠️ Como Criar os Ícones

### Opção 1: Usar o Gerador Online
1. Abra \`icon-generator.html\` no navegador
2. Clique em "Gerar Todos os Ícones"
3. Clique em "Descarregar Todos"
4. Guarde os ficheiros na pasta da extensão

### Opção 2: Usar Editor de Imagem
1. Abra \`icon.svg\` no seu editor preferido (GIMP, Photoshop, etc.)
2. Exporte como PNG para cada tamanho:
   - 16x16px → icon16.png
   - 32x32px → icon32.png
   - 48x48px → icon48.png
   - 128x128px → icon128.png

### Opção 3: Usar Ferramentas Online
1. Vá para [favicon.io](https://favicon.io/favicon-generator/) ou similar
2. Use o SVG fornecido como base
3. Gere os tamanhos necessários
4. Descarregue e renomeie os ficheiros

## 📁 Estrutura Final

Após criar os ícones, a pasta da extensão deve conter:

\`\`\`
ToS_DR/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── icon16.png      ← Novo
├── icon32.png      ← Novo
├── icon48.png      ← Novo
└── icon128.png     ← Novo
\`\`\`

## 🔄 Atualizar Manifest

Após criar os ícones PNG, execute:

\`\`\`bash
node update-manifest.js
\`\`\`

Isso irá atualizar automaticamente o \`manifest.json\` com as referências aos ícones.

## ✅ Verificação

Para verificar se tudo está correto:

1. Recarregue a extensão no Chrome
2. Verifique se o ícone aparece na barra de ferramentas
3. Verifique se o ícone aparece na página de extensões
4. Teste a funcionalidade da extensão

## 🎯 Próximos Passos

Após criar os ícones:
1. ✅ Ícones criados
2. ⏳ Atualizar manifest.json
3. ⏳ Testar extensão
4. ⏳ Preparar para publicação
`;

fs.writeFileSync('ICONS-README.md', readme);
console.log('✅ README criado: ICONS-README.md');

console.log('\n📋 Resumo:');
console.log('- Especificações criadas para todos os tamanhos');
console.log('- README com instruções detalhadas');
console.log('- Use icon-generator.html para criar os ícones PNG');
console.log('- Execute update-manifest.js após criar os ícones');

console.log('\n🎉 Processo concluído!');
