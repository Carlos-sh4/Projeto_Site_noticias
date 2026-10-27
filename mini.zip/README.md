# API do Projeto Site de Notícias

## Stack
- Node.js + Express
- SQL Server (banco LISIMETRO do projeto)
- Google News RSS para agregação temática
- ESPN para placares de futebol
- AwesomeAPI para câmbio

## Instalação
1. Abra o terminal dentro de `backend`.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e preencha os dados do SQL Server.
4. Execute `npm start`.

## Endpoints principais
GET  /api/status
GET  /api/categorias
GET  /api/noticias?categoria=Tecnologia
GET  /api/noticias/buscar?q=inteligencia+artificial
GET  /api/noticias/:id
POST /api/noticias/sincronizar
POST /api/noticias/sincronizar-todas
GET  /api/esportes/jogos
GET  /api/economia/cotacoes

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/assinaturas
POST /api/newsletter

## Categorias suportadas
Esportes, Economia, Política, Brasil, Mundo, Saúde, Tecnologia, Entretenimento.

"Assinaturas" é tratado como módulo comercial, não como categoria editorial.

## Observação
A coleta usa feeds RSS e grava no banco apenas metadados (título, resumo, link, imagem, fonte, categoria e datas). O conteúdo integral permanece no site de origem.
