// Checkout script para compra de créditos
document.addEventListener('DOMContentLoaded', function() {
    console.log('Checkout script carregado');

    // Elementos do DOM
    const packages = document.querySelectorAll('.package');
    const checkoutButton = document.getElementById('checkoutButton');
    const currentCredits = document.getElementById('currentCredits');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loading = document.getElementById('loading');
    const themeToggle = document.getElementById('themeToggle');

    // Estado da aplicação
    let selectedPackage = null;
    let userId = null;

    // Inicializar aplicação
    initializeCheckout();

    // Função de inicialização
    async function initializeCheckout() {
        console.log('Inicializando checkout...');
        
        // Inicializar tema
        initializeTheme();
        
        // Carregar créditos atuais
        await loadCurrentCredits();
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('Checkout inicializado');
    }

    // Carregar créditos atuais
    async function loadCurrentCredits() {
        try {
            const result = await chrome.storage.local.get(['sharedCredits', 'apiKey', 'userId']);
            const credits = result.sharedCredits || 5;
            const hasApiKey = !!result.apiKey;
            userId = result.userId;

            if (hasApiKey) {
                currentCredits.textContent = 'Conta Premium (Ilimitado)';
                // Desabilitar compra se já tem API key
                checkoutButton.disabled = true;
                checkoutButton.innerHTML = '<span class="material-icons">check_circle</span>Conta Premium Ativa';
            } else {
                currentCredits.textContent = `${credits} Créditos Grátis Restantes`;
            }
        } catch (error) {
            console.error('Erro ao carregar créditos:', error);
            currentCredits.textContent = 'Erro ao carregar créditos';
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Seleção de pacotes
        packages.forEach(packageEl => {
            packageEl.addEventListener('click', () => {
                selectPackage(packageEl);
            });
        });

        // Botão de checkout
        checkoutButton.addEventListener('click', handleCheckout);
        
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Selecionar pacote
    function selectPackage(packageEl) {
        // Remover seleção anterior
        packages.forEach(pkg => pkg.classList.remove('selected'));
        
        // Selecionar novo pacote
        packageEl.classList.add('selected');
        selectedPackage = {
            name: packageEl.dataset.package,
            price: parseFloat(packageEl.dataset.price),
            credits: parseInt(packageEl.dataset.credits)
        };

        // Atualizar botão
        checkoutButton.disabled = false;
        checkoutButton.innerHTML = `
            <span class="material-icons">shopping_cart</span>
            Comprar ${selectedPackage.credits} Créditos - €${selectedPackage.price.toFixed(2)}
        `;

        console.log('Pacote selecionado:', selectedPackage);
    }

    // Handler para checkout
    async function handleCheckout() {
        if (!selectedPackage) return;

        try {
            console.log('Iniciando checkout para:', selectedPackage);
            
            // Mostrar loading
            showLoading(true);
            hideMessages();

            // Criar sessão de checkout no Stripe
            const checkoutSession = await createCheckoutSession(selectedPackage);
            
            if (checkoutSession && checkoutSession.url) {
                // Redirecionar para o Stripe Checkout
                window.location.href = checkoutSession.url;
            } else {
                throw new Error('Erro ao criar sessão de checkout');
            }

        } catch (error) {
            console.error('Erro no checkout:', error);
            showError('Erro ao processar pagamento: ' + error.message);
            showLoading(false);
        }
    }

    // Criar sessão de checkout no Stripe
    async function createCheckoutSession(packageData) {
        try {
            const response = await fetch('https://tos-privacy-summarizer.vercel.app/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    package: packageData.name,
                    credits: packageData.credits,
                    price: packageData.price,
                    currency: 'EUR'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Sessão de checkout criada:', data);
            return data;

        } catch (error) {
            console.error('Erro ao criar sessão de checkout:', error);
            throw error;
        }
    }

    // Verificar status do pagamento (quando retorna do Stripe)
    async function checkPaymentStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const success = urlParams.get('success');

        if (success === 'true' && sessionId) {
            try {
                console.log('Verificando status do pagamento...');
                showLoading(true);

                const response = await fetch('https://tos-privacy-summarizer.vercel.app/api/stripe/verify-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        userId: userId
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        showSuccess(`Pagamento confirmado! ${result.credits} créditos adicionados à sua conta.`);
                        
                        // Atualizar créditos locais
                        await updateLocalCredits(result.newBalance);
                        
                        // Limpar URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        showError('Erro ao confirmar pagamento: ' + result.error);
                    }
                } else {
                    showError('Erro ao verificar pagamento');
                }

            } catch (error) {
                console.error('Erro ao verificar pagamento:', error);
                showError('Erro ao verificar pagamento: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
    }

    // Atualizar créditos locais
    async function updateLocalCredits(newBalance) {
        try {
            await chrome.storage.local.set({ sharedCredits: newBalance });
            await loadCurrentCredits();
        } catch (error) {
            console.error('Erro ao atualizar créditos locais:', error);
        }
    }

    // Mostrar loading
    function showLoading(show) {
        if (show) {
            loading.style.display = 'block';
            checkoutButton.disabled = true;
        } else {
            loading.style.display = 'none';
            checkoutButton.disabled = !selectedPackage;
        }
    }

    // Mostrar erro
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    // Mostrar sucesso
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    // Esconder mensagens
    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Funções de tema
    function initializeTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            
            // Atualizar ícone do botão
                const icon = themeToggle.querySelector('.material-icons');
                icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        chrome.storage.local.set({ theme: newTheme });
        
        // Atualizar ícone do botão
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    // Verificar status do pagamento quando a página carrega
    checkPaymentStatus();
});
