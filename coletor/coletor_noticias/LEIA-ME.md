# Coletor RSS — Portal de Notícias (projeto acadêmico)

## O que faz

- Lê feeds RSS/Atom e exibe título, pequena descrição, fonte e link.
- Não copia texto integral ou imagens de terceiros.
- Identifica URLs duplicadas no lote e, na gravação, verifica URLs e título/fonte já existentes no SQL Server.
- A gravação **não é automática**: por padrão é só uma prévia. Se habilitada, insere **somente `Rascunho`** em `dbo.NoticiasEditoriais`; nunca publica ou apaga notícias.
- Usa as tabelas já existentes `Categorias`, `Usuarios`, `NoticiasEditoriais` em `no_click_db`.
- Não mexe nas APIs 8000/8001. Só envia ao banco após ativação explícita.

## Instalação (PowerShell na VPS)

Crie uma pasta separada, por exemplo `C:\APIs\coletor_noticias`, e extraia estes arquivos nela. Use o executável de Python da instalação local **que já está instalada e funciona** (substitua o caminho abaixo se for diferente):

```powershell
cd C:\APIs\coletor_noticias
& "C:\Users\Administrator\AppData\Local\Programs\Python\Python315\python.exe" -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe coletor.py --limite 5
```

**Essa última execução é somente prévia.** Exibe notícias no PowerShell e não utiliza o banco. Para a prévia com dados estruturados: ` .\.venv\Scripts\python.exe coletor.py --limite 3 --json`.

## Fontes regionais e nacionais

Em `fontes.json`, a Agência Brasil está habilitada como exemplo de fonte nacional. Há uma entrada regional *desabilitada*, que deve ser preenchida com o RSS/Atom real de um veículo de Alagoas e ativada (`"ativo": true`) após verificar a origem e os direitos de reprodução. É possível acrescentar várias fontes. `"categoria"` deve coincidir com o nome de uma categoria já existente no banco.

A divisão sugerida de 60% regional/40% nacional é um objetivo editorial, **não é uma quota implementada** neste protótipo. Não inventamos feed regional que não foi verificado.

## Como salvar rascunhos posteriormente (NÃO faça nesta etapa sem revisão)

1. Confirme que a prévia funciona e revise os feeds.
2. Crie um login SQL **diferente** de `api_site_noticias`. Esse login de leitura não pode inserir dados. Conceda a esse novo usuário apenas `SELECT` em `Usuarios`, `Categorias`, `NoticiasEditoriais` e `INSERT` em `NoticiasEditoriais` (e as permissões adicionais estritamente necessárias, se algum trigger exigir).
3. Copie `.env.example` para `.env` e configure as credenciais localmente. **Não compartilhe `.env`.** Em `AUTOR_ID`, use o ID de um usuário existente, autorizado como responsável pelos rascunhos. O valor 2 é só um exemplo, confirme antes de usar.
4. Execute deliberadamente:

```powershell
.\.venv\Scripts\python.exe coletor.py --limite 5 --salvar-rascunhos --confirmo-gravacao
```

5. Confira no SSMS: `SELECT TOP 20 ID_Editorial, Titulo, Status, Fonte, URL_Fonte FROM dbo.NoticiasEditoriais ORDER BY ID_Editorial DESC;`.

**Não agende gravações ainda:** primeiro teste um lote pequeno e confirme que o painel consegue revisar/publicar. O agendamento futuro poderá usar o Agendador de Tarefas do Windows (ex.: cada 30 minutos), mantendo rascunhos pendentes de revisão.

## Observações sobre o site

- A API da porta 8001 entrega apenas notícias com `Status = 'Publicada'`. Os novos `Rascunho` **não aparecerão** no portal até serem revisados e publicados.
- A API atual já ordena listagens por `DataPublicacao DESC, ID_Editorial DESC`. Para manter antigas acessíveis com paginação, ainda será necessário implementar `offset`/páginas no frontend e na API.
- Na publicação, preencha `DataPublicacao` com a data/hora UTC correspondente; não basta apenas mudar `Status`.
- Use o texto completo e imagens de outros veículos **somente** com permissão/licença aplicável. Os resumos automáticos aqui são curtos e têm atribuição e link.
- Não implementa autenticação do painel, nem muda o esquema do banco.

## Limitações

- Fonte RSS pode ficar indisponível ou alterar formato.
- A prevenção de duplicatas usa URL/título; para múltiplos processos simultâneos, uma restrição única no banco e uma tabela de origem seriam mais robustas.
- Sem testes de rede com sua VPS; valide no seu ambiente antes de ativar gravações.
- Não instalar dependências diretamente no Python do sistema: use `.venv`.
