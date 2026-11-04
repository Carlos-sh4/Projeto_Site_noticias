document.addEventListener('DOMContentLoaded', async () => {
  const raiz=document.getElementById('categoria-dinamica');
  if(!raiz)return;
  const categoria=raiz.dataset.categoria;
  const grade=raiz.querySelector('[data-grade]');
  try {
    const noticias=await NoticiasAPI.obterNoticias(categoria,60);
    if(!Array.isArray(noticias))throw new Error('Formato inválido da API');
    if(noticias.length) grade.replaceChildren(...noticias.map(NoticiasUI.card));
    else NoticiasUI.aviso(grade,'Ainda não existem notícias publicadas nesta categoria.');
  } catch(e) {
    console.error('Erro ao consultar categoria:',e);
    NoticiasUI.aviso(grade,'Não foi possível carregar esta categoria no momento.');
  }
});
