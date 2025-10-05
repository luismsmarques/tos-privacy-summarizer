# 🔧 Guia de Debug - ToS Privacy Summarizer

## 🚨 **Problema Identificado: Erro de Processamento**

### **✅ Status Atual**
- **Backend**: ✅ Funcionando perfeitamente
- **API Endpoints**: ✅ Testados e funcionais
- **Base de Dados**: ✅ Conectada e operacional
- **Extensão**: ⚠️ Melhorias implementadas para debug

---

## 🔍 **Melhorias Implementadas**

### **1. Logs de Debug Detalhados**
- **URL do endpoint** sendo chamado
- **UserId** sendo usado
- **Tamanho do texto** sendo processado
- **Status da resposta** HTTP
- **Resultado completo** do backend
- **Stack trace** de erros

### **2. Tratamento de Erros Melhorado**
- **Mensagens mais específicas** para diferentes tipos de erro
- **Logs detalhados** no console da extensão
- **Fallback** para erros de parsing JSON
- **Identificação** de erros HTTP específicos

### **3. Endpoint de Debug**
- **URL**: `https://tos-privacy-summarizer.vercel.app/api/analytics/debug/summaries`
- **Função**: Verificar resumos na base de dados
- **Requer**: Autenticação administrativa

---

## 🧪 **Como Debuggar Problemas**

### **1. Verificar Console da Extensão**
1. Abrir **Chrome DevTools** (F12)
2. Ir para **Console**
3. Usar a extensão
4. Verificar logs detalhados

### **2. Verificar Logs do Backend**
1. Aceder ao **Vercel Dashboard**
2. Ir para **Functions** → **Logs**
3. Procurar por erros recentes
4. Verificar logs de `/api/gemini/proxy`

### **3. Testar Endpoint Diretamente**
```bash
curl -X POST https://tos-privacy-summarizer.vercel.app/api/gemini/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "text": "Texto de teste com pelo menos 50 caracteres para passar na validação do endpoint.",
    "apiType": "shared"
  }'
```

### **4. Verificar Base de Dados**
1. Aceder ao **Neon Dashboard**
2. Verificar tabelas `users`, `summaries`, `requests`
3. Confirmar que dados estão sendo inseridos

---

## 📊 **Logs Esperados**

### **✅ Logs de Sucesso**
```
🔧 Configuração forçada para API compartilhada
Usando backend seguro para resumir texto...
URL: https://tos-privacy-summarizer.vercel.app/api/gemini/proxy
UserId: device_abc123_1234567890_xyz
Text length: 15420
Response status: 200
Response ok: true
Backend result: {summary: "...", credits: 4, apiType: "shared"}
Resumo gerado com sucesso
```

### **❌ Logs de Erro**
```
Erro ao gerar resumo: Error: Erro HTTP: 500
Error stack: Error: Erro HTTP: 500
    at summarizeWithBackend (background.js:228)
    at processSummaryAsync (background.js:69)
Enviando erro para popup: Erro ao gerar resumo: Erro do servidor: Erro HTTP: 500
```

---

## 🔧 **Problemas Comuns e Soluções**

### **1. Erro de Processamento Genérico**
- **Causa**: Problema na comunicação com backend
- **Solução**: Verificar logs detalhados no console
- **Debug**: Testar endpoint diretamente

### **2. Erro de Créditos**
- **Causa**: Utilizador sem créditos suficientes
- **Solução**: Verificar sistema de créditos
- **Debug**: Verificar tabela `users`

### **3. Erro de Validação**
- **Causa**: Texto muito curto (< 50 caracteres)
- **Solução**: Garantir que página tem conteúdo suficiente
- **Debug**: Verificar logs de `Text length`

### **4. Erro de Rede**
- **Causa**: Problemas de conectividade
- **Solução**: Verificar ligação à internet
- **Debug**: Testar outros endpoints

---

## 📈 **Monitorização Contínua**

### **1. Métricas Importantes**
- **Taxa de sucesso** dos resumos
- **Tempo de resposta** médio
- **Erros por tipo** e frequência
- **Utilização de créditos**

### **2. Alertas Recomendados**
- **Taxa de erro** > 10%
- **Tempo de resposta** > 10 segundos
- **Falhas consecutivas** > 5
- **Créditos baixos** para utilizadores

---

## 🚀 **Próximos Passos**

### **1. Testar a Extensão**
1. Recarregar a extensão no Chrome
2. Usar numa página com Termos de Serviço
3. Verificar logs no console
4. Confirmar que resumos são guardados

### **2. Monitorizar Performance**
1. Verificar logs do Vercel
2. Confirmar dados na base de dados
3. Verificar dashboard administrativo
4. Acompanhar métricas de uso

### **3. Melhorias Futuras**
1. **Sistema de alertas** automáticos
2. **Dashboard de monitorização** em tempo real
3. **Logs centralizados** para análise
4. **Métricas de performance** detalhadas

---

## ✅ **Conclusão**

As melhorias implementadas devem resolver o problema de "Erro no Processamento" através de:

- **Logs detalhados** para identificar problemas
- **Tratamento de erros** mais robusto
- **Mensagens específicas** para diferentes tipos de erro
- **Debug tools** para investigação

**A extensão deve agora funcionar corretamente com melhor visibilidade de problemas!** 🎉
