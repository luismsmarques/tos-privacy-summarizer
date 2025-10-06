#!/usr/bin/env node

// Screenshots Generator para Chrome Web Store
// ToS & Privacy Summarizer

const fs = require('fs');
const path = require('path');

// Função para criar screenshots usando HTML/CSS
function createScreenshots() {
    console.log('🎨 Criando screenshots para Chrome Web Store...');
    
    // Criar diretório para screenshots
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }
    
    // Template HTML para cada screenshot
    const screenshots = [
        {
            name: 'popup-principal',
            title: 'Popup Principal',
            description: 'Interface principal da extensão com botão de análise',
            dimensions: '640x400',
            html: createPopupHTML()
        },
        {
            name: 'pagina-resumo',
            title: 'Página de Resumo',
            description: 'Resultado da análise com rating de risco',
            dimensions: '640x400',
            html: createSummaryHTML()
        },
        {
            name: 'historico',
            title: 'Histórico de Análises',
            description: 'Lista de resumos anteriores com filtros',
            dimensions: '640x400',
            html: createHistoryHTML()
        },
        {
            name: 'configuracoes',
            title: 'Configurações',
            description: 'Página de configurações e preferências',
            dimensions: '640x400',
            html: createSettingsHTML()
        },
        {
            name: 'onboarding',
            title: 'Tutorial Inicial',
            description: 'Tutorial de boas-vindas para novos utilizadores',
            dimensions: '640x400',
            html: createOnboardingHTML()
        }
    ];
    
    // Criar arquivos HTML para cada screenshot
    screenshots.forEach(screenshot => {
        const filename = `${screenshot.name}-${screenshot.dimensions}.html`;
        const filepath = path.join(screenshotsDir, filename);
        
        const fullHTML = createFullHTML(screenshot);
        fs.writeFileSync(filepath, fullHTML);
        console.log(`✅ Criado: ${filename}`);
    });
    
    // Criar promo tiles
    const promoFiles = [
        {
            name: 'small-promo-tile',
            dimensions: '440x280',
            html: createSmallPromoHTML()
        },
        {
            name: 'marquee-promo-tile',
            dimensions: '1400x560',
            html: createMarqueePromoHTML()
        }
    ];
    
    promoFiles.forEach(promo => {
        const filename = `${promo.name}-${promo.dimensions}.html`;
        const filepath = path.join(screenshotsDir, filename);
        
        const fullHTML = createFullHTML({ html: promo.html });
        fs.writeFileSync(filepath, fullHTML);
        console.log(`✅ Criado: ${filename}`);
    });
    
    console.log('\n🎉 Screenshots criados com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Abra cada arquivo HTML no navegador');
    console.log('2. Use a ferramenta de captura de tela do navegador');
    console.log('3. Salve as imagens como PNG');
    console.log('4. Upload na Chrome Web Store');
    
    console.log('\n📁 Arquivos criados em:', screenshotsDir);
}

function createFullHTML(content) {
    return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Screenshot - ToS & Privacy Summarizer</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .screenshot-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .instructions {
            background: #2c3e50;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 14px;
        }
        .screenshot-content {
            position: relative;
        }
    </style>
</head>
<body>
    <div class="screenshot-container">
        <div class="instructions">
            📸 Screenshot para Chrome Web Store - ToS & Privacy Summarizer
        </div>
        <div class="screenshot-content">
            ${content.html}
        </div>
    </div>
</body>
</html>`;
}

function createPopupHTML() {
    return `
    <div style="width: 640px; height: 400px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="background: rgba(255,255,255,0.95); padding: 30px; border-radius: 12px; text-align: center; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
            <h2 style="font-size: 28px; font-weight: 700; color: #2c3e50; margin: 0 0 10px 0;">🤖 ToS & Privacy Summarizer</h2>
            <p style="font-size: 16px; color: #7f8c8d; margin: 0 0 25px 0;">Analise documentos legais com IA em segundos</p>
            <button style="background: linear-gradient(45deg, #3498db, #2980b9); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3); margin-bottom: 25px;">📄 Analisar Página</button>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚡</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Análise Rápida</div>
                </div>
                <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Rating de Risco</div>
                </div>
                <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Privacidade</div>
                </div>
            </div>
        </div>
    </div>`;
}

function createSummaryHTML() {
    return `
    <div style="width: 640px; height: 400px; background: #f8f9fa; display: flex; flex-direction: column;">
        <div style="background: #2c3e50; color: white; padding: 15px 20px; display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 24px;">📊</span>
            <h3 style="font-size: 18px; font-weight: 600; margin: 0;">Análise Completa</h3>
        </div>
        <div style="flex: 1; padding: 20px;">
            <div style="background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 36px; font-weight: 700; margin: 0;">7/10</div>
                <div style="font-size: 14px; margin: 5px 0 0 0;">Risco Médio</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; line-height: 1.6; color: #2c3e50;">
                <strong>Resumo:</strong> Esta política de privacidade coleta dados pessoais para melhorar o serviço. Os dados são compartilhados com terceiros para publicidade direcionada. Você pode optar por não participar, mas isso pode limitar a funcionalidade do serviço.
                <br><br>
                <strong>Pontos-chave:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Coleta de dados pessoais para personalização</li>
                    <li>Compartilhamento com parceiros de publicidade</li>
                    <li>Opção de opt-out disponível</li>
                    <li>Retenção de dados por 2 anos</li>
                </ul>
            </div>
        </div>
    </div>`;
}

function createHistoryHTML() {
    return `
    <div style="width: 640px; height: 400px; background: #f8f9fa; display: flex; flex-direction: column;">
        <div style="background: #27ae60; color: white; padding: 15px 20px; display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 24px;">📚</span>
            <h3 style="font-size: 18px; font-weight: 600; margin: 0;">Histórico de Análises</h3>
        </div>
        <div style="flex: 1; padding: 20px; overflow-y: auto;">
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 20px; color: #3498db;">📄</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c3e50; margin: 0 0 5px 0;">Política de Privacidade - Google</div>
                    <div style="font-size: 12px; color: #7f8c8d; margin: 0;">Analisado há 2 horas • 1,250 palavras</div>
                </div>
                <div style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">6/10</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 20px; color: #3498db;">📄</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c3e50; margin: 0 0 5px 0;">Termos de Serviço - Facebook</div>
                    <div style="font-size: 12px; color: #7f8c8d; margin: 0;">Analisado há 1 dia • 2,100 palavras</div>
                </div>
                <div style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">8/10</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 20px; color: #3498db;">📄</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c3e50; margin: 0 0 5px 0;">Política de Cookies - Amazon</div>
                    <div style="font-size: 12px; color: #7f8c8d; margin: 0;">Analisado há 3 dias • 850 palavras</div>
                </div>
                <div style="background: #27ae60; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">4/10</div>
            </div>
        </div>
    </div>`;
}

function createSettingsHTML() {
    return `
    <div style="width: 640px; height: 400px; background: #f8f9fa; display: flex; flex-direction: column;">
        <div style="background: #8e44ad; color: white; padding: 15px 20px; display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 24px;">⚙️</span>
            <h3 style="font-size: 18px; font-weight: 600; margin: 0;">Configurações</h3>
        </div>
        <div style="flex: 1; padding: 20px; overflow-y: auto;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h4 style="font-weight: 600; color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">🔧 Preferências</h4>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50px; height: 25px; background: #3498db; border-radius: 25px; position: relative;">
                        <div style="position: absolute; top: 2px; right: 2px; width: 21px; height: 21px; background: white; border-radius: 50%;"></div>
                    </div>
                    <span style="font-size: 14px; color: #2c3e50;">Análise automática</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50px; height: 25px; background: #3498db; border-radius: 25px; position: relative;">
                        <div style="position: absolute; top: 2px; right: 2px; width: 21px; height: 21px; background: white; border-radius: 50%;"></div>
                    </div>
                    <span style="font-size: 14px; color: #2c3e50;">Notificações de risco</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50px; height: 25px; background: #95a5a6; border-radius: 25px; position: relative;">
                        <div style="position: absolute; top: 2px; left: 2px; width: 21px; height: 21px; background: white; border-radius: 50%;"></div>
                    </div>
                    <span style="font-size: 14px; color: #2c3e50;">Modo escuro</span>
                </div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h4 style="font-weight: 600; color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">🔑 API</h4>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50px; height: 25px; background: #95a5a6; border-radius: 25px; position: relative;">
                        <div style="position: absolute; top: 2px; left: 2px; width: 21px; height: 21px; background: white; border-radius: 50%;"></div>
                    </div>
                    <span style="font-size: 14px; color: #2c3e50;">Usar chave própria</span>
                </div>
            </div>
        </div>
    </div>`;
}

function createOnboardingHTML() {
    return `
    <div style="width: 640px; height: 400px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="background: rgba(255,255,255,0.95); padding: 30px; border-radius: 12px; text-align: center; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
            <h2 style="font-size: 28px; font-weight: 700; color: #2c3e50; margin: 0 0 15px 0;">🎉 Bem-vindo!</h2>
            <p style="font-size: 16px; color: #7f8c8d; margin: 0 0 25px 0; line-height: 1.5;">Descubra como usar o ToS & Privacy Summarizer para entender documentos legais em segundos</p>
            <div style="display: flex; gap: 20px; margin: 20px 0; justify-content: center;">
                <div style="flex: 1; text-align: center;">
                    <div style="background: #3498db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-weight: 600;">1</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Navegue para uma página com termos legais</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="background: #3498db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-weight: 600;">2</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Clique no ícone da extensão</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="background: #3498db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-weight: 600;">3</div>
                    <div style="font-size: 12px; color: #2c3e50; font-weight: 600;">Veja o resumo e rating de risco</div>
                </div>
            </div>
            <button style="background: linear-gradient(45deg, #27ae60, #2ecc71); color: white; border: none; padding: 15px 30px; border-radius: 25px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);">🚀 Começar Agora</button>
        </div>
    </div>`;
}

function createSmallPromoHTML() {
    return `
    <div style="width: 440px; height: 280px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="text-align: center; color: white; z-index: 2;">
            <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 10px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🤖 ToS Summarizer</h2>
            <p style="font-size: 16px; margin: 0 0 20px 0; opacity: 0.9;">Entenda documentos legais com IA</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <span style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">⚡ Rápido</span>
                <span style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">🎯 Preciso</span>
                <span style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">🔒 Seguro</span>
            </div>
        </div>
    </div>`;
}

function createMarqueePromoHTML() {
    return `
    <div style="width: 1400px; height: 560px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 60px; position: relative; overflow: hidden;">
        <div style="flex: 1; color: white; z-index: 2;">
            <h1 style="font-size: 48px; font-weight: 700; margin: 0 0 20px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🤖 ToS & Privacy Summarizer</h1>
            <p style="font-size: 24px; margin: 0 0 30px 0; opacity: 0.9;">Transforme documentos legais complexos em resumos claros e compreensíveis</p>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <span style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 20px; font-size: 16px; font-weight: 600;">⚡ Análise em segundos</span>
                <span style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 20px; font-size: 16px; font-weight: 600;">🎯 Rating de risco inteligente</span>
                <span style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 20px; font-size: 16px; font-weight: 600;">🔒 Privacidade garantida</span>
                <span style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 20px; font-size: 16px; font-weight: 600;">📊 Histórico completo</span>
                <span style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 20px; font-size: 16px; font-weight: 600;">🎨 Interface moderna</span>
            </div>
        </div>
        <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
            <div style="font-size: 200px; opacity: 0.3; color: white;">📄</div>
        </div>
    </div>`;
}

// Executar se chamado diretamente
if (require.main === module) {
    createScreenshots();
}

module.exports = { createScreenshots };
