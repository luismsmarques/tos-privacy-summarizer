// Script de teste para verificar o processamento JSON
// Execute este script no console do popup para debug

console.log('=== TESTE DE PROCESSAMENTO JSON ===');

// Simular uma resposta JSON da API
const testJson = {
    "resumo_conciso": "Esta política de privacidade explica como o Blog Odds Colombia trata os seus dados pessoais. A empresa afirma que os seus dados, como o endereço IP, não serão divulgados sem o seu consentimento, exceto por ordem judicial.",
    "pontos_chave": [
        "Os seus dados pessoais são protegidos e não serão divulgados sem consentimento",
        "A empresa pode alterar a política de privacidade a qualquer momento",
        "Cookies são utilizados para personalizar a experiência do utilizador",
        "Tem o direito de solicitar modificação ou eliminação dos seus dados"
    ],
    "alertas_privacidade": [
        {
            "tipo": "partilha_dados",
            "texto": "Os seus dados podem ser partilhados com terceiros para fins publicitários"
        },
        {
            "tipo": "alteracoes_termos",
            "texto": "A empresa pode alterar a política de privacidade unilateralmente"
        }
    ]
};

console.log('JSON de teste:', testJson);

// Testar a função convertJsonToHtml
try {
    const html = convertJsonToHtml(testJson);
    console.log('HTML gerado:', html);
    
    // Mostrar no elemento de resultado
    const summaryResult = document.getElementById('summaryResult');
    if (summaryResult) {
        summaryResult.innerHTML = html;
        console.log('HTML inserido no elemento summaryResult');
    } else {
        console.error('Elemento summaryResult não encontrado');
    }
} catch (error) {
    console.error('Erro ao converter JSON:', error);
}

console.log('Teste concluído');
