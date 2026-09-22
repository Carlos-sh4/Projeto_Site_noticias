document.addEventListener('DOMContentLoaded', () => {
    // Menu mobile
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });

    // Envio do formulário (front-end apenas; sem backend conectado ainda)
    const form = document.getElementById('form-contato');
    const sucesso = document.getElementById('mensagem-sucesso');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        sucesso.classList.remove('hidden');
        form.reset();
        sucesso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service worker registrado.'))
            .catch(err => console.error('Falha ao registrar o service worker:', err));
    });
}
