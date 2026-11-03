# API de leitura — no_click_db

Esta pasta é uma **nova API de testes**, independente da API existente na porta 8000. Não altera tabelas ou senhas. Usa somente SELECT nas tabelas reais `dbo.Categorias` e `dbo.NoticiasEditoriais`.

## Endpoints
- GET `/api/status` — conexão, com `banco: online` quando conectada
- GET `/api/categorias`
- GET `/api/noticias?categoria=Brasil&limite=12`
- GET `/api/noticias/buscar?q=teste&categoria=Brasil&aoVivo=true`
- GET `/api/noticias/destaques`
- GET `/api/noticias/{id}` — inclui o conteúdo completo

Somente `Status = Publicada` é exposto publicamente. `/api/noticias/sincronizar`, login, cadastro, administração e comentários **não foram implementados**. Os resultados são arrays JSON, como pressupõe `js/api.js`, mas a integração visual precisa ser testada depois.

## Instalação de testes (PowerShell na VPS)

1. Extraia esta pasta em local **separado** da API atual.
2. Abra PowerShell nessa pasta e execute:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

3. Preencha o `.env` **somente na VPS**, com conta SQL dedicada, restrita a SELECT das duas tabelas. Não use `sa`, não envie esse arquivo a terceiros. O SQL Server e a API ficam na mesma VPS.
4. Teste na porta **8001**, sem abrir a porta no firewall:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

5. No navegador da própria VPS, acesse `http://127.0.0.1:8001/api/status` e `http://127.0.0.1:8001/docs`.

## Atenção
- `js/api.js` já usa `/api` por padrão, mas `index.html` o sobrescreve com `http://localhost:3000/api`. **Não altere isso agora**; depois de testar a API, usaremos proxy HTTPS e caminhos relativos.
- As páginas atuais possuem muito conteúdo estático: a existência da API sozinha não transforma essas páginas em notícias dinâmicas.
- O banco não contém tabela de comentários confirmada. Não há endpoints de comentários.
- Não há autenticação pronta para produção; endpoints com escrita devem aguardar validação da política de hashes e perfis.
- O ajuste `DB_TRUST_SERVER_CERTIFICATE=yes` é apenas para testes locais em ambiente controlado. Planejar certificado SQL válido para produção.
- Não exponha mensagens de erro SQL, portas SQL ou a documentação `/docs` diretamente na internet.
