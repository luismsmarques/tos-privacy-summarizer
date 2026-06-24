# 📸 Guia para Capturar Screenshots - Chrome Web Store

**Projeto**: ToS & Privacy Summarizer  
**Versão**: 1.3.0  
**Data**: $(date)

---

## 🎯 **Screenshots Criados**

Todos os arquivos HTML foram criados na pasta `screenshots/` com as dimensões corretas para a Chrome Web Store.

### **📋 Screenshots Obrigatórios (5 imagens)**

| # | Nome | Arquivo | Dimensões | Descrição |
|---|------|---------|-----------|-----------|
| 1 | Popup Principal | `popup-principal-640x400.html` | 640x400 | Interface principal da extensão |
| 2 | Página de Resumo | `pagina-resumo-640x400.html` | 640x400 | Resultado da análise com rating |
| 3 | Histórico | `historico-640x400.html` | 640x400 | Lista de resumos anteriores |
| 4 | Configurações | `configuracoes-640x400.html` | 640x400 | Página de configurações |
| 5 | Onboarding | `onboarding-640x400.html` | 640x400 | Tutorial de boas-vindas |

### **🎨 Promo Tiles (Opcionais)**

| Nome | Arquivo | Dimensões | Descrição |
|------|---------|-----------|-----------|
| Small Promo Tile | `small-promo-tile-440x280.html` | 440x280 | Mosaico promocional pequeno |
| Marquee Promo Tile | `marquee-promo-tile-1400x560.html` | 1400x560 | Mosaico promocional grande |

---

## 📱 **Como Capturar as Imagens**

### **Método 1: Navegador Chrome (Recomendado)**

1. **Abrir arquivo HTML**:
   ```bash
   # Navegar para a pasta screenshots
   cd /Users/LuisMarques_1/ToS_DR/screenshots
   
   # Abrir no Chrome
   open -a "Google Chrome" popup-principal-640x400.html
   ```

2. **Capturar screenshot**:
   - Pressionar `Cmd + Shift + 4` (macOS)
   - Selecionar apenas a área da imagem (sem bordas)
   - Salvar como PNG

3. **Repetir para todos os arquivos**

### **Método 2: Ferramenta de Desenvolvimento**

1. **Abrir DevTools**: `F12` ou `Cmd + Option + I`
2. **Ir para Device Toolbar**: `Cmd + Shift + M`
3. **Definir dimensões exatas**:
   - Screenshots: 640x400
   - Small Promo: 440x280
   - Marquee Promo: 1400x560
4. **Capturar**: `Cmd + Shift + P` → "screenshot"

### **Método 3: Extensão de Screenshot**

1. **Instalar extensão**: "Full Page Screen Capture"
2. **Abrir arquivo HTML**
3. **Clicar na extensão**
4. **Selecionar área específica**
5. **Salvar como PNG**

---

## 🎨 **Especificações Técnicas**

### **Formato de Arquivo**
- **Tipo**: PNG 24-bit (sem transparência)
- **Qualidade**: Alta resolução
- **Cor**: RGB
- **Compressão**: Sem perda

### **Dimensões Exatas**
- **Screenshots**: 640x400 pixels
- **Small Promo**: 440x280 pixels  
- **Marquee Promo**: 1400x560 pixels

### **Conteúdo das Imagens**
- **Interface moderna** com Material Design
- **Cores consistentes** com o tema da extensão
- **Texto legível** e bem contrastado
- **Elementos visuais** claros e profissionais

---

## 📁 **Estrutura de Arquivos**

```
screenshots/
├── popup-principal-640x400.html      # Screenshot 1
├── pagina-resumo-640x400.html        # Screenshot 2
├── historico-640x400.html            # Screenshot 3
├── configuracoes-640x400.html        # Screenshot 4
├── onboarding-640x400.html          # Screenshot 5
├── small-promo-tile-440x280.html     # Promo Tile Pequeno
└── marquee-promo-tile-1400x560.html  # Promo Tile Grande
```

---

## 🚀 **Próximos Passos**

### **1. Capturar Imagens (15 minutos)**
- Abrir cada arquivo HTML
- Capturar screenshot com dimensões corretas
- Salvar como PNG

### **2. Nomear Arquivos**
```
tos-summarizer-screenshot-1.png
tos-summarizer-screenshot-2.png
tos-summarizer-screenshot-3.png
tos-summarizer-screenshot-4.png
tos-summarizer-screenshot-5.png
tos-summarizer-small-promo.png
tos-summarizer-marquee-promo.png
```

### **3. Upload na Chrome Web Store**
- Ir para: https://chrome.google.com/webstore/devconsole/
- Fazer upload das imagens
- Preencher informações da store

---

## ✅ **Checklist de Qualidade**

### **Antes de Capturar**
- [ ] ✅ Arquivos HTML abertos corretamente
- [ ] ✅ Dimensões verificadas
- [ ] ✅ Conteúdo visível e legível

### **Após Capturar**
- [ ] ✅ Dimensões corretas (640x400, 440x280, 1400x560)
- [ ] ✅ Formato PNG 24-bit
- [ ] ✅ Qualidade alta
- [ ] ✅ Sem bordas desnecessárias
- [ ] ✅ Texto legível
- [ ] ✅ Cores consistentes

### **Para Upload**
- [ ] ✅ Nomes de arquivo descritivos
- [ ] ✅ Todas as 5 imagens obrigatórias
- [ ] ✅ Promo tiles opcionais (se desejado)
- [ ] ✅ Arquivos prontos para upload

---

## 🎊 **Resultado Final**

Após seguir este guia, terá:

- ✅ **5 screenshots obrigatórios** para Chrome Web Store
- ✅ **2 promo tiles opcionais** para melhor visibilidade
- ✅ **Imagens profissionais** com qualidade alta
- ✅ **Dimensões corretas** conforme especificações
- ✅ **Arquivos prontos** para upload

**Tempo estimado**: 15 minutos  
**Dificuldade**: Fácil  
**Resultado**: Imagens profissionais para a store

---

**Guia criado por**: AI Assistant  
**Data**: $(date)  
**Status**: ✅ Pronto para uso
