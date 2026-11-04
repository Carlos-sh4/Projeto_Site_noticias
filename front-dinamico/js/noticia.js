document.addEventListener('DOMContentLoaded', async () => {
  const ui=NoticiasUI; const alvo=document.getElementById('conteudo-noticia');
  const sugestoes=document.getElementById('sugestoes-noticias');
  const id=new URLSearchParams(location.search).get('id');
  if(!/^\d+$/.test(id||'')){ui.aviso(alvo,'Endereço inválido: notícia não informada.');return;}
  try {
    const n=await NoticiasAPI.obterNoticia(id);
    document.title=(n.titulo || 'Notícia')+' | Notícias Hoje';
    alvo.replaceChildren();
    alvo.append(ui.elemento('span','text-sm font-bold text-blue-600 uppercase tracking-wide',n.categoria||'Notícias'));
    alvo.append(ui.elemento('h1','text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mt-3',n.titulo));
    alvo.append(ui.elemento('p','text-xl text-gray-600 mt-5 leading-relaxed',n.resumo));
    alvo.append(ui.elemento('p','text-sm text-gray-500 mt-5', [ui.data(n),n.fonte ? 'Fonte: '+n.fonte : ''].filter(Boolean).join(' • ')));
    const figura=ui.elemento('figure','mt-7 rounded-xl overflow-hidden bg-gray-100');
    figura.append(ui.imagem(n,'w-full max-h-[520px] object-cover')); alvo.append(figura);
    const texto=ui.elemento('div','mt-8 space-y-5 text-gray-800 text-lg leading-8');
    // Corpo armazenado como texto: quebra de parágrafos sem HTML arbitrário do banco.
    String(n.conteudo || n.resumo || '').split(/\n\s*\n|\r?\n/).filter(x=>x.trim()).forEach(x=>texto.append(ui.elemento('p','',x.trim())));
    alvo.append(texto);
    if(n.url_fonte && /^https?:\/\//i.test(n.url_fonte)){
      const fonte=ui.elemento('a','inline-block mt-8 text-blue-700 underline','Consultar fonte original');
      fonte.href=n.url_fonte; fonte.target='_blank';fonte.rel='noopener noreferrer';alvo.append(fonte);
    }
    const [mesma,geral]=await Promise.allSettled([NoticiasAPI.obterNoticias(n.categoria,12),NoticiasAPI.obterNoticias('',20)]);
    const lista=[...(mesma.status==='fulfilled' && Array.isArray(mesma.value)?mesma.value:[]),...(geral.status==='fulfilled' && Array.isArray(geral.value)?geral.value:[])];
    const vistos=new Set([Number(id)]); const relacionadas=[];
    for(const item of lista){if(!vistos.has(item.id)){vistos.add(item.id);relacionadas.push(item);}if(relacionadas.length===5)break;}
    if(relacionadas.length) sugestoes.replaceChildren(...relacionadas.map(ui.card));
    else ui.aviso(sugestoes,'Nenhuma outra notícia disponível no momento.');
  }catch(e){
    console.error('Erro ao carregar notícia:',e);
    ui.aviso(alvo,'Não foi possível carregar esta notícia. Ela pode não estar publicada ou a API pode estar indisponível.');
    ui.aviso(sugestoes,'Sugestões indisponíveis.');
  }
});
