// Email service para envio de confirmações de pagamento
import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    async initializeTransporter() {
        try {
            // Configuração para Gmail (pode ser alterada para outros provedores)
            this.transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS // App password para Gmail
                }
            });

            // Verificar conexão
            await this.transporter.verify();
            console.log('✅ Serviço de email configurado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao configurar serviço de email:', error);
            this.transporter = null;
        }
    }

    async sendPaymentConfirmation(userEmail, paymentData) {
        if (!this.transporter) {
            console.error('❌ Serviço de email não configurado');
            return false;
        }

        try {
            const { userId, credits, packageName, price, transactionId } = paymentData;

            const mailOptions = {
                from: {
                    name: 'ToS & Privacy Summarizer',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: `✅ Pagamento Confirmado - ${credits} Créditos Adicionados`,
                html: this.generatePaymentConfirmationHTML(paymentData),
                text: this.generatePaymentConfirmationText(paymentData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de confirmação enviado:', result.messageId);
            return true;

        } catch (error) {
            console.error('❌ Erro ao enviar email de confirmação:', error);
            return false;
        }
    }

    generatePaymentConfirmationHTML(paymentData) {
        const { userId, credits, packageName, price, transactionId, date } = paymentData;
        
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Pagamento</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .success-icon {
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .content {
            margin-bottom: 30px;
        }
        .payment-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .detail-label {
            font-weight: 500;
            color: #555;
        }
        .detail-value {
            color: #333;
            font-weight: 600;
        }
        .credits-highlight {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .next-steps {
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 20px;
            margin: 20px 0;
        }
        .next-steps h3 {
            color: #1976D2;
            margin-top: 0;
        }
        .next-steps ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin-bottom: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #4CAF50;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .button {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
        }
        .button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <div class="logo">ToS & Privacy Summarizer</div>
            <h1 class="title">Pagamento Confirmado!</h1>
            <p class="subtitle">Os seus créditos foram adicionados com sucesso</p>
        </div>

        <div class="content">
            <p>Olá!</p>
            <p>Obrigado pela sua compra! O seu pagamento foi processado com sucesso e os créditos já foram adicionados à sua conta.</p>

            <div class="credits-highlight">
                🎉 ${credits} Créditos Adicionados à Sua Conta!
            </div>

            <div class="payment-details">
                <h3 style="margin-top: 0; color: #333;">Detalhes da Transação</h3>
                <div class="detail-row">
                    <span class="detail-label">Pacote:</span>
                    <span class="detail-value">${packageName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Créditos:</span>
                    <span class="detail-value">${credits}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Valor:</span>
                    <span class="detail-value">€${price}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${date || new Date().toLocaleDateString('pt-PT')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">ID da Transação:</span>
                    <span class="detail-value">${transactionId}</span>
                </div>
            </div>

            <div class="next-steps">
                <h3>Próximos Passos</h3>
                <ul>
                    <li>Os seus créditos estão disponíveis imediatamente</li>
                    <li>Pode começar a usar a extensão para analisar documentos</li>
                    <li>Os créditos são deduzidos automaticamente a cada análise</li>
                    <li>Pode comprar mais créditos a qualquer momento</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://chrome.google.com/webstore" class="button">
                    🚀 Começar a Usar a Extensão
                </a>
            </div>

            <p>Se tiver alguma questão ou precisar de ajuda, não hesite em contactar-nos.</p>
        </div>

        <div class="footer">
            <p><strong>ToS & Privacy Summarizer</strong></p>
            <p>Feito com ❤️ por <a href="https://atlasinvencivel.pt/">Luis Marques</a></p>
            <p>Este email foi enviado automaticamente. Por favor, não responda a este email.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    generatePaymentConfirmationText(paymentData) {
        const { userId, credits, packageName, price, transactionId, date } = paymentData;
        
        return `
ToS & Privacy Summarizer - Confirmação de Pagamento

✅ Pagamento Confirmado!

Olá!

Obrigado pela sua compra! O seu pagamento foi processado com sucesso e os créditos já foram adicionados à sua conta.

🎉 ${credits} Créditos Adicionados à Sua Conta!

Detalhes da Transação:
- Pacote: ${packageName}
- Créditos: ${credits}
- Valor: €${price}
- Data: ${date || new Date().toLocaleDateString('pt-PT')}
- ID da Transação: ${transactionId}

Próximos Passos:
- Os seus créditos estão disponíveis imediatamente
- Pode começar a usar a extensão para analisar documentos
- Os créditos são deduzidos automaticamente a cada análise
- Pode comprar mais créditos a qualquer momento

Se tiver alguma questão ou precisar de ajuda, não hesite em contactar-nos.

---
ToS & Privacy Summarizer
Feito com ❤️ por Luis Marques (https://atlasinvencivel.pt/)

Este email foi enviado automaticamente. Por favor, não responda a este email.
        `;
    }

    async sendWelcomeEmail(userEmail, userData) {
        if (!this.transporter) {
            console.error('❌ Serviço de email não configurado');
            return false;
        }

        try {
            const mailOptions = {
                from: {
                    name: 'ToS & Privacy Summarizer',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: '🎉 Bem-vindo ao ToS & Privacy Summarizer!',
                html: this.generateWelcomeHTML(userData),
                text: this.generateWelcomeText(userData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de boas-vindas enviado:', result.messageId);
            return true;

        } catch (error) {
            console.error('❌ Erro ao enviar email de boas-vindas:', error);
            return false;
        }
    }

    generateWelcomeHTML(userData) {
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo!</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .welcome-icon {
            font-size: 48px;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .content {
            margin-bottom: 30px;
        }
        .features {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .features h3 {
            color: #333;
            margin-top: 0;
        }
        .features ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .features li {
            margin-bottom: 8px;
        }
        .credits-info {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #4CAF50;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .button {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
        }
        .button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="welcome-icon">🎉</div>
            <div class="logo">ToS & Privacy Summarizer</div>
            <h1 class="title">Bem-vindo!</h1>
            <p class="subtitle">A sua conta foi criada com sucesso</p>
        </div>

        <div class="content">
            <p>Olá!</p>
            <p>Bem-vindo ao ToS & Privacy Summarizer! A sua conta foi criada com sucesso e está pronta para usar.</p>

            <div class="credits-info">
                🎁 5 Créditos Grátis Incluídos!
            </div>

            <div class="features">
                <h3>O que pode fazer:</h3>
                <ul>
                    <li>📄 Analisar Termos de Serviço e Políticas de Privacidade</li>
                    <li>🤖 Obter resumos inteligentes usando IA</li>
                    <li>⚠️ Identificar alertas de privacidade importantes</li>
                    <li>⚡ Economizar tempo na leitura de documentos legais</li>
                    <li>💳 Comprar mais créditos quando necessário</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://chrome.google.com/webstore" class="button">
                    🚀 Começar a Usar Agora
                </a>
            </div>

            <p>Se tiver alguma questão ou precisar de ajuda, não hesite em contactar-nos.</p>
        </div>

        <div class="footer">
            <p><strong>ToS & Privacy Summarizer</strong></p>
            <p>Feito com ❤️ por <a href="https://atlasinvencivel.pt/">Luis Marques</a></p>
            <p>Este email foi enviado automaticamente. Por favor, não responda a este email.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    generateWelcomeText(userData) {
        return `
ToS & Privacy Summarizer - Bem-vindo!

🎉 Bem-vindo!

Olá!

Bem-vindo ao ToS & Privacy Summarizer! A sua conta foi criada com sucesso e está pronta para usar.

🎁 5 Créditos Grátis Incluídos!

O que pode fazer:
- 📄 Analisar Termos de Serviço e Políticas de Privacidade
- 🤖 Obter resumos inteligentes usando IA
- ⚠️ Identificar alertas de privacidade importantes
- ⚡ Economizar tempo na leitura de documentos legais
- 💳 Comprar mais créditos quando necessário

Se tiver alguma questão ou precisar de ajuda, não hesite em contactar-nos.

---
ToS & Privacy Summarizer
Feito com ❤️ por Luis Marques (https://atlasinvencivel.pt/)

Este email foi enviado automaticamente. Por favor, não responda a este email.
        `;
    }
}

export default EmailService;
