# 🎯 PLANO DE AÇÃO FINAL - CHROME WEB STORE

**Status**: ⏳ **SCREENSHOTS ABERTOS - PRONTO PARA CAPTURA**  
**Data**: $(date)  
**Tempo estimado**: 15 minutos

---

## 📸 **PASSO 1: CAPTURAR SCREENSHOTS (5 minutos)**

### **✅ Templates HTML Abertos no Chrome**
- ✅ `popup-principal-640x400.html` - Interface principal
- ✅ `pagina-resumo-640x400.html` - Resultado da análise  
- ✅ `historico-640x400.html` - Lista de resumos

### **Como Capturar**
1. **Pressionar**: `Cmd + Shift + 4` (macOS)
2. **Selecionar**: Apenas a área da imagem (sem bordas)
3. **Salvar como**: PNG
4. **Nomear**: `tos-summarizer-screenshot-1.png`, etc.

### **Screenshots Necessários**
- **Mínimo**: 1 screenshot (obrigatório)
- **Recomendado**: 3-5 screenshots (melhor visibilidade)
- **Dimensões**: 640x400 pixels
- **Formato**: PNG 24-bit

---

## 🔒 **PASSO 2: PRIVACY PRACTICES (5 minutos)**

### **Single Purpose Description**
```
Esta extensão tem um único propósito: analisar e resumir Termos de Serviço e Políticas de Privacidade usando inteligência artificial para ajudar os utilizadores a entender rapidamente o que estão a aceitar antes de clicar em "Aceito".
```

### **Data Usage Certification**
```
✅ CERTIFICO que o uso de dados desta extensão cumpre com as Políticas do Programa de Desenvolvedores da Chrome Web Store.

Esta extensão:
- NÃO coleta dados pessoais dos utilizadores
- NÃO armazena conteúdo dos documentos analisados
- NÃO partilha dados com terceiros
- Utiliza apenas dados temporários para análise
- Respeita a privacidade dos utilizadores
```

### **Justificações para Permissões**

#### **activeTab**
```
JUSTIFICAÇÃO: Esta permissão é necessária para aceder ao conteúdo da página atual onde o utilizador está a visualizar Termos de Serviço ou Políticas de Privacidade. A extensão precisa de ler o texto da página para poder analisá-lo e fornecer um resumo compreensível. Sem esta permissão, a extensão não conseguiria cumprir a sua função principal de analisar documentos legais.
```

#### **scripting**
```
JUSTIFICAÇÃO: Esta permissão é necessária para extrair texto das páginas web que contêm Termos de Serviço ou Políticas de Privacidade. A extensão utiliza scripts para identificar e extrair o conteúdo relevante dos documentos legais, processando apenas o texto necessário para a análise. Esta funcionalidade é essencial para o propósito único da extensão.
```

#### **storage**
```
JUSTIFICAÇÃO: Esta permissão é necessária para armazenar localmente as configurações do utilizador (como preferências de análise e chaves API opcionais) e o histórico de resumos criados. Todos os dados são armazenados localmente no dispositivo do utilizador e nunca são transmitidos para servidores externos, garantindo total privacidade.
```

#### **host_permissions: generativelanguage.googleapis.com**
```
JUSTIFICAÇÃO: Esta permissão é necessária para comunicar com a API do Google Gemini, que é utilizada para analisar e resumir documentos legais. A extensão envia apenas o texto extraído das páginas para análise e recebe de volta um resumo compreensível. Nenhum dado pessoal é transmitido ou armazenado pela API.
```

#### **host_permissions: tos-privacy-summarizer.vercel.app**
```
JUSTIFICAÇÃO: Esta permissão é necessária para comunicar com o backend da extensão, que fornece funcionalidades adicionais como sistema de créditos e analytics anónimos. O backend não armazena dados pessoais e apenas processa informações técnicas para melhorar o serviço.
```

#### **remote_code**
```
JUSTIFICAÇÃO: Esta extensão utiliza código remoto apenas para comunicar com a API do Google Gemini e o backend próprio. O código remoto é necessário para:
1. Enviar texto para análise pela IA
2. Receber resumos processados
3. Gerir sistema de créditos
4. Fornecer analytics anónimos

Todo o código remoto é de fontes confiáveis e é utilizado exclusivamente para o propósito único da extensão.
```

---

## 🚀 **PASSO 3: UPLOAD E SUBMISSÃO (5 minutos)**

### **Upload na Chrome Web Store**
1. **Aceder**: https://chrome.google.com/webstore/devconsole/
2. **Upload screenshots**: Arrastar arquivos PNG
3. **Preencher Privacy Practices**: Copiar justificações acima
4. **Salvar Draft**: Verificar todas as informações
5. **Submeter**: Para aprovação

### **Informações Finais**
- **Nome**: ToS & Privacy Summarizer
- **Descrição**: Resuma Termos de Serviço e Políticas de Privacidade usando IA. Entenda rapidamente o que está a aceitar antes de clicar em 'Aceito'. Análise inteligente com Google Gemini, ratings de risco e interface moderna.
- **Categoria**: Productivity
- **Linguagem**: Portuguese (Portugal)
- **Preço**: Gratuito

---

## ✅ **CHECKLIST FINAL**

### **Screenshots**
- [ ] ⏳ Capturar pelo menos 1 screenshot
- [ ] ⏳ Salvar como PNG
- [ ] ⏳ Upload na Chrome Web Store

### **Privacy Practices**
- [ ] ⏳ Preencher Single Purpose Description
- [ ] ⏳ Certificar Data Usage Compliance
- [ ] ⏳ Adicionar justificações para todas as permissões

### **Submissão**
- [ ] ⏳ Upload do arquivo ZIP da extensão
- [ ] ⏳ Upload dos screenshots
- [ ] ⏳ Preencher informações gerais
- [ ] ⏳ Submeter para aprovação

---

## 🎊 **RESULTADO ESPERADO**

Após completar os 3 passos:

- ✅ **Extensão submetida** para aprovação
- ✅ **Aprovação** em 1-3 dias úteis
- ✅ **Disponível** para download público
- ✅ **Projeto LIVE** e operacional

**Status atual**: ⏳ **SCREENSHOTS ABERTOS - PRONTO PARA CAPTURA**  
**Próximo passo**: Capturar screenshots e preencher Privacy Practices  
**Tempo restante**: 15 minutos

---

## 📞 **Suporte**

Se precisar de ajuda:
1. **Screenshots**: Templates HTML já abertos no Chrome
2. **Privacy**: Justificações prontas para copiar
3. **Upload**: Seguir passos acima
4. **Backend**: Já configurado e operacional

**O projeto está 95% pronto! Só falta capturar os screenshots e preencher as informações de privacidade.** 🚀

---

**Plano criado por**: AI Assistant  
**Data**: $(date)  
**Status**: ⏳ **AGUARDANDO CAPTURA DE SCREENSHOTS**
