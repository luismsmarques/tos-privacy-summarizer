// Teste da chave Gemini diretamente
// Substitua YOUR_API_KEY pela sua chave real

const API_KEY = 'YOUR_API_KEY'; // Substitua pela sua chave
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

async function testGeminiKey() {
    try {
        console.log('🧪 Testando chave Gemini...');
        
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Hello, this is a test. Please respond with "Test successful".'
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 100,
                }
            })
        });

        console.log('📊 Status:', response.status);
        console.log('📋 Headers:', [...response.headers.entries()]);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro:', response.status, response.statusText);
            console.error('📄 Detalhes:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('✅ Sucesso! Resposta:', data);
        return true;

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return false;
    }
}

// Executar teste
testGeminiKey();
