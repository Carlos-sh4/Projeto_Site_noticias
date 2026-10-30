from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.database import get_connection

app = FastAPI(
    title="API - Portal de Notícias",
    version="1.0.0",
    description="API do Portal de Notícias integrada ao SQL Server SiteNoticias."
)

# Em produção, restrinja allow_origins aos endereços reais do site.
# Não use '*' junto com credenciais/autenticação.
origins = [x.strip() for x in __import__("os").getenv(
    "CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500"
).split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

class ComentarioEntrada(BaseModel):
    id_post: int = Field(gt=0)
    id_autor: int = Field(gt=0)
    texto: str = Field(min_length=1, max_length=4000)

@app.get("/")
def raiz():
    return {"mensagem": "API do Portal de Notícias", "docs": "/docs"}

@app.get("/api/status")
def status():
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT DB_NAME()")
            db = cur.fetchone()[0]
        return {"status": "online", "banco": db}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Não foi possível conectar ao banco: {str(exc)}")

@app.get("/api/categorias")
def listar_categorias():
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT ID_Categoria, NomeCategoria, DescricaoCategoria
                FROM dbo.Categorias ORDER BY NomeCategoria
            """)
            return [
                {"id": r[0], "nome": r[1], "descricao": r[2]}
                for r in cur.fetchall()
            ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar categorias: {str(exc)}")

def _noticia_dict(row):
    return {
        "id": row[0],
        "titulo": row[1],
        "resumo": row[2],
        "link": row[3],
        "imagem_url": row[4],
        "fonte": row[5],
        "categoria": row[6],
        "autor_id": row[7],
        "data_publicacao": row[8].isoformat() if row[8] else None,
    }

SELECT_NOTICIAS = """
SELECT p.ID_Post, p.Titulo_Post, p.Resumo, p.URL_Post, p.URL_Imagem,
       p.Fonte, c.NomeCategoria, p.ID_Autor, p.DataPublicacao
FROM dbo.Posts p
INNER JOIN dbo.Categorias c ON c.ID_Categoria = p.ID_Categoria
"""

@app.get("/api/noticias")
def listar_noticias(
    categoria: Optional[str] = Query(default=None),
    limite: int = Query(default=12, ge=1, le=100)
):
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            sql = SELECT_NOTICIAS
            params = []
            if categoria:
                sql += " WHERE c.NomeCategoria = ?"
                params.append(categoria)
            sql += " ORDER BY p.DataPublicacao DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY"
            params.append(limite)
            cur.execute(sql, params)
            return [_noticia_dict(r) for r in cur.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao listar notícias: {str(exc)}")

@app.get("/api/noticias/buscar")
def buscar_noticias(
    q: str = Query(default="", max_length=200),
    categoria: Optional[str] = None,
    aoVivo: bool = True,
    limite: int = Query(default=50, ge=1, le=100)
):
    # aoVivo é aceito para compatibilidade com o frontend atual.
    termo = f"%{q.strip()}%"
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            sql = SELECT_NOTICIAS + """
                WHERE (p.Titulo_Post LIKE ? OR p.Resumo LIKE ? OR p.Fonte LIKE ?)
            """
            params = [termo, termo, termo]
            if categoria:
                sql += " AND c.NomeCategoria = ?"
                params.append(categoria)
            sql += " ORDER BY p.DataPublicacao DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY"
            params.append(limite)
            cur.execute(sql, params)
            return [_noticia_dict(r) for r in cur.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro na busca: {str(exc)}")

@app.get("/api/noticias/{post_id}")
def obter_noticia(post_id: int):
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(SELECT_NOTICIAS + " WHERE p.ID_Post = ?", post_id)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Notícia não encontrada.")
            noticia = _noticia_dict(row)
            cur.execute("""
                SELECT ID_Comentario, ID_Autor, Texto, DataComentario
                FROM dbo.Comentarios
                WHERE ID_Post = ? AND Status_Moderacao = 'Aprovado'
                ORDER BY DataComentario DESC
            """, post_id)
            noticia["comentarios"] = [
                {"id": r[0], "autor_id": r[1], "texto": r[2],
                 "data": r[3].isoformat() if r[3] else None}
                for r in cur.fetchall()
            ]
            return noticia
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar notícia: {str(exc)}")

@app.post("/api/comentarios", status_code=201)
def criar_comentario(dados: ComentarioEntrada):
    # Endpoint inicial: por segurança, só permite inserir comentário pendente.
    # Antes de liberar publicamente, autenticação deve fornecer o ID do autor;
    # não confie em id_autor enviado pelo navegador.
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM dbo.Posts WHERE ID_Post = ?", dados.id_post)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Notícia não encontrada.")
            cur.execute("SELECT 1 FROM dbo.Usuario WHERE ID_Usuario = ? AND Ativo = 1", dados.id_autor)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Usuário não encontrado ou inativo.")
            cur.execute("""
                INSERT INTO dbo.Comentarios (ID_Post, ID_Autor, Texto, Status_Moderacao)
                OUTPUT INSERTED.ID_Comentario
                VALUES (?, ?, ?, 'Pendente')
            """, dados.id_post, dados.id_autor, dados.texto)
            comment_id = cur.fetchone()[0]
            conn.commit()
            return {"id": comment_id, "status": "Pendente"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar comentário: {str(exc)}")

@app.get("/api/noticias/sincronizar")
def sincronizacao_info():
    raise HTTPException(
        status_code=501,
        detail="A coleta RSS ainda não foi ativada. Será implementada após validar o acesso ao banco e as regras editoriais."
    )
