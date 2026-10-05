// Alterna entre modo claro e escuro, com o ícone (sol/lua) refletindo o
// modo atual e a preferência salva no localStorage entre visitas.
(function () {
    var STORAGE_KEY = 'site-theme';

    function getSavedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'light';
        } catch (e) {
            return 'light';
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            /* localStorage indisponível: a preferência só vale para esta sessão */
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        var icon = document.getElementById('theme-toggle-icon');
        if (icon) {
            icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }

        var btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.setAttribute(
                'aria-label',
                theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'
            );
        }
    }

    // Garante que o ícone e o atributo já estejam corretos assim que o
    // restante da página carregar (o atributo em si já foi aplicado mais
    // cedo, por um script embutido no <head>, para evitar o "flash" do
    // tema errado).
    applyTheme(getSavedTheme());

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme') || 'light';
            var next = current === 'dark' ? 'light' : 'dark';
            saveTheme(next);
            applyTheme(next);
        });
    });
})();
