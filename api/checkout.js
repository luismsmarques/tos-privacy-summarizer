// api/checkout.js - Função API para servir checkout.html
export default function handler(req, res) {
    // Verificar método HTTP
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Servir uma página HTML simples primeiro
    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprar Créditos - ToS & Privacy Summarizer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .package {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            cursor: pointer;
            transition: border-color 0.3s;
        }
        .package:hover {
            border-color: #007bff;
        }
        .package.selected {
            border-color: #007bff;
            background: #f8f9fa;
        }
        .package-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .package-name {
            font-size: 18px;
            font-weight: bold;
        }
        .package-price {
            font-size: 24px;
            color: #007bff;
            font-weight: bold;
        }
        .checkout-button {
            width: 100%;
            background: #007bff;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        .checkout-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            display: none;
        }
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💳 Comprar Créditos</h1>
        
        <div class="error-message" id="errorMessage"></div>
        <div class="success-message" id="successMessage"></div>
        
        <div class="packages">
            <div class="package" data-package="starter" data-price="2.99" data-credits="20">
                <div class="package-header">
                    <div class="package-name">Pacote Starter</div>
                    <div class="package-price">€2.99</div>
                </div>
                <div>20 créditos • €0.15 por crédito</div>
            </div>
            
            <div class="package" data-package="professional" data-price="9.99" data-credits="100">
                <div class="package-header">
                    <div class="package-name">Pacote Professional</div>
                    <div class="package-price">€9.99</div>
                </div>
                <div>100 créditos • €0.10 por crédito</div>
            </div>
            
            <div class="package" data-package="business" data-price="19.99" data-credits="250">
                <div class="package-header">
                    <div class="package-name">Pacote Business</div>
                    <div class="package-price">€19.99</div>
                </div>
                <div>250 créditos • €0.08 por crédito</div>
            </div>
        </div>
        
        <button class="checkout-button" id="checkoutButton" disabled>
            Selecionar um Pacote
        </button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Checkout carregado');
            
            const packages = document.querySelectorAll('.package');
            const checkoutButton = document.getElementById('checkoutButton');
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            
            let selectedPackage = null;
            let userId = 'user_' + Date.now();
            
            // Seleção de pacotes
            packages.forEach(packageEl => {
                packageEl.addEventListener('click', () => {
                    packages.forEach(pkg => pkg.classList.remove('selected'));
                    packageEl.classList.add('selected');
                    
                    selectedPackage = {
                        name: packageEl.dataset.package,
                        price: parseFloat(packageEl.dataset.price),
                        credits: parseInt(packageEl.dataset.credits)
                    };
                    
                    checkoutButton.disabled = false;
                    checkoutButton.textContent = \`Comprar \${selectedPackage.credits} Créditos - €\${selectedPackage.price.toFixed(2)}\`;
                });
            });
            
            // Checkout
            checkoutButton.addEventListener('click', async () => {
                if (!selectedPackage) return;
                
                try {
                    checkoutButton.disabled = true;
                    checkoutButton.textContent = 'Processando...';
                    
                    const response = await fetch('https://tos-privacy-summarizer.vercel.app/api/stripe/create-checkout-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: userId,
                            package: selectedPackage.name,
                            credits: selectedPackage.credits,
                            price: selectedPackage.price,
                            currency: 'EUR'
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }
                    
                    const data = await response.json();
                    console.log('Sessão criada:', data);
                    
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        throw new Error('URL não recebida');
                    }
                    
                } catch (error) {
                    console.error('Erro:', error);
                    errorMessage.textContent = 'Erro: ' + error.message;
                    errorMessage.style.display = 'block';
                    checkoutButton.disabled = false;
                    checkoutButton.textContent = 'Tentar Novamente';
                }
            });
            
            // Verificar status do pagamento
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            const success = urlParams.get('success');
            
            if (success === 'true' && sessionId) {
                successMessage.textContent = 'Pagamento confirmado! Créditos adicionados à sua conta.';
                successMessage.style.display = 'block';
                
                // Limpar URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (success === 'false') {
                errorMessage.textContent = 'Pagamento cancelado.';
                errorMessage.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}