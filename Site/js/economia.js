// --- 1. LÓGICA DO MENU MOBILE ---
const btn = document.getElementById('mobile-menu-btn');
const menu = document.getElementById('mobile-menu');
btn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
});

// --- 2. LÓGICA DA API FINANCEIRA (AWESOME API) E CALCULADORA ---
const amountInput = document.getElementById('amount');
const currencySelect = document.getElementById('currency');
const resultDiv = document.getElementById('conversion-result');
const taxaAplicadaSpan = document.getElementById('taxa-aplicada');
const tickerElement = document.getElementById('ticker-content');

// Objeto para armazenar as cotações que vierem da API
let taxasReais = { 'USD': 0, 'EUR': 0, 'GBP': 0, 'BTC': 0 };

async function atualizarDadosEconomicos() {
    try {
        // Requisição pública e sem chave da AwesomeAPI
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL');
        const data = await response.json();

        // Função auxiliar para criar cada item do Ticker
        const formatarTicker = (moeda, simbolo, nome) => {
            const valor = parseFloat(moeda.bid).toLocaleString('pt-BR', {minimumFractionDigits: 2});
            const pct = parseFloat(moeda.pctChange);
            const colorClass = pct >= 0 ? 'text-green-400' : 'text-red-400';
            const icon = pct >= 0 ? '▲' : '▼';

            return `<span class="mx-6 font-semibold tracking-wide">
                        ${nome} ${simbolo} ${valor} 
                        <span class="${colorClass} ml-1 text-sm font-bold">${icon} ${pct}%</span>
                    </span> &bull; `;
        };

        // Montar o HTML do Ticker
        let tickerHTML = '';
        tickerHTML += formatarTicker(data.USDBRL, '$', 'DÓLAR');
        tickerHTML += formatarTicker(data.EURBRL, '€', 'EURO');
        tickerHTML += formatarTicker(data.BTCBRL, '₿', 'BITCOIN');
        tickerHTML += formatarTicker(data.GBPBRL, '£', 'LIBRA');

        // Duplicar o conteúdo para a animação do marquee ficar fluida (sem buracos)
        tickerElement.innerHTML = tickerHTML + tickerHTML;

        // Atualizar base de conversão da Calculadora
        taxasReais['USD'] = parseFloat(data.USDBRL.bid);
        taxasReais['EUR'] = parseFloat(data.EURBRL.bid);
        taxasReais['GBP'] = parseFloat(data.GBPBRL.bid);

        // Executa o cálculo inicial com os dados recebidos
        calcularConversao();

    } catch (error) {
        console.error("Erro na sincronização de dados:", error);
        tickerElement.innerHTML = `<span class="mx-6 text-red-300">Falha ao carregar cotações do mercado. Verifique sua conexão.</span>`;
    }
}

// Função de cálculo matemático da calculadora
function calcularConversao() {
    const valor = parseFloat(amountInput.value);
    const moeda = currencySelect.value;
    const taxaAtual = taxasReais[moeda];

    if (!isNaN(valor) && valor > 0 && taxaAtual > 0) {
        const convertido = valor * taxaAtual;
        // Estimativa de IOF em 1,10% para papel moeda
        const iof = convertido * 0.011; 
        const total = convertido + iof;

        resultDiv.innerHTML = `
            R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span class="block text-xs font-normal text-gray-500 mt-1">
                Inclui IOF estimado (1,10%): R$ ${iof.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        `;
        taxaAplicadaSpan.textContent = `1 ${moeda} = R$ ${taxaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    } else {
        resultDiv.textContent = 'R$ 0,00';
        taxaAplicadaSpan.textContent = '--';
    }
}

// Escutadores de eventos: Recalcula na hora quando o usuário altera o valor ou a moeda
amountInput.addEventListener('input', calcularConversao);
currencySelect.addEventListener('change', calcularConversao);

// Dispara a busca de dados assim que a página carrega
atualizarDadosEconomicos();

// Configura para atualizar os dados do mercado automaticamente a cada 5 minutos (300.000 milissegundos)
setInterval(atualizarDadosEconomicos, 300000); 
