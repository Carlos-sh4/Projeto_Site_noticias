# Frontend dinâmico — Site de Notícias

## Alterações
- Página inicial: carrega destaque de `/api/noticias/destaques` e notícias de `/api/noticias`. Não exibe manchetes fictícias como fallback.
- Oito páginas de categorias: usam filtro `categoria` na API.
- `noticia.html?id=123`: consulta `/api/noticias/123`, mostra conteúdo integral e sugestões da mesma categoria (e gerais como complemento).
- O layout, cabeçalho, rodapé, estilos e imagens existentes foram mantidos quando aplicável.
- O código-fonte da API não foi alterado.

## Como testar na VPS
1. Faça backup do site antigo e copie esta versão em uma **pasta de teste separada**.
2. Verifique que a API 8001 continua em execução.
3. Sirva a pasta de teste com um servidor HTTP (Live Server ou outra hospedagem estática) **no navegador da própria VPS**. Não abra diretamente via `file://`.
4. A configuração `js/config.js` usa `http://127.0.0.1:8001/api` somente quando o navegador está em `localhost`/`127.0.0.1`. Em outras origens usa `/api` (exige proxy reverso configurado).
5. Abra `index.html`; uma manchete que exista no banco deve aparecer no destaque ou na grade. Clique nela para ver `noticia.html?id=...` e as sugestões. Verifique também as oito categorias.
6. Se houver erro CORS em Live Server, inclua **somente a origem de teste necessária** em `CORS_ORIGINS` da API e reinicie apenas a API 8001. Não exponha 8001 nem SQL Server à internet.

## Atenção
- A configuração por IP local serve apenas aos testes no navegador da VPS. Na publicação, use IIS com encaminhamento HTTPS de `/api` para `127.0.0.1:8001`.
- Se as categorias no banco tiverem grafia diferente (por exemplo sem acento), será preciso alinhar o valor de `data-categoria` ao nome exato do SQL Server.
- Imagens esperam URL absoluta http(s) ou caminho de imagem simples. Links para arquivos locais da VPS não são publicamente acessíveis.
- `conteudo` é exibido como texto com parágrafos por segurança, não interpreta HTML do banco.
- Os links antigos existentes em outras páginas de conteúdo não foram migrados; painel administrativo e autenticação não foram alterados.
- ZIP exclui a versão antiga do backend e arquivos que não são necessários para o frontend, como `.env` e scripts SQL.
