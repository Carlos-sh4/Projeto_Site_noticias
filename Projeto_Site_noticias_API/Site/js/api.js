// Integração do frontend com a API central do Projeto Site de Notícias.
(function () {
  const API_BASE = window.API_BASE_URL || "/api";

  async function obterNoticias(categoria, limite = 12) {
    const url = `${API_BASE}/noticias?categoria=${encodeURIComponent(categoria)}&limite=${encodeURIComponent(limite)}`;
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`API ${resposta.status}`);
    return resposta.json();
  }

  async function buscarNoticias(termo, categoria = "", aoVivo = true) {
    const params = new URLSearchParams({
      q: termo,
      aoVivo: String(aoVivo)
    });
    if (categoria) params.set("categoria", categoria);

    const resposta = await fetch(`${API_BASE}/noticias/buscar?${params.toString()}`);
    if (!resposta.ok) throw new Error(`API ${resposta.status}`);
    return resposta.json();
  }

  async function sincronizarCategoria(categoria, token) {
    const resposta = await fetch(`${API_BASE}/noticias/sincronizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ categoria })
    });

    if (!resposta.ok) throw new Error(`API ${resposta.status}`);
    return resposta.json();
  }

  window.NoticiasAPI = {
    base: API_BASE,
    obterNoticias,
    buscarNoticias,
    sincronizarCategoria
  };
})();
