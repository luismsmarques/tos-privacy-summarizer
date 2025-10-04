# Ícones da Extensão ToS & Privacy Summarizer

## 🎨 Design do Ícone

**Conceito**: Documento com lupa (representando análise de Termos de Serviço)
**Cores**: Gradiente azul-roxo (#667eea → #764ba2)
**Estilo**: Moderno, limpo, com bordas arredondadas

## 📋 Tamanhos Necessários

- **icon16.png** - 16x16px (ícone na barra de ferramentas)
- **icon32.png** - 32x32px (ícone em contexto)  
- **icon48.png** - 48x48px (ícone na página de extensões)
- **icon128.png** - 128x128px (ícone na Chrome Web Store)

## 🛠️ Como Criar os Ícones

### Método 1: Usar o Gerador HTML (Recomendado)
1. Abra `icon-generator.html` no navegador
2. Clique em "Gerar Todos os Ícones"
3. Clique em "Descarregar Todos"
4. Guarde os ficheiros na pasta da extensão

### Método 2: Usar Editor de Imagem
1. Abra `icon.svg` no seu editor preferido
2. Exporte como PNG para cada tamanho:
   - 16x16px → icon16.png
   - 32x32px → icon32.png
   - 48x48px → icon48.png
   - 128x128px → icon128.png

### Método 3: Usar Ferramentas Online
1. Vá para [favicon.io](https://favicon.io/favicon-generator/)
2. Use o SVG fornecido como base
3. Gere os tamanhos necessários
4. Descarregue e renomeie os ficheiros

## 📁 Estrutura Final

Após criar os ícones, a pasta da extensão deve conter:

```
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
```

## 🔄 Atualizar Manifest

Após criar os ícones PNG, execute:

```bash
node update-manifest.js
```

Isso irá atualizar automaticamente o `manifest.json` com as referências aos ícones.

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
