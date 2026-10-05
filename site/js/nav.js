// Comportamento do cabeçalho padrão do site:
//   1) menu mobile como painel lateral à direita (em vez de tela cheia);
//   2) botão de Login/Cadastro que muda de ícone conforme o usuário
//      já esteja logado ou não (usa o "Auth" definido em js/auth.js).
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        iniciarMenuMobile();
        iniciarBotaoDeConta();
    });

    // ===== Menu mobile: painel lateral à direita =====
    function iniciarMenuMobile() {
        var btn = document.getElementById('mobile-menu-btn');
        var menu = document.getElementById('mobile-menu');
        var overlay = document.getElementById('mobile-menu-overlay');
        var fechar = document.getElementById('mobile-menu-close');
        if (!btn || !menu || !overlay) return;

        function abrir() {
            overlay.classList.remove('hidden');
            menu.classList.remove('translate-x-full');
            menu.classList.add('translate-x-0');
            document.body.classList.add('overflow-hidden');
        }

        function fecharMenu() {
            menu.classList.remove('translate-x-0');
            menu.classList.add('translate-x-full');
            overlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }

        btn.addEventListener('click', function () {
            var aberto = menu.classList.contains('translate-x-0');
            if (aberto) {
                fecharMenu();
            } else {
                abrir();
            }
        });

        overlay.addEventListener('click', fecharMenu);
        if (fechar) fechar.addEventListener('click', fecharMenu);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') fecharMenu();
        });

        // Fecha o painel se a tela crescer o suficiente para virar o menu de desktop.
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 1024) fecharMenu();
        });
    }

    // ===== Botão de Login/Cadastro: ícone muda conforme o login =====
    function iniciarBotaoDeConta() {
        var link = document.getElementById('auth-nav-btn');
        var icone = document.getElementById('auth-nav-icon');
        if (!link || !icone) return;

        var usuario = (window.Auth && typeof window.Auth.usuarioAtual === 'function')
            ? window.Auth.usuarioAtual()
            : null;

        if (usuario) {
            // Tem sessão ativa: ícone preenchido; clicar faz logout.
            icone.className = 'fa-solid fa-circle-user text-lg text-blue-600';
            link.href = '#';
            var rotulo = 'Sair da conta (' + usuario.nome + ')';
            link.setAttribute('aria-label', rotulo);
            link.setAttribute('title', rotulo);
            link.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.Auth && typeof window.Auth.sair === 'function') {
                    window.Auth.sair();
                }
            });
        } else {
            // Ninguém logado: ícone de contorno; clicar leva ao login.
            icone.className = 'fa-regular fa-user text-lg';
            link.href = 'login.html';
            link.setAttribute('aria-label', 'Entrar ou cadastrar-se');
            link.setAttribute('title', 'Entrar ou cadastrar-se');
        }
    }
})();
