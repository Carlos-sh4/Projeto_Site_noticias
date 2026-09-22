document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    btn.addEventListener('click', () => {
        // Alterna a visibilidade do menu (removendo ou adicionando a classe "hidden")
        menu.classList.toggle('hidden');
    });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service worker registrado.'))
            .catch(err => console.error('Falha ao registrar o service worker:', err));
    });
}
