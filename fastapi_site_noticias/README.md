# FastAPI — Portal de Notícias

Primeira versão de integração com o SQL Server `SiteNoticias`, baseada no script SQL enviado.

## O que está implementado
- `GET /` — identificação da API.
- `GET /api/status` — testa conexão e informa o banco.
- `GET /api/categorias` — lista categorias.
- `GET /api/noticias?categoria=Tecnologia&limite=12` — lista notícias.
- `GET /api/noticias/buscar?q=termo&categoria=Tecnologia` — pesquisa título, resumo e fonte.
- `GET /api/noticias/{id}` — notícia e comentários aprovados.
- `POST /api/comentarios` — registra comentário como Pendente (temporário; exige autenticação antes de uso público).

## Requisitos no Windows Server 2019
1. Instale Python 3.11 ou superior.
2. Instale o Microsoft ODBC Driver 18 for SQL Server (64 bits).
3. Instale os componentes de acesso do SQL Server e confirme que o SQL Server aceita conexão local.
4. Crie um usuário SQL exclusivo para a API, com permissões mínimas no banco `SiteNoticias`. Evite usar `sa`.
5. Copie `.env.example` para `.env` e preencha as credenciais.

## Instalação e execução para teste
Abra PowerShell na pasta deste projeto:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Teste no próprio VPS:
- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/status`

Não exponha a porta 8000 diretamente à internet. Em produção, use HTTPS e proxy reverso (por exemplo, IIS com ARR/URL Rewrite) e restrinja CORS ao domínio real.

## Compatibilidade frontend
O `index.html` enviado define `window.API_BASE_URL = "http://localhost:3000/api"`.
Isso está correto apenas se o navegador do visitante estiver no próprio servidor, o que não é o caso. Após a API ser instalada e testada, altere a configuração do frontend para a URL HTTPS pública da API, ou use caminho relativo `/api` com proxy reverso no IIS. Não faça essa alteração antes de definir o domínio e o proxy.

O frontend atual `js/auth.js` guarda cadastro/login no `localStorage`. Esta API ainda não substitui esse mecanismo. O login/cadastro será integrado depois de confirmar a política de hash existente na coluna `Usuario.SenhaHash VARBINARY(64)` e o papel de cada tela administrativa. Não existe rota de autenticação ativa nesta primeira entrega.

## Segurança / limitações desta versão
- Não inclui criação/alteração/exclusão de notícias nem moderação de comentários: essas operações devem exigir autenticação e autorização administrativa.
- A rota de comentário recebe `id_autor` no corpo apenas para teste controlado. Não a exponha publicamente antes de implementar token e derivar o autor do token.
- `GET /api/noticias/sincronizar` informa 501 intencionalmente; a coleta RSS não deve ser ativada sem definir regras e credenciais.
- A configuração `DB_TRUST_SERVER_CERTIFICATE=yes` é adequada apenas para teste em rede confiável. Em produção, prefira certificado SQL válido e `no`.
- Nunca coloque credenciais SQL no JavaScript ou no repositório.
