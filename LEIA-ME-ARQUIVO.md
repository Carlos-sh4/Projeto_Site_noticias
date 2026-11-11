# Arquivo histórico e paginação — Portal de Notícias

## Novidades

- Nova página `arquivo.html`: lista notícias publicadas, da mais recente para a mais antiga, com botões Anterior e Próxima.
- Pesquisa por título, resumo e fonte e filtro por categoria.
- Os links dos cards continuam abrindo `noticia.html?id=...`.
- Link **Arquivo** no menu desktop/mobile e **Ver todas as notícias** na página inicial.
- `js/api.js` passou a aceitar um terceiro argumento opcional `pagina`, sem quebrar chamadas existentes.
- Página inicial mostra 12 notícias recentes e direciona para o arquivo para consultar as anteriores.

## Dependência da API

A API FastAPI no `127.0.0.1:8001` precisa da paginação já testada na rota:

`GET /api/noticias?categoria=Brasil&limite=12&pagina=2`

A ordem no SQL Server deve continuar sendo `DataPublicacao DESC, ID_Editorial DESC`.
O frontend não escreve, modifica nem apaga notícias.

## Limitação da pesquisa

Atualmente a busca da API não oferece paginação compatível. Por isso, **somente quando há texto no campo Pesquisar**, a página percorre os registros publicados em lotes de 100, filtra localmente e pagina o resultado. Isso é adequado para o acervo pequeno do projeto da faculdade, mas pode demorar em arquivos grandes; há um limite de segurança de 10 mil registros. Para um portal maior, implemente `q` e paginação no mesmo endpoint `/api/noticias` ou pagine `/api/noticias/buscar`.

## Como testar na VPS

1. Faça backup da pasta do site atual; extraia este ZIP em uma pasta nova.
2. Mantenha a FastAPI da porta 8001 funcionando.
3. Abra o `index.html` novo com Live Server *na própria VPS*.
4. Clique em **Ver todas as notícias**; confira `/arquivo.html` e avance pelas páginas.
5. Teste filtro de categoria, pesquisa e clique em uma notícia.
6. Antes de publicar no IIS, configure o proxy `/api` para a FastAPI; a porta 8001 deve ficar interna.

Observação: o projeto original ainda possui referências a manifest/ícones que podem gerar 404 em testes; não foram modificadas aqui.
