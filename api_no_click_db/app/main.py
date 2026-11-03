import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_connection

logger = logging.getLogger(__name__)
app = FastAPI(title='API de Notícias — no_click_db', version='1.1.0')
origins = [s.strip() for s in os.getenv('CORS_ORIGINS', 'http://localhost:5500,http://127.0.0.1:5500').split(',') if s.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET'], allow_headers=['Content-Type'])

BASE = '''
SELECT n.ID_Editorial, n.Titulo, n.Resumo, n.Conteudo, n.URL_Imagem,
       n.Fonte, n.URL_Fonte, c.NomeCategoria, n.ID_Categoria, n.ID_Autor,
       n.Status, n.Destaque, n.DataCriacao, n.DataAtualizacao, n.DataPublicacao
FROM dbo.NoticiasEditoriais AS n
JOIN dbo.Categorias AS c ON c.ID_Categoria = n.ID_Categoria
'''


def item(r, incluir_conteudo=False):
    obj = {
        'id': r[0], 'titulo': r[1], 'resumo': r[2],
        'imagem_url': r[4], 'fonte': r[5], 'url_fonte': r[6],
        'categoria': r[7], 'categoria_id': r[8], 'autor_id': r[9],
        'status': r[10], 'destaque': bool(r[11]),
        'data_criacao': r[12].isoformat() if r[12] else None,
        'data_atualizacao': r[13].isoformat() if r[13] else None,
        'data_publicacao': r[14].isoformat() if r[14] else None,
    }
    if incluir_conteudo:
        obj['conteudo'] = r[3]
    return obj


def erro_interno(exc):
    logger.exception('Falha na consulta SQL Server')
    raise HTTPException(status_code=503, detail='Não foi possível consultar os dados no momento.') from exc


@app.get('/')
def home():
    return {'api': 'Portal de Notícias', 'documentacao': '/docs'}


@app.get('/api/status')
def status():
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute('SELECT DB_NAME()')
            db = cur.fetchone()[0]
        return {'status': 'online', 'banco': 'online', 'nome_banco': db}
    except Exception as exc:
        erro_interno(exc)


@app.get('/api/categorias')
def categorias():
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute('SELECT ID_Categoria, NomeCategoria, DescricaoCategoria FROM dbo.Categorias ORDER BY NomeCategoria')
            return [{'id': x[0], 'nome': x[1], 'descricao': x[2]} for x in cur.fetchall()]
    except Exception as exc:
        erro_interno(exc)


def consultar_noticias(categoria: Optional[str], limite: int, q: Optional[str] = None, destaque=False):
    filtros = ["n.Status = N'Publicada'"]
    params = []
    if categoria:
        filtros.append('c.NomeCategoria = ?')
        params.append(categoria)
    if q is not None and q.strip():
        filtros.append('(n.Titulo LIKE ? OR n.Resumo LIKE ? OR n.Fonte LIKE ?)')
        termo = '%' + q.strip().replace('[', '[[]').replace('%', '[%]').replace('_', '[_]') + '%'
        params.extend([termo, termo, termo])
    if destaque:
        filtros.append('n.Destaque = 1')
    sql = BASE + ' WHERE ' + ' AND '.join(filtros) + ' ORDER BY n.DataPublicacao DESC, n.ID_Editorial DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY'
    params.append(limite)
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(sql, *params)
            return [item(x) for x in cur.fetchall()]
    except Exception as exc:
        erro_interno(exc)


@app.get('/api/noticias')
def noticias(categoria: Optional[str] = None, limite: int = Query(12, ge=1, le=100)):
    return consultar_noticias(categoria, limite)


@app.get('/api/noticias/buscar')
def buscar(q: str = Query('', max_length=200), categoria: Optional[str] = None,
           aoVivo: bool = True, limite: int = Query(50, ge=1, le=100)):
    # aoVivo é mantido apenas por compatibilidade com js/api.js.
    return consultar_noticias(categoria, limite, q=q)


@app.get('/api/noticias/destaques')
def destaques(limite: int = Query(8, ge=1, le=50)):
    return consultar_noticias(None, limite, destaque=True)


@app.get('/api/noticias/{editorial_id}')
def noticia(editorial_id: int):
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(BASE + " WHERE n.ID_Editorial = ? AND n.Status = N'Publicada'", editorial_id)
            x = cur.fetchone()
            if x is None:
                raise HTTPException(status_code=404, detail='Notícia não encontrada.')
            return item(x, incluir_conteudo=True)
    except HTTPException:
        raise
    except Exception as exc:
        erro_interno(exc)
