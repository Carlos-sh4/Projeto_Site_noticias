// Alterna entre modo claro e escuro, com o ícone (sol/lua) refletindo o
// modo atual e a preferência salva no localStorage entre visitas.
//
// Importante: o Font Awesome (via Kit) troca automaticamente cada <i> por um
// <svg> depois que a página carrega. Depois dessa troca, mudar a classe do
// elemento (ex: de "fa-sun" para "fa-moon") não atualiza mais o desenho do
// ícone na tela — por isso o ícone antes só "mudava" ao atualizar a página
// (quando o <i> ainda não tinha virado <svg>). A correção usa DOIS ícones
// (sol e lua) e apenas mostra/esconde cada um, o que funciona mesmo depois
// da troca do Font Awesome.
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

        var sol = document.getElementById('theme-icon-sun');
        var lua = document.getElementById('theme-icon-moon');
        if (sol && lua) {
            if (theme === 'dark') {
                sol.classList.add('hidden');
                lua.classList.remove('hidden');
            } else {
                lua.classList.add('hidden');
                sol.classList.remove('hidden');
            }
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
