// Componentes compartilhados para notícias; conteúdo do banco sempre tratado como texto.
window.NoticiasUI = (() => {
  const pagina = (n) => 'noticia.html?id=' + encodeURIComponent(n.id);
  function data(n) {
    const texto = n.data_publicacao || n.data_criacao;
    if (!texto) return '';
    const d = new Date(texto.endsWith('Z') || /[+-]\d\d:\d\d$/.test(texto) ? texto : texto + 'Z');
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', {dateStyle:'medium', timeStyle:'short', timeZone:'America/Maceio'}).format(d);
  }
  function elemento(tag, classe, texto) {
    const e = document.createElement(tag); if(classe) e.className=classe;
    if(texto!==undefined) e.textContent=String(texto ?? ''); return e;
  }
  // Imagens são opcionais: não usar a logo do portal como se fosse uma foto da matéria.
  function imagem(n, classe) {
    const url = String(n.imagem_url || '').trim();
    const valido = /^https?:\/\/[^\s]+$/i.test(url) || /^(?:\.\/?|\/)?[\w% -]+(?:\/[\w% .-]+)*\.(?:png|jpg|jpeg|webp|gif)(?:\?[^#]*)?$/i.test(url);
    const fallback = () => {
      const placeholder = elemento('div', classe + ' noticia-sem-foto flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-600 text-center p-5');
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', 'Notícia sem imagem cadastrada');
      placeholder.append(elemento('span', 'text-4xl', '▤'));
      placeholder.append(elemento('span', 'text-xs sm:text-sm font-semibold uppercase tracking-widest', n.categoria || 'Notícias'));
      return placeholder;
    };
    if (!valido) return fallback();
    const img = elemento('img', classe);
    img.src = url;
    img.alt = 'Imagem ilustrativa da notícia: ' + (n.titulo || '');
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { img.replaceWith(fallback()); };
    return img;
  }
  function card(n) {
    const a=elemento('a','group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100');
    a.href=pagina(n);
    const pic=elemento('div','h-48 overflow-hidden bg-gray-100'); pic.append(imagem(n,'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'));
    const corpo=elemento('div','p-5 flex flex-col flex-grow gap-2');
    corpo.append(elemento('span','text-xs font-bold text-blue-600 uppercase',n.categoria||'Notícias'));
    corpo.append(elemento('h3','text-xl font-bold text-gray-900 leading-snug group-hover:text-blue-600',n.titulo));
    corpo.append(elemento('p','text-gray-600 text-sm line-clamp-3 flex-grow',n.resumo));
    corpo.append(elemento('time','text-xs text-gray-500 mt-2',data(n)));
    a.append(pic,corpo);return a;
  }
  function destaque(n) {
    const a=elemento('a','group rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow border border-gray-100 flex flex-col lg:flex-row');a.href=pagina(n);
    const pic=elemento('div','lg:w-2/3 relative overflow-hidden h-72 sm:h-96 lg:h-[460px] bg-gray-100');
    pic.append(imagem(n,'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700'));
    pic.append(elemento('span','absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full',n.categoria||'Destaque'));
    const corpo=elemento('div','lg:w-1/3 p-6 sm:p-8 lg:p-10 flex flex-col justify-center gap-5');
    corpo.append(elemento('h1','text-3xl sm:text-4xl font-bold text-gray-900 leading-tight group-hover:text-blue-600',n.titulo));
    corpo.append(elemento('p','text-gray-600 text-lg line-clamp-4',n.resumo));
    corpo.append(elemento('span','text-sm text-gray-500',data(n)));
    corpo.append(elemento('span','text-blue-600 font-semibold','Ler matéria completa →'));
    a.append(pic,corpo);return a;
  }
  function aviso(alvo,mensagem) {alvo.replaceChildren(elemento('p','rounded-lg border border-gray-200 bg-white p-6 text-gray-600',mensagem));}
  return {pagina,data,elemento,imagem,card,destaque,aviso};
})();
