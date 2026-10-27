// O menu mobile agora é controlado por js/nav.js (painel lateral à direita).

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service worker registrado.'))
            .catch(err => console.error('Falha ao registrar o service worker:', err));
    });
}
