document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. CÓDIGO DO MENU MOBILE (MANTIDO)
    // ----------------------------------------------------
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });

    // ----------------------------------------------------
    // 2. CÓDIGO DE INTEGRAÇÃO COM API DE ESPORTES
    // Utilizamos a API Pública da ESPN para placares do Brasileirão
    // ----------------------------------------------------
    const tickerContainer = document.getElementById('jogos-ticker');

    // Endpoint público da ESPN para o Campeonato Brasileiro Série A
    const API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard';

    async function buscarJogos() {
        try {
            // Faz a requisição para a API
            const resposta = await fetch(API_URL);
            const dados = await resposta.json();

            // Limpa o texto "Carregando..."
            tickerContainer.innerHTML = '';

            const eventos = dados.events; // Array contendo as partidas

            if (eventos && eventos.length > 0) {
                eventos.forEach(jogo => {
                    // Extrai os dados do jogo da estrutura complexa do JSON da ESPN
                    const competidores = jogo.competitions[0].competitors;
                    const timeCasa = competidores.find(c => c.homeAway === 'home');
                    const timeFora = competidores.find(c => c.homeAway === 'away');

                    const nomeCasa = timeCasa.team.shortDisplayName;
                    const placarCasa = timeCasa.score;
                    const nomeFora = timeFora.team.shortDisplayName;
                    const placarFora = timeFora.score;

                    const status = jogo.status.type; // status do jogo (agendado, em andamento, finalizado)
                    const isAoVivo = status.state === 'in'; // 'in' significa "In Progress" (Em andamento)

                    // Criação do elemento HTML com o resultado
                    const divItem = document.createElement('div');
                    divItem.className = 'ticker-item';

                    // Formata o prefixo dependendo se está ao vivo ou não
                    let prefixo = isAoVivo 
                        ? `<span class="live">• AO VIVO</span> Brasileirão: ` 
                        : `Brasileirão: `;

                    // Formata o sufixo (ex: "FT" para fim de jogo, ou o tempo em minutos se ao vivo)
                    let sufixo = status.shortDetail ? ` (${status.shortDetail})` : '';

                    // Monta a string HTML mantendo as classes originais CSS do seu projeto
                    divItem.innerHTML = `${prefixo} <span class="score">${nomeCasa} ${placarCasa}</span> x <span class="score">${placarFora} ${nomeFora}</span> <span class="text-xs text-gray-400">${sufixo}</span>`;

                    // Adiciona na barra
                    tickerContainer.appendChild(divItem);
                });
            } else {
                // Caso a API não tenha jogos listados no momento
                tickerContainer.innerHTML = `<div class="ticker-item">Nenhum jogo do Brasileirão em destaque no momento.</div>`;
            }
        } catch (erro) {
            console.error("Erro ao buscar dados da API ESPN:", erro);
            tickerContainer.innerHTML = `<div class="ticker-item">Erro ao carregar resultados esportivos ao vivo.</div>`;
        }
    }

    // Chama a função imediatamente para preencher a tela
    buscarJogos();

    // Configura um timer para atualizar os resultados a cada 60 segundos (60000ms)
    setInterval(buscarJogos, 60000);
});
