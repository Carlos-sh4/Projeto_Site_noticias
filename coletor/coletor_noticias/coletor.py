"""Coletor RSS para no_click_db. Padrão: somente prévia, nunca grava.
Execute `python coletor.py --help` para instruções.
"""
import argparse
import calendar
import hashlib
import json
import logging
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import feedparser
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / '.env')
LOG = logging.getLogger('coletor')


def limpar(texto, limite):
    texto = re.sub(r'<[^>]+>', ' ', str(texto or ''))
    texto = re.sub(r'\s+', ' ', unescape(texto)).strip()
    return texto[:limite].strip()


def chave(texto):
    return ''.join(c for c in unicodedata.normalize('NFKD', texto.casefold()) if not unicodedata.combining(c))


def url_valida(url):
    try:
        u = urlparse(url.strip())
        return u.scheme in ('https', 'http') and bool(u.netloc) and not u.username and not u.password
    except Exception:
        return False


def url_normalizada(url):
    u = urlparse(url.strip())
    query = [(k,v) for k,v in parse_qsl(u.query, keep_blank_values=True) if not k.lower().startswith('utm_') and k.lower() not in ('fbclid', 'gclid')]
    return urlunparse((u.scheme.lower(), u.netloc.lower(), u.path.rstrip('/') or '/', '', urlencode(sorted(query)), ''))


def data_feed(item):
    info = item.get('published_parsed') or item.get('updated_parsed')
    if not info:
        return None
    try:
        return datetime.fromtimestamp(calendar.timegm(info), timezone.utc).replace(tzinfo=None)
    except (ValueError, OverflowError, TypeError):
        return None


def carregar_fontes(caminho):
    fontes = json.loads(Path(caminho).read_text(encoding='utf-8'))
    if not isinstance(fontes, list):
        raise ValueError('fontes.json deve conter uma lista')
    return [f for f in fontes if f.get('ativo', False)]


def coletar(fontes, max_por_fonte=10):
    vistos = set()
    saida = []
    for fonte in fontes:
        nome, endereco = fonte['nome'], fonte['url']
        if not url_valida(endereco):
            LOG.warning('Fonte ignorada por URL inválida: %s', nome)
            continue
        try:
            resposta = requests.get(endereco, timeout=(6, 20), headers={'User-Agent': 'PortalNoticiasFaculdade/1.0 (RSS; contato com fontes por canais oficiais)'})
            resposta.raise_for_status()
            if len(resposta.content) > 3_000_000:
                raise ValueError('Feed excede 3 MB')
            feed = feedparser.parse(resposta.content)
            if feed.bozo and not feed.entries:
                raise ValueError('XML RSS/Atom inválido')
        except (requests.RequestException, ValueError) as exc:
            LOG.warning('Fonte indisponível %s: %s', nome, exc)
            continue
        contador = 0
        for item in feed.entries:
            titulo = limpar(item.get('title'), 255)
            link = item.get('link', '')
            if not titulo or not url_valida(link):
                continue
            link = url_normalizada(link)
            if len(link) > 850 or link in vistos:
                continue
            vistos.add(link)
            resumo = limpar(item.get('summary') or item.get('description'), 1000)
            # Não reproduzir conteúdo integral de terceiros; apenas link e pequena apresentação.
            if not resumo:
                resumo = 'Notícia disponibilizada pela fonte original.'
            resumo = resumo[:320].rstrip()
            texto = f'{resumo}\n\nLeia a matéria completa na fonte original: {link}'
            saida.append({
                'titulo': titulo, 'resumo': resumo,
                'conteudo': texto, 'fonte': limpar(nome, 160),
                'url_fonte': link, 'categoria': fonte.get('categoria', 'Brasil'),
                'regiao': fonte.get('regiao', 'nacional'),
                'data_origem': data_feed(item),
            })
            contador += 1
            if contador >= max_por_fonte:
                break
        LOG.info('%s: %s itens novos na coleta', nome, contador)
    # As datas da fonte servem para ordenar prévia; banco mantém DataCriacao própria.
    saida.sort(key=lambda x: x['data_origem'] or datetime.min, reverse=True)
    return saida


def conectar():
    try:
        import pyodbc
    except ImportError as e:
        raise RuntimeError('Para gravar, instale pyodbc: pip install -r requirements.txt') from e
    campos = ['DB_DRIVER','DB_SERVER','DB_NAME','DB_USER','DB_PASSWORD']
    ausentes = [c for c in campos if not os.getenv(c)]
    if ausentes:
        raise RuntimeError('Configurações ausentes em .env: ' + ', '.join(ausentes))
    driver = os.getenv('DB_DRIVER')
    server = os.getenv('DB_SERVER')
    porta = os.getenv('DB_PORT', '1433')
    db = os.getenv('DB_NAME')
    user = os.getenv('DB_USER')
    pwd = os.getenv('DB_PASSWORD')
    return pyodbc.connect(
        f'DRIVER={{{driver}}};SERVER={server},{porta};DATABASE={db};UID={user};'
        f'PWD={{{pwd.replace("}", "}}")}}};Encrypt={os.getenv("DB_ENCRYPT", "yes")};'
        f'TrustServerCertificate={os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")};'
        'Connection Timeout=10;', timeout=10, autocommit=False)


def salvar_novos(itens, autor_id):
    """Insere só rascunhos; não altera registros nem remove notícias antigas."""
    inseridos, duplicados, sem_categoria = 0, 0, 0
    conn = conectar()
    try:
        cur = conn.cursor()
        cur.execute('SELECT id FROM dbo.Usuarios WHERE id=?', autor_id)
        if not cur.fetchone():
            raise ValueError('AUTOR_ID não corresponde a um usuário existente em dbo.Usuarios')
        cur.execute('SELECT ID_Categoria, NomeCategoria FROM dbo.Categorias')
        categorias = {chave(str(nome)): int(id_) for id_, nome in cur.fetchall()}
        for item in itens:
            categoria_id = categorias.get(chave(item['categoria']))
            if categoria_id is None:
                sem_categoria += 1
                LOG.warning('Categoria não encontrada: %s (item ignorado)', item['categoria'])
                continue
            cur.execute('SELECT TOP (1) ID_Editorial FROM dbo.NoticiasEditoriais WHERE URL_Fonte = ?', item['url_fonte'])
            if cur.fetchone():
                duplicados += 1
                continue
            # Segunda proteção para matérias repetidas sem o mesmo URL.
            cur.execute('SELECT TOP (1) ID_Editorial FROM dbo.NoticiasEditoriais WHERE Titulo = ? AND Fonte = ?', item['titulo'], item['fonte'])
            if cur.fetchone():
                duplicados += 1
                continue
            cur.execute('''INSERT INTO dbo.NoticiasEditoriais
                (Titulo, Resumo, Conteudo, ID_Categoria, ID_Autor, Fonte, URL_Fonte, Status, Destaque)
                VALUES (?, ?, ?, ?, ?, ?, ?, N'Rascunho', 0)''',
                item['titulo'], item['resumo'], item['conteudo'], categoria_id,
                autor_id, item['fonte'], item['url_fonte'])
            inseridos += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return inseridos, duplicados, sem_categoria


def main(argv=None):
    p = argparse.ArgumentParser(description='Coleta RSS (prévia padrão; gravação opcional e somente como Rascunho).')
    p.add_argument('--fontes', default=str(ROOT / 'fontes.json'))
    p.add_argument('--limite', type=int, default=10, help='Máximo por fonte (1 a 50)')
    p.add_argument('--salvar-rascunhos', action='store_true', help='Gravar no SQL Server; requer confirmação adicional')
    p.add_argument('--confirmo-gravacao', action='store_true', help='Confirma a gravação de rascunhos')
    p.add_argument('--json', action='store_true', help='Imprimir prévia JSON')
    args = p.parse_args(argv)
    if not 1 <= args.limite <= 50:
        p.error('--limite deve estar entre 1 e 50')
    if args.salvar_rascunhos != args.confirmo_gravacao:
        p.error('Para gravar, use --salvar-rascunhos e --confirmo-gravacao juntos')
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    fontes = carregar_fontes(args.fontes)
    print('Fontes ativas:', len(fontes))
    noticias = coletar(fontes, args.limite)
    print('Itens coletados:', len(noticias))
    if args.json:
        print(json.dumps(noticias, default=str, ensure_ascii=False, indent=2))
    else:
        for item in noticias:
            print(f"- [{item['regiao']}] {item['titulo']} ({item['fonte']})\n  {item['url_fonte']}")
    if args.salvar_rascunhos:
        autor = os.getenv('AUTOR_ID')
        if not autor or not autor.isdecimal():
            raise RuntimeError('Configure AUTOR_ID com um ID válido da tabela Usuarios no .env')
        n, repetidos, sem_cat = salvar_novos(noticias, int(autor))
        print(f'Rascunhos inseridos: {n}; repetidos: {repetidos}; sem categoria: {sem_cat}')
    else:
        print('\nMODO DE PRÉVIA: nenhuma informação foi gravada no banco.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as e:
        LOG.error('%s', e)
        sys.exit(1)
