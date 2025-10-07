// Sistema de Internacionalização para ToS & Privacy Summarizer
class I18nManager {
    constructor() {
        this.currentLanguage = 'pt';
        this.translations = {};
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.loadLanguageSettings();
            await this.loadTranslations();
            this.isInitialized = true;
            console.log(`[I18n] Initialized with language: ${this.currentLanguage}`);
        } catch (error) {
            console.error('[I18n] Initialization error:', error);
            this.currentLanguage = 'pt'; // Fallback
        }
    }

    async loadLanguageSettings() {
        // Verificar se estamos no contexto da extensão
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            console.log('[I18n] Running outside extension context, using defaults');
            this.currentLanguage = 'pt';
            this.autoDetectLanguage = true;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            chrome.storage.local.get(['language', 'autoDetectLanguage'], (result) => {
                this.currentLanguage = result.language || 'pt';
                this.autoDetectLanguage = result.autoDetectLanguage !== false;
                resolve();
            });
        });
    }

    async loadTranslations() {
        const languages = ['pt', 'en', 'es', 'fr'];
        
        // Verificar se estamos no contexto da extensão
        const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL;
        
        for (const lang of languages) {
            try {
                let response;
                
                if (isExtensionContext) {
                    // Contexto da extensão - usar chrome.runtime.getURL
                    response = await fetch(chrome.runtime.getURL(`locales/${lang}.json`));
                } else {
                    // Contexto web - usar caminho relativo
                    response = await fetch(`locales/${lang}.json`);
                }
                
                if (response.ok) {
                    this.translations[lang] = await response.json();
                    console.log(`[I18n] Loaded translations for ${lang}`);
                } else {
                    console.warn(`[I18n] Failed to load translations for ${lang}`);
                    // Usar traduções em português como fallback
                    if (lang !== 'pt') {
                        this.translations[lang] = this.translations['pt'] || {};
                    }
                }
            } catch (error) {
                console.error(`[I18n] Error loading translations for ${lang}:`, error);
                // Usar traduções em português como fallback
                if (lang !== 'pt') {
                    this.translations[lang] = this.translations['pt'] || {};
                }
            }
        }
        
        // Garantir que pelo menos português está carregado
        if (!this.translations['pt']) {
            console.error('[I18n] Failed to load Portuguese translations, using fallback');
            this.translations['pt'] = {
                ui: { analyze: 'Analisar', summary: 'Resumo', history: 'Histórico', settings: 'Configurações' },
                analysis: { extract_summarize: 'Extrair & Resumir' },
                errors: { insufficient_text: 'Texto insuficiente para análise' },
                messages: { api_key_saved: 'Chave da API guardada com sucesso!' },
                document_types: { terms_of_service: 'Termos de Serviço', privacy_policy: 'Política de Privacidade', unknown: 'Outros', analyzing: 'A analisar...' },
                complexity: { low: 'Baixa', medium: 'Média', high: 'Alta', very_high: 'Muito Alta', extreme: 'Extrema', calculating: 'A calcular...' },
                time_saved: { minutes: 'minutos de leitura', calculating: 'A calcular...' },
                connection: { your_gemini_key: 'Sua Chave Gemini', using_personal_key: 'Usando sua chave API pessoal', server_api: 'API do Servidor', connected_ready: 'Conectado e pronto para análise', active: 'ATIVO' },
                credits: { free_credits_remaining: 'Créditos Grátis Restantes', free: 'GRÁTIS', cost: 'Crédito', insufficient_credits: 'Créditos insuficientes', buy_more_credits: 'Compre mais créditos ou configure a sua própria chave da API' },
                settings: { title: 'Configurações', api_key: 'Chave da API Gemini', api_key_placeholder: 'Cole aqui a sua chave da API Gemini', get_api_key: 'Obtenha a sua chave gratuita em', save_key: 'Guardar Chave', test_key: 'Testar Chave', preferences: 'Preferências', auto_detect: 'Detecção Automática de Páginas Legais', auto_detect_help: 'Detecta automaticamente se a página contém Termos de Serviço', notifications: 'Notificações de Sucesso', notifications_help: 'Mostra notificações quando o resumo é gerado', language: 'Idioma da Interface', auto_detect_language: 'Detectar idioma automaticamente', theme: 'Tema', light_theme: 'Tema Claro', dark_theme: 'Tema Escuro', reset_settings: 'Redefinir Configurações', export_settings: 'Exportar Configurações', privacy_policy: 'Política de Privacidade', terms_of_service: 'Termos de Serviço', show_onboarding: 'Mostrar Tutorial' }
            };
        }
    }

    t(key, params = {}) {
        if (!this.isInitialized) {
            console.warn('[I18n] Not initialized yet, returning key:', key);
            return key;
        }

        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (translation && typeof translation === 'object') {
                translation = translation[k];
            } else {
                console.warn(`[I18n] Translation not found for key: ${key}`);
                return key;
            }
        }

        if (typeof translation !== 'string') {
            console.warn(`[I18n] Translation is not a string for key: ${key}`);
            return key;
        }

        return this.interpolate(translation, params);
    }

    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    setLanguage(lang) {
        if (this.currentLanguage === lang) return;
        
        this.currentLanguage = lang;
        
        // Verificar se estamos no contexto da extensão
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ language: lang });
        }
        
        console.log(`[I18n] Language changed to: ${lang}`);
        
        // Notificar mudança de idioma
        this.notifyLanguageChange();
    }

    notifyLanguageChange() {
        // Disparar evento customizado para atualizar UI
        const event = new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        });
        document.dispatchEvent(event);
    }

    detectLanguage(text) {
        if (!text || typeof text !== 'string') {
            return this.currentLanguage;
        }

        const lowerText = text.toLowerCase();
        
        // Padrões de detecção por idioma
        const patterns = {
            pt: [
                /\b(termos|privacidade|dados|utilizador|serviço|política|aceitar|contrato|condições)\b/i,
                /\b(obrigações|responsabilidade|limitação|direitos|utilizador)\b/i,
                /\b(recolha|processamento|compartilhamento|retenção)\b/i
            ],
            en: [
                /\b(terms|privacy|data|user|service|policy|accept|agreement|conditions)\b/i,
                /\b(obligations|liability|limitation|rights|user)\b/i,
                /\b(collection|processing|sharing|retention)\b/i
            ],
            es: [
                /\b(términos|privacidad|datos|usuario|servicio|política|aceptar|contrato|condiciones)\b/i,
                /\b(obligaciones|responsabilidad|limitación|derechos|usuario)\b/i,
                /\b(recopilación|procesamiento|compartir|retención)\b/i
            ],
            fr: [
                /\b(termes|confidentialité|données|utilisateur|service|politique|accepter|contrat|conditions)\b/i,
                /\b(obligations|responsabilité|limitation|droits|utilisateur)\b/i,
                /\b(collecte|traitement|partage|rétention)\b/i
            ]
        };

        const scores = {};
        
        for (const [lang, langPatterns] of Object.entries(patterns)) {
            scores[lang] = 0;
            for (const pattern of langPatterns) {
                const matches = (lowerText.match(pattern) || []).length;
                scores[lang] += matches;
            }
        }

        // Encontrar idioma com maior score
        const bestMatch = Object.entries(scores).reduce((a, b) => 
            scores[a[0]] > scores[b[0]] ? a : b
        );

        // Se não há matches suficientes, usar idioma atual
        if (bestMatch[1] < 2) {
            return this.currentLanguage;
        }

        console.log(`[I18n] Detected language: ${bestMatch[0]} (score: ${bestMatch[1]})`);
        return bestMatch[0];
    }

    getSupportedLanguages() {
        return [
            { code: 'pt', name: '🇵🇹 Português', flag: '🇵🇹' },
            { code: 'en', name: '🇬🇧 English', flag: '🇬🇧' },
            { code: 'es', name: '🇪🇸 Español', flag: '🇪🇸' },
            { code: 'fr', name: '🇫🇷 Français', flag: '🇫🇷' }
        ];
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    isAutoDetectEnabled() {
        return this.autoDetectLanguage;
    }

    setAutoDetect(enabled) {
        this.autoDetectLanguage = enabled;
        
        // Verificar se estamos no contexto da extensão
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ autoDetectLanguage: enabled });
        }
        
        console.log(`[I18n] Auto-detect language set to: ${enabled}`);
    }

    // Método para atualizar elementos da UI
    updateUI() {
        // Atualizar elementos com data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Atualizar elementos com data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Atualizar elementos com data-i18n-aria-label
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            element.setAttribute('aria-label', this.t(key));
        });
    }

    // Método para criar seletor de idioma
    createLanguageSelector(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const languages = this.getSupportedLanguages();
        
        const selectorHTML = `
            <div class="language-selector">
                <label for="languageSelect">${this.t('settings.language')}:</label>
                <select id="languageSelect" class="language-select">
                    ${languages.map(lang => 
                        `<option value="${lang.code}" ${lang.code === this.currentLanguage ? 'selected' : ''}>
                            ${lang.name}
                        </option>`
                    ).join('')}
                </select>
            </div>
        `;

        container.innerHTML = selectorHTML;

        // Adicionar event listener
        const select = document.getElementById('languageSelect');
        if (select) {
            select.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
                this.updateUI();
            });
        }
    }
}

// Instância global
window.i18n = new I18nManager();

// Exportar para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nManager;
}
