/**
 * Install Tracker - Chrome Extension Installation Tracking
 * Tracks user interactions with install buttons and provides analytics
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        chromeStoreUrl: window.chromeStoreUrl || 'https://chromewebstore.google.com/detail/cknkibclkdgjhmokdnddbbenjlfkbabi',
        trackingEnabled: window.trackingEnabled ?? true,
        debugMode: false
    };

    // State
    const state = {
        installAttempts: 0,
        lastInstallAttempt: null,
        userAgent: navigator.userAgent,
        isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    };

    // Utility functions
    const utils = {
        log(message, data = null) {
            if (CONFIG.debugMode) {
                console.log(`[Install Tracker] ${message}`, data);
            }
        },

        trackEvent(eventName, properties = {}) {
            if (!CONFIG.trackingEnabled) return;

            // Reuse central analytics tracker when available to avoid duplicate pipelines.
            if (window.LandingPage?.analytics?.trackEvent) {
                window.LandingPage.analytics.trackEvent(eventName, properties);
                return;
            }

            const eventData = {
                event: eventName,
                timestamp: new Date().toISOString(),
                properties: {
                    ...properties,
                    userAgent: state.userAgent,
                    isChrome: state.isChrome,
                    url: window.location.href
                }
            };

            // Send to analytics (placeholder - replace with your analytics service)
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, properties);
            }

            utils.log('Event tracked', eventData);
        },

        isExtensionInstalled() {
            // Check if extension is already installed
            // This is a placeholder - actual implementation would depend on extension manifest
            return localStorage.getItem('tos-summarizer-installed') === 'true';
        },

        markExtensionInstalled() {
            localStorage.setItem('tos-summarizer-installed', 'true');
            utils.trackEvent('extension_installed');
        }
    };

    // Install button handler
    const installHandler = {
        handleClick(event) {
            event.preventDefault();
            const clickedElement = event.currentTarget;
            
            state.installAttempts++;
            state.lastInstallAttempt = new Date().toISOString();

            utils.trackEvent('install_button_clicked', {
                attemptNumber: state.installAttempts,
                buttonText: clickedElement.textContent.trim(),
                buttonLocation: clickedElement.closest('section')?.id || 'unknown'
            });
            utils.trackEvent('install_click', {
                cta_text: clickedElement.textContent.trim(),
                cta_location: clickedElement.closest('section')?.id || 'unknown',
                destination: CONFIG.chromeStoreUrl
            });

            // Check if already installed
            if (utils.isExtensionInstalled()) {
                this.showAlreadyInstalledMessage();
                return;
            }

            // Check if Chrome browser
            if (!state.isChrome) {
                this.showBrowserWarning();
                return;
            }

            // Redirect to Chrome Web Store
            this.redirectToChromeStore();
        },

        showAlreadyInstalledMessage() {
            const message = document.createElement('div');
            message.className = 'install-message success';
            message.innerHTML = `
                <div class="message-content">
                    <span class="message-icon">✅</span>
                    <span class="message-text">Extension já instalada! Clique no ícone da extensão na barra de ferramentas.</span>
                </div>
            `;
            
            this.showMessage(message);
            utils.trackEvent('already_installed_message_shown');
        },

        showBrowserWarning() {
            const message = document.createElement('div');
            message.className = 'install-message warning';
            message.innerHTML = `
                <div class="message-content">
                    <span class="message-icon">⚠️</span>
                    <span class="message-text">Esta extensão requer o Google Chrome. <a href="https://www.google.com/chrome/" target="_blank">Baixar Chrome</a></span>
                </div>
            `;
            
            this.showMessage(message);
            utils.trackEvent('browser_warning_shown');
        },

        redirectToChromeStore() {
            utils.trackEvent('redirecting_to_chrome_store');
            
            // Add small delay for tracking
            setTimeout(() => {
                window.open(CONFIG.chromeStoreUrl, '_blank', 'noopener,noreferrer');
            }, 100);
        },

        showMessage(messageElement) {
            // Remove existing messages
            const existingMessages = document.querySelectorAll('.install-message');
            existingMessages.forEach(msg => msg.remove());

            // Add styles if not already added
            if (!document.querySelector('#install-message-styles')) {
                const styles = document.createElement('style');
                styles.id = 'install-message-styles';
                styles.textContent = `
                    .install-message {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 10000;
                        padding: 16px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        max-width: 400px;
                        animation: slideInRight 0.3s ease-out;
                    }
                    
                    .install-message.success {
                        background: #10b981;
                        color: white;
                    }
                    
                    .install-message.warning {
                        background: #f59e0b;
                        color: white;
                    }
                    
                    .message-content {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .message-icon {
                        font-size: 20px;
                    }
                    
                    .message-text {
                        flex: 1;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    
                    .message-text a {
                        color: inherit;
                        text-decoration: underline;
                    }
                    
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(styles);
            }

            // Add message to page
            document.body.appendChild(messageElement);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.style.animation = 'slideInRight 0.3s ease-out reverse';
                    setTimeout(() => {
                        messageElement.remove();
                    }, 300);
                }
            }, 5000);
        }
    };

    // Installation detection
    const installationDetector = {
        init() {
            // Check for installation on page load
            this.checkInstallationStatus();

            // Listen for messages from extension (if extension supports it)
            window.addEventListener('message', (event) => {
                if (!this.isTrustedMessageEvent(event)) return;

                if (event.data && event.data.type === 'TOS_SUMMARIZER_INSTALLED') {
                    utils.markExtensionInstalled();
                    installHandler.showAlreadyInstalledMessage();
                }
            });
        },

        isTrustedMessageEvent(event) {
            // Accept only same-origin messages emitted in this browsing context.
            return event.origin === window.location.origin && event.source === window;
        },

        checkInstallationStatus() {
            // This is a placeholder - actual implementation would depend on extension
            // For now, we'll just track that we're checking
            utils.trackEvent('installation_status_checked');
        }
    };

    // Initialize
    const init = () => {
        utils.log('Install Tracker initialized');

        // Enforce secure new-tab behavior for all extension install links.
        const installAnchors = document.querySelectorAll(
            'a[href*="chromewebstore.google.com/detail/cknkibclkdgjhmokdnddbbenjlfkbabi"], a[href*="chromewebstore.google.com/detail/tos-privacy-summarizer"], a[href*="chrome.google.com/webstore/detail/tos-privacy-summarizer"]'
        );
        installAnchors.forEach(anchor => {
            anchor.setAttribute('target', '_blank');
            anchor.setAttribute('rel', 'noopener noreferrer');
        });

        // Attach click handlers to all install buttons
        const installButtons = document.querySelectorAll(
            '.install-btn, [href*="chromewebstore.google.com/detail/cknkibclkdgjhmokdnddbbenjlfkbabi"], [href*="chromewebstore.google.com/detail/tos-privacy-summarizer"], [href*="chrome.google.com/webstore/detail/tos-privacy-summarizer"]'
        );
        installButtons.forEach(button => {
            button.addEventListener('click', installHandler.handleClick.bind(installHandler));
        });

        // Initialize installation detection
        installationDetector.init();

        // Track page view
        utils.trackEvent('page_viewed', {
            page: window.location.pathname,
            referrer: document.referrer
        });
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.installTracker = {
        state,
        utils,
        CONFIG
    };

})();