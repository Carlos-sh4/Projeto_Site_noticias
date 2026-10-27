# Instruções do repositório

## Estrutura
- O site é composto por páginas HTML independentes na raiz, com textos e interface em português do Brasil.
- `css/` contém estilos por página e `theme.css` concentra os estilos compartilhados de tema.
- `js/` contém scripts por página e comportamentos compartilhados, como navegação, autenticação e tema.
- `Sistema de Pagamento/` contém o exemplo Java do sistema de assinaturas e pagamentos.
- `Arquivos/` contém material auxiliar, incluindo scripts e documentação SQL.

## Convenções de alteração
- Preserve os nomes de arquivos e os caminhos relativos usados pelas páginas existentes.
- Ao alterar um comportamento compartilhado, confira as páginas que incluem o script ou estilo correspondente para manter o cabeçalho, o tema e a navegação consistentes.
- Mantenha conteúdo visível em pt-BR e siga o estilo de HTML, CSS e JavaScript já usado. O front-end é HTML/CSS/JavaScript sem framework de build identificado; páginas usam Tailwind CSS e Font Awesome via CDN.
- Mantenha as classes e os seletores existentes em sincronia entre HTML, CSS e JavaScript; vários comportamentos dependem de IDs e nomes de classe específicos.
- As classes Java estão no pacote padrão. Evite adicionar dependências ou ferramentas de build sem necessidade para a mudança.

## Verificação
- Não foi encontrada configuração de testes, lint ou build para o site. Para alterações de interface, abra a página afetada no navegador e verifique o fluxo alterado, incluindo a apresentação responsiva quando aplicável.
- Para mudanças no sistema Java, se um JDK estiver disponível, compile os fontes a partir de `Sistema de Pagamento/` com `javac -d "$env:TEMP\noticias-classes" *.java` no PowerShell.
- Para mudanças SQL, confira o script relacionado em `Arquivos/` e valide-o no mecanismo de banco compatível com o próprio script, se disponível.
