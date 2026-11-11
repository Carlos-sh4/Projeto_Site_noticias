# Correções do frontend — 09/11/2026

## O que mudou

- `index.html`: link destacado para `arquivo.html` no topo, no título da seção e abaixo da grade.
- `js/index.js`: página inicial limitada a 6 notícias secundárias, mais a notícia principal. O restante fica no arquivo.
- `js/noticias-ui.js`: se `imagem_url` está vazio ou a imagem falha, mostra um espaço neutro com categoria. A logo animada aparece apenas no cabeçalho e rodapé.
- `arquivo.html`: mantém filtros e paginação já existentes.
- Nenhum arquivo da API ou SQL Server foi alterado.

## Atenção: categorias

No coletor configurado anteriormente, o feed `Agência Brasil` está fixado com `"categoria": "Brasil"`. Essa classificação foi escrita no banco ao importar; não é um erro de exibição do frontend. Para classificar **novas notícias** pelas seções do endereço original, usar o coletor atualizado fornecido separadamente. Registros já salvos no banco não mudam sem revisão ou atualização SQL.

## Atenção: imagens

O RSS existente não fornece uma `imagem_url` ao banco pelo coletor atual. Por isso não é possível mostrar uma foto verdadeira sem armazenar URL de imagem verificada/licenciada. O novo placeholder evita atribuir a mesma logo a todas as matérias.

## Teste seguro

1. Extrair ZIP em pasta nova da VPS (não substituir o site atual antes de testar).
2. Abrir esta pasta inteira no VS Code, executar Live Server e acessar `index.html`.
3. Confirmar a barra azul `Acessar todas as notícias e arquivo`.
4. Verificar a logo só no cabeçalho/rodapé, e placeholders onde faltam imagens.
5. Acessar `arquivo.html` e conferir páginas 1 e 2.
6. Pressionar Ctrl+F5 se os scripts antigos estiverem no cache.

**Importante:** a cópia ZIP exclui a pasta `Arquivos` com scripts SQL e ZIPs aninhados, pois não deve ser publicada como frontend estático.
