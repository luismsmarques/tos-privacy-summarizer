// Teste para listar modelos disponíveis
// Substitua YOUR_API_KEY pela sua chave real

const API_KEY = 'YOUR_API_KEY'; // Substitua pela sua chave
const MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function listAvailableModels() {
    try {
        console.log('🔍 Listando modelos disponíveis...');
        
        const response = await fetch(`${MODELS_URL}?key=${API_KEY}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro:', response.status, response.statusText);
            console.error('📄 Detalhes:', errorText);
            return;
        }

        const data = await response.json();
        console.log('📋 Modelos disponíveis:');
        
        if (data.models) {
            data.models.forEach(model => {
                console.log(`- ${model.name}`);
                if (model.supportedGenerationMethods) {
                    console.log(`  Métodos: ${model.supportedGenerationMethods.join(', ')}`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
    }
}

// Executar teste
listAvailableModels();
