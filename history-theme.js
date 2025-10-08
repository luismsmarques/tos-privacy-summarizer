// Theme functionality for history page
const themeToggle = document.getElementById('themeToggle');

function initializeTheme() {
    // Verificar se estamos executando como extensão
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            
            const icon = themeToggle.querySelector('.material-icons');
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    } else {
        // Fallback para página web - usar localStorage
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Verificar se estamos executando como extensão
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ theme: newTheme });
    } else {
        // Fallback para página web - usar localStorage
        localStorage.setItem('theme', newTheme);
    }
    
    const icon = themeToggle.querySelector('.material-icons');
    icon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    themeToggle.addEventListener('click', toggleTheme);
});
