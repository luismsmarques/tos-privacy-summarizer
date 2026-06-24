// Detecção de tipo de documento (Termos de Serviço vs Política de Privacidade).
// Implementação única e partilhada — usada tanto no proxy do Gemini (sobre o
// texto original) como na camada de base de dados (fallback sobre o resumo).

export function detectDocumentType(text) {
    if (!text) return 'unknown';

    const lowerText = text.toLowerCase();

    // Palavras-chave multi-idioma para Política de Privacidade
    const privacyKeywords = [
        // Português
        'política de privacidade', 'privacidade', 'dados pessoais', 'proteção de dados',
        'política de cookies', 'recolha de dados', 'processamento de dados',
        'informações que coletamos', 'como usamos seus dados', 'compartilhamento de dados',
        'retenção de dados', 'aviso de privacidade', 'informações pessoais',
        'controlador de dados',

        // Inglês
        'privacy policy', 'privacy', 'personal data', 'data protection',
        'cookie policy', 'data collection', 'data processing',
        'information we collect', 'how we use your data', 'data sharing',
        'data retention', 'privacy notice', 'personal information',
        'data controller',

        // Espanhol
        'política de privacidad', 'privacidad', 'datos personales', 'protección de datos',
        'política de cookies', 'recopilación de datos', 'procesamiento de datos',
        'información que recopilamos', 'cómo usamos sus datos', 'compartir datos',
        'retención de datos', 'aviso de privacidad', 'información personal',
        'controlador de datos',

        // Francês
        'politique de confidentialité', 'confidentialité', 'données personnelles', 'protection des données',
        'politique de cookies', 'collecte de données', 'traitement des données',
        'informations que nous collectons', 'comment nous utilisons vos données', 'partage de données',
        'rétention de données', 'avis de confidentialité', 'informations personnelles',
        'contrôleur de données'
    ];

    // Palavras-chave multi-idioma para Termos de Serviço
    const termsKeywords = [
        // Português
        'termos de serviço', 'termos e condições', 'contrato de utilizador',
        'condições de uso', 'termos do serviço', 'condições de utilização',
        'uso aceitável', 'usos proibidos', 'responsabilidade',
        'limitação de responsabilidade', 'obrigações do utilizador',
        'descrição do serviço', 'termos de pagamento', 'política de cancelamento',

        // Inglês
        'terms of service', 'terms and conditions', 'user agreement',
        'terms of use', 'service terms', 'conditions of use',
        'acceptable use', 'prohibited uses', 'liability',
        'limitation of liability', 'user obligations',
        'service description', 'payment terms', 'cancellation policy',

        // Espanhol
        'términos de servicio', 'términos y condiciones', 'acuerdo de usuario',
        'términos de uso', 'términos del servicio', 'condiciones de uso',
        'uso aceptable', 'usos prohibidos', 'responsabilidad',
        'limitación de responsabilidad', 'obligaciones del usuario',
        'descripción del servicio', 'términos de pago', 'política de cancelación',

        // Francês
        'conditions de service', 'conditions générales', 'accord utilisateur',
        'conditions d\'utilisation', 'conditions du service', 'conditions d\'usage',
        'utilisation acceptable', 'utilisations interdites', 'responsabilité',
        'limitation de responsabilité', 'obligations de l\'utilisateur',
        'description du service', 'conditions de paiement', 'politique d\'annulation'
    ];

    // Contar ocorrências com word boundaries para evitar falsos positivos
    const privacyCount = privacyKeywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        return count + matches;
    }, 0);

    const termsCount = termsKeywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        return count + matches;
    }, 0);

    // Determinar tipo baseado na contagem (com threshold mínimo)
    const minThreshold = 2;

    if (privacyCount >= minThreshold && privacyCount > termsCount) {
        return 'privacy_policy';
    } else if (termsCount >= minThreshold && termsCount > privacyCount) {
        return 'terms_of_service';
    } else if (privacyCount > 0 || termsCount > 0) {
        // Se há pelo menos uma ocorrência, usar a maior contagem
        if (privacyCount > termsCount) {
            return 'privacy_policy';
        } else if (termsCount > privacyCount) {
            return 'terms_of_service';
        }
    }

    // Fallback baseado em palavras-chave simples
    if (lowerText.includes('privacidade') || lowerText.includes('privacy')) {
        return 'privacy_policy';
    } else if (lowerText.includes('termos') || lowerText.includes('terms')) {
        return 'terms_of_service';
    }

    return 'unknown';
}

export default detectDocumentType;
