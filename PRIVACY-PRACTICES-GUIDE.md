# 🔒 Guia Completo para Privacy Practices - Chrome Web Store

**Projeto**: ToS & Privacy Summarizer v1.3.0  
**Data**: $(date)  
**Status**: ✅ **INFORMAÇÕES PARA PRIVACY PRACTICES**

---

## 📋 **Informações Obrigatórias para Publicação**

### **1. Single Purpose Description**
```
Esta extensão tem um único propósito: analisar e resumir Termos de Serviço e Políticas de Privacidade usando inteligência artificial para ajudar os utilizadores a entender rapidamente o que estão a aceitar antes de clicar em "Aceito".
```

### **2. Data Usage Certification**
```
✅ CERTIFICO que o uso de dados desta extensão cumpre com as Políticas do Programa de Desenvolvedores da Chrome Web Store.

Esta extensão:
- NÃO coleta dados pessoais dos utilizadores
- NÃO armazena conteúdo dos documentos analisados
- NÃO partilha dados com terceiros
- Utiliza apenas dados temporários para análise
- Respeita a privacidade dos utilizadores
```

---

## 🔐 **Justificações para Permissões**

### **activeTab**
```
JUSTIFICAÇÃO: Esta permissão é necessária para aceder ao conteúdo da página atual onde o utilizador está a visualizar Termos de Serviço ou Políticas de Privacidade. A extensão precisa de ler o texto da página para poder analisá-lo e fornecer um resumo compreensível. Sem esta permissão, a extensão não conseguiria cumprir a sua função principal de analisar documentos legais.
```

### **scripting**
```
JUSTIFICAÇÃO: Esta permissão é necessária para extrair texto das páginas web que contêm Termos de Serviço ou Políticas de Privacidade. A extensão utiliza scripts para identificar e extrair o conteúdo relevante dos documentos legais, processando apenas o texto necessário para a análise. Esta funcionalidade é essencial para o propósito único da extensão.
```

### **storage**
```
JUSTIFICAÇÃO: Esta permissão é necessária para armazenar localmente as configurações do utilizador (como preferências de análise e chaves API opcionais) e o histórico de resumos criados. Todos os dados são armazenados localmente no dispositivo do utilizador e nunca são transmitidos para servidores externos, garantindo total privacidade.
```

### **host_permissions: generativelanguage.googleapis.com**
```
JUSTIFICAÇÃO: Esta permissão é necessária para comunicar com a API do Google Gemini, que é utilizada para analisar e resumir documentos legais. A extensão envia apenas o texto extraído das páginas para análise e recebe de volta um resumo compreensível. Nenhum dado pessoal é transmitido ou armazenado pela API.
```

### **host_permissions: tos-privacy-summarizer.vercel.app**
```
JUSTIFICAÇÃO: Esta permissão é necessária para comunicar com o backend da extensão, que fornece funcionalidades adicionais como sistema de créditos e analytics anónimos. O backend não armazena dados pessoais e apenas processa informações técnicas para melhorar o serviço.
```

### **remote_code**
```
JUSTIFICAÇÃO: Esta extensão utiliza código remoto apenas para comunicar com a API do Google Gemini e o backend próprio. O código remoto é necessário para:
1. Enviar texto para análise pela IA
2. Receber resumos processados
3. Gerir sistema de créditos
4. Fornecer analytics anónimos

Todo o código remoto é de fontes confiáveis e é utilizado exclusivamente para o propósito único da extensão.
```

---

## 📸 **Screenshots Necessários**

### **Status Atual**
- ❌ **PENDENTE**: Upload de pelo menos 1 screenshot
- ✅ **PRONTO**: 7 templates HTML criados na pasta `screenshots/`

### **Ação Necessária**
1. **Abrir arquivos HTML** na pasta `screenshots/`
2. **Capturar screenshots** com dimensões corretas
3. **Upload na Chrome Web Store**

### **Screenshots Recomendados**
1. **Popup Principal** (640x400) - Interface principal
2. **Página de Resumo** (640x400) - Resultado da análise
3. **Histórico** (640x400) - Lista de resumos
4. **Configurações** (640x400) - Página de opções
5. **Onboarding** (640x400) - Tutorial inicial

---

## 📝 **Informações Adicionais para Privacy Practices**

### **Data Collection**
```
Esta extensão NÃO coleta dados pessoais dos utilizadores. Apenas processa temporariamente o texto dos documentos legais para análise e armazena localmente as configurações do utilizador e histórico de resumos.
```

### **Data Usage**
```
Os dados são utilizados exclusivamente para:
- Analisar documentos legais e fornecer resumos
- Armazenar preferências do utilizador localmente
- Manter histórico de análises no dispositivo
- Fornecer funcionalidades da extensão
```

### **Data Sharing**
```
Esta extensão NÃO partilha dados com terceiros. O texto dos documentos é enviado apenas para a API do Google Gemini para análise e não é armazenado ou partilhado com outras entidades.
```

### **Data Retention**
```
- Texto dos documentos: Processado temporariamente e descartado
- Configurações do utilizador: Armazenadas localmente até serem removidas
- Histórico de resumos: Armazenado localmente no dispositivo
- Dados de analytics: Anónimos e agregados
```

---

## 🚀 **Passos para Completar a Publicação**

### **1. Privacy Practices Tab**
- [ ] Preencher Single Purpose Description
- [ ] Certificar compliance com Developer Program Policies
- [ ] Adicionar justificações para todas as permissões
- [ ] Descrever uso de dados

### **2. Screenshots**
- [ ] Capturar pelo menos 1 screenshot dos templates HTML
- [ ] Upload na Chrome Web Store
- [ ] Verificar qualidade e dimensões

### **3. Informações Gerais**
- [ ] Nome: ToS & Privacy Summarizer
- [ ] Descrição: Resumo de documentos legais com IA
- [ ] Categoria: Productivity
- [ ] Linguagem: Portuguese (Portugal)
- [ ] Preço: Gratuito

### **4. Submissão**
- [ ] Revisar todas as informações
- [ ] Salvar Draft
- [ ] Submeter para aprovação

---

## ✅ **Checklist Completo**

### **Privacy Practices**
- [ ] ✅ Single Purpose Description definido
- [ ] ✅ Data Usage Certification preparada
- [ ] ✅ Justificações para todas as permissões criadas
- [ ] ✅ Informações de privacidade documentadas

### **Screenshots**
- [ ] ❌ **PENDENTE**: Capturar imagens dos templates HTML
- [ ] ❌ **PENDENTE**: Upload na Chrome Web Store
- [ ] ❌ **PENDENTE**: Verificar qualidade

### **Informações Gerais**
- [ ] ✅ Nome e descrição preparados
- [ ] ✅ Categoria definida
- [ ] ✅ Linguagem selecionada
- [ ] ✅ Preço configurado

---

## 🎯 **Próximos Passos Imediatos**

### **1. Capturar Screenshots (10 minutos)**
```bash
# Abrir templates HTML
cd /Users/LuisMarques_1/ToS_DR/screenshots
open -a "Google Chrome" popup-principal-640x400.html
```

### **2. Preencher Privacy Practices (5 minutos)**
- Copiar justificações acima
- Colar nas respetivas secções
- Certificar compliance

### **3. Upload e Submissão (5 minutos)**
- Upload dos screenshots
- Revisar todas as informações
- Submeter para aprovação

---

## 📞 **Suporte**

Se precisar de ajuda:
1. **Screenshots**: Seguir `SCREENSHOTS-GUIDE.md`
2. **Privacy**: Usar justificações acima
3. **Deploy**: Consultar `FINAL-DEPLOYMENT-GUIDE.md`

**Tempo estimado para conclusão**: 20 minutos  
**Status**: ⏳ **AGUARDANDO SCREENSHOTS E PRIVACY PRACTICES**

---

**Guia criado por**: AI Assistant  
**Data**: $(date)  
**Status**: ✅ **PRONTO PARA COMPLETAR PUBLICAÇÃO**
