document.addEventListener('DOMContentLoaded', async () => {
  const hero=document.getElementById('noticia-destaque');
  const grade=document.getElementById('noticias-recentes');
  if(!hero || !grade)return;
  try {
    const [noticias,destaques]=await Promise.all([NoticiasAPI.obterNoticias('',30),NoticiasAPI.obterDestaques(8)]);
    if (!Array.isArray(noticias) || !Array.isArray(destaques)) throw new Error('Formato inválido da API');
    const principal=destaques[0] || noticias[0];
    if(principal) hero.replaceChildren(NoticiasUI.destaque(principal));
    else NoticiasUI.aviso(hero,'Ainda não há notícias publicadas.');
    const secundarias=noticias.filter(n=>n.id!==principal?.id);
    if(secundarias.length) grade.replaceChildren(...secundarias.map(NoticiasUI.card));
    else NoticiasUI.aviso(grade,'Não há outras notícias publicadas no momento.');
  } catch(erro) {
    console.error('Não foi possível carregar notícias da API:',erro);
    NoticiasUI.aviso(hero,'Não foi possível carregar o destaque. Verifique a conexão com a API.');
    NoticiasUI.aviso(grade,'Não foi possível carregar as notícias. Tente atualizar a página.');
  }
});
