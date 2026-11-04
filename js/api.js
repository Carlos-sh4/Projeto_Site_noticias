(function () {
  const API_BASE = (window.API_BASE_URL || '/api').replace(/\/$/, '');
  async function requisitar(caminho, parametros) {
    const url = new URL(API_BASE + caminho, location.href);
    if (parametros) Object.entries(parametros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
    const resposta = await fetch(url.toString(), {headers: {'Accept': 'application/json'}});
    if (!resposta.ok) throw new Error('Erro HTTP ' + resposta.status);
    return resposta.json();
  }
  window.NoticiasAPI = {
    base: API_BASE,
    obterNoticias: (categoria = '', limite = 24) => requisitar('/noticias', {categoria, limite}),
    obterDestaques: (limite = 8) => requisitar('/noticias/destaques', {limite}),
    obterNoticia: (id) => requisitar('/noticias/' + encodeURIComponent(id)),
    obterCategorias: () => requisitar('/categorias'),
    buscarNoticias: (q, categoria = '') => requisitar('/noticias/buscar', {q, categoria}),
  };
})();
