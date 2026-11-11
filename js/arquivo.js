/* Arquivo histórico compatível com GET /api/noticias?categoria=&limite=&pagina=
   A busca textual é feita no navegador, pois a API de listagem ainda não
   oferece o parâmetro q paginado. As páginas sem pesquisa são consultadas
   diretamente no banco pela API, sem carregar o arquivo inteiro. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('arquivo-filtros');
  const campoBusca = document.getElementById('arquivo-busca');
  const campoCategoria = document.getElementById('arquivo-categoria');
  const btnLimpar = document.getElementById('arquivo-limpar');
  const grade = document.getElementById('arquivo-grade');
  const status = document.getElementById('arquivo-status');
  const paginacao = document.getElementById('arquivo-paginacao');
  const anterior = document.getElementById('arquivo-anterior');
  const proxima = document.getElementById('arquivo-proxima');
  const indicador = document.getElementById('arquivo-indicador');
  const POR_PAGINA = 12;
  const TAMANHO_LOTE = 100;
  const MAX_LOTES_BUSCA = 100; // limite defensivo: até 10 mil notícias por pesquisa
  let geracao = 0;

  function lerFiltros() {
    const params = new URLSearchParams(location.search);
    const valorPagina = Number(params.get('pagina'));
    return {
      q: (params.get('q') || '').trim().slice(0, 120),
      categoria: params.get('categoria') || '',
      pagina: Number.isSafeInteger(valorPagina) && valorPagina >= 1 ? valorPagina : 1
    };
  }
  function escreverUrl(estado, substituir = false) {
    const url = new URL(location.href);
    url.searchParams.delete('q'); url.searchParams.delete('categoria'); url.searchParams.delete('pagina');
    if (estado.q) url.searchParams.set('q', estado.q);
    if (estado.categoria) url.searchParams.set('categoria', estado.categoria);
    if (estado.pagina > 1) url.searchParams.set('pagina', String(estado.pagina));
    history[substituir ? 'replaceState' : 'pushState']({}, '', url);
  }
  function mensagem(m) { status.textContent = m; }
  function normalizar(s) {
    return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function filtrar(lista, q) {
    const termo = normalizar(q);
    return lista.filter(n => normalizar([n.titulo, n.resumo, n.fonte].join(' ')).includes(termo));
  }
  function renderizar(lista, pagina, temAnterior, temProxima, extra = '') {
    grade.replaceChildren();
    if (lista.length) grade.append(...lista.map(NoticiasUI.card));
    else NoticiasUI.aviso(grade, pagina > 1 ? 'Não existem mais notícias nesta página. Use Anterior.' : 'Nenhuma notícia encontrada para esses filtros.');
    paginacao.hidden = !temAnterior && !temProxima;
    anterior.disabled = !temAnterior;
    proxima.disabled = !temProxima;
    indicador.textContent = `Página ${pagina}`;
    mensagem(`${lista.length} notícia(s) nesta página.${extra}`);
  }

  async function buscarNoHistorico(categoria, q) {
    // A API /api/noticias/buscar ainda não tem paginação. Para não ocultar
    // resultados antigos, consultamos todas as páginas da listagem, sob demanda.
    const resultados = [];
    for (let pagina = 1; pagina <= MAX_LOTES_BUSCA; pagina++) {
      const lote = await NoticiasAPI.obterNoticias(categoria, TAMANHO_LOTE, pagina);
      if (!Array.isArray(lote)) throw new Error('A API retornou um formato inválido');
      resultados.push(...filtrar(lote, q));
      if (lote.length < TAMANHO_LOTE) return {resultados, limitado: false};
    }
    return {resultados, limitado: true};
  }

  async function atualizar() {
    const atual = ++geracao;
    const estado = lerFiltros();
    campoBusca.value = estado.q;
    if ([...campoCategoria.options].some(o => o.value === estado.categoria)) campoCategoria.value = estado.categoria;
    else campoCategoria.value = '';
    grade.setAttribute('aria-busy', 'true');
    paginacao.hidden = true;
    mensagem(estado.q ? 'Pesquisando no histórico...' : 'Carregando notícias...');
    grade.replaceChildren();
    try {
      let itens, temProxima, extra = '';
      if (estado.q) {
        const {resultados, limitado} = await buscarNoHistorico(estado.categoria, estado.q);
        if (atual !== geracao) return;
        const inicio = (estado.pagina - 1) * POR_PAGINA;
        itens = resultados.slice(inicio, inicio + POR_PAGINA);
        temProxima = inicio + POR_PAGINA < resultados.length;
        if (limitado) extra = ' Pesquisa limitada aos primeiros 10 mil registros; para arquivos maiores, é necessário paginar a busca na API.';
      } else {
        const [dados, proximaPagina] = await Promise.all([
          NoticiasAPI.obterNoticias(estado.categoria, POR_PAGINA, estado.pagina),
          NoticiasAPI.obterNoticias(estado.categoria, POR_PAGINA, estado.pagina + 1)
        ]);
        if (atual !== geracao) return;
        if (!Array.isArray(dados) || !Array.isArray(proximaPagina)) throw new Error('A API retornou um formato inválido');
        itens = dados;
        temProxima = proximaPagina.length > 0;
      }
      renderizar(itens, estado.pagina, estado.pagina > 1, temProxima, extra);
    } catch (erro) {
      if (atual !== geracao) return;
      console.error('Falha ao carregar arquivo:', erro);
      NoticiasUI.aviso(grade, 'Não foi possível carregar o arquivo. Verifique a API na porta 8001 e tente novamente.');
      mensagem('Não foi possível consultar as notícias agora.');
    } finally {
      if (atual === geracao) grade.removeAttribute('aria-busy');
    }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    escreverUrl({q: campoBusca.value.trim(), categoria: campoCategoria.value, pagina: 1});
    atualizar();
  });
  btnLimpar.addEventListener('click', () => {
    campoBusca.value = ''; campoCategoria.value = '';
    escreverUrl({q: '', categoria: '', pagina: 1});
    atualizar();
  });
  function mudarPagina(delta) {
    const estado = lerFiltros();
    estado.pagina = Math.max(1, estado.pagina + delta);
    escreverUrl(estado);
    atualizar();
    document.getElementById('arquivo-principal').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  anterior.addEventListener('click', () => { if (!anterior.disabled) mudarPagina(-1); });
  proxima.addEventListener('click', () => { if (!proxima.disabled) mudarPagina(1); });
  window.addEventListener('popstate', atualizar);
  atualizar();
});
