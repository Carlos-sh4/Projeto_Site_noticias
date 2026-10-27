require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const Parser = require("rss-parser");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const parser = new Parser({
  timeout: Number(process.env.RSS_TIMEOUT_MS || 15000),
  customFields: {
    item: [["media:content", "mediaContent"], ["media:thumbnail", "mediaThumbnail"]],
    feed: ["image"]
  }
});

const CATEGORY_CONFIG = {
  "Esportes": {
    queries: [
      "futebol Brasileirão",
      "esportes futebol",
      "olimpíadas esportes"
    ],
    color: "orange"
  },
  "Economia": {
    queries: [
      "economia Brasil",
      "mercado financeiro Brasil",
      "inflação juros dólar",
      "empresas negócios mercado"
    ],
    color: "emerald"
  },
  "Política": {
    queries: [
      "política Brasil",
      "Congresso Nacional Brasil",
      "governo federal Brasil",
      "Câmara dos Deputados Senado Federal"
    ],
    color: "blue"
  },
  "Brasil": {
    queries: [
      "Brasil notícias",
      "Brasil segurança educação infraestrutura",
      "Brasil serviços públicos"
    ],
    color: "indigo"
  },
  "Mundo": {
    queries: [
      "mundo notícias",
      "internacional geopolítica",
      "Europa Estados Unidos Ásia mundo"
    ],
    color: "purple"
  },
  "Saúde": {
    queries: [
      "saúde Brasil",
      "medicina ciência saúde",
      "SUS saúde pública",
      "vacinas doenças prevenção"
    ],
    color: "teal"
  },
  "Tecnologia": {
    queries: [
      "tecnologia Brasil",
      "inteligência artificial tecnologia",
      "inovação startups tecnologia",
      "cibersegurança tecnologia"
    ],
    color: "cyan"
  },
  "Entretenimento": {
    queries: [
      "entretenimento Brasil",
      "cinema séries televisão",
      "música celebridades cultura pop"
    ],
    color: "pink"
  }
};

const SUBSCRIPTIONS = [
  {
    id: "gratuito",
    nome: "Grátis",
    descricao: "Acesso às notícias e recursos públicos do portal.",
    valorMensal: 0,
    recursos: [
      "Notícias por categoria",
      "Busca por assuntos",
      "Atualizações públicas"
    ]
  },
  {
    id: "premium",
    nome: "Premium",
    descricao: "Plano demonstrativo para integrar posteriormente a um gateway de pagamento.",
    valorMensal: 19.90,
    recursos: [
      "Experiência sem anúncios (quando implementada)",
      "Conteúdo premium (quando implementado)",
      "Recursos exclusivos"
    ]
  }
];

let poolPromise = null;
const cache = new Map();

function sqlConfig() {
  return {
    server: process.env.SQL_SERVER || "localhost",
    port: Number(process.env.SQL_PORT || 1433),
    database: process.env.SQL_DATABASE || "LISIMETRO",
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
      encrypt: String(process.env.SQL_ENCRYPT).toLowerCase() === "true",
      trustServerCertificate:
        String(process.env.SQL_TRUST_SERVER_CERTIFICATE).toLowerCase() !== "false"
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig()).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\s+/g, "");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max = 1000) {
  const text = stripHtml(value);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function imageFromItem(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item.mediaContent && item.mediaContent.url) return item.mediaContent.url;
  if (item.mediaThumbnail && item.mediaThumbnail.url) return item.mediaThumbnail.url;

  const html = item.content || item["content:encoded"] || item.description || "";
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function sourceFromItem(item) {
  if (item.source) {
    if (typeof item.source === "string") return item.source;
    if (item.source.title) return item.source.title;
  }

  const title = String(item.title || "");
  const parts = title.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "Google News";
}

function canonicalTitle(item) {
  const title = String(item.title || "Sem título").trim();
  const source = sourceFromItem(item);
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

function googleNewsUrl(query) {
  const hl = process.env.GOOGLE_NEWS_HL || "pt-BR";
  const gl = process.env.GOOGLE_NEWS_GL || "BR";
  const ceid = process.env.GOOGLE_NEWS_CEID || "BR:pt-419";
  const q = encodeURIComponent(`${query} when:3d`);
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ sucesso: false, mensagem: "Token não informado." });
  }

  try {
    req.usuario = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || "troque-esta-chave"
    );
    next();
  } catch {
    return res.status(401).json({ sucesso: false, mensagem: "Token inválido ou expirado." });
  }
}

function adminRequired(req, res, next) {
  if (!req.usuario || req.usuario.tipo !== "Admin") {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Acesso permitido somente para administradores."
    });
  }
  next();
}

async function ensureCategories() {
  const pool = await getPool();
  for (const nome of Object.keys(CATEGORY_CONFIG)) {
    const request = pool.request();
    request.input("nome", sql.VarChar(50), nome);
    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM Categorias WHERE NomeCategoria = @nome)
      INSERT INTO Categorias (NomeCategoria, DescricaoCategoria)
      VALUES (@nome, @nome);
    `);
  }
}

async function categoryId(nome) {
  const pool = await getPool();
  const result = await pool.request()
    .input("nome", sql.VarChar(50), nome)
    .query(`
      SELECT TOP 1 ID_Categoria
      FROM Categorias
      WHERE NomeCategoria = @nome
    `);

  if (!result.recordset.length) throw new Error(`Categoria não encontrada: ${nome}`);
  return result.recordset[0].ID_Categoria;
}

async function saveFeedItems(items, categoria) {
  const pool = await getPool();
  const idCategoria = await categoryId(categoria);
  let inseridos = 0;
  let ignorados = 0;

  for (const item of items) {
    const url = normalizeUrl(item.link || item.guid);
    if (!url) {
      ignorados++;
      continue;
    }

    const titulo = truncate(canonicalTitle(item), 255);
    const resumo = truncate(
      item.contentSnippet || item.content || item.description || "",
      1000
    );
    const imagem = imageFromItem(item);
    const fonte = truncate(sourceFromItem(item), 100);
    const dataPublicacao = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : new Date();

    if (Number.isNaN(dataPublicacao.getTime())) {
      ignorados++;
      continue;
    }

    const request = pool.request();
    request.input("titulo", sql.VarChar(255), titulo);
    request.input("resumo", sql.VarChar(1000), resumo);
    request.input("url", sql.VarChar(850), url);
    request.input("imagem", sql.VarChar(850), imagem || null);
    request.input("fonte", sql.VarChar(100), fonte);
    request.input("categoria", sql.Int, idCategoria);
    request.input("dataPublicacao", sql.DateTime2, dataPublicacao);

    const result = await request.query(`
      IF EXISTS (SELECT 1 FROM Posts WHERE URL_Post = @url)
      BEGIN
        UPDATE Posts
        SET
          Titulo_Post = @titulo,
          Resumo = @resumo,
          URL_Imagem = @imagem,
          Fonte = @fonte,
          ID_Categoria = @categoria,
          DataPublicacao = @dataPublicacao
        WHERE URL_Post = @url;

        SELECT CAST(0 AS INT) AS Inserido;
      END
      ELSE
      BEGIN
        INSERT INTO Posts (
          Titulo_Post,
          Resumo,
          URL_Post,
          URL_Imagem,
          Fonte,
          ID_Categoria,
          ID_Autor,
          DataPublicacao
        )
        VALUES (
          @titulo,
          @resumo,
          @url,
          @imagem,
          @fonte,
          @categoria,
          NULL,
          @dataPublicacao
        );

        SELECT CAST(1 AS INT) AS Inserido;
      END
    `);

    if (result.recordset[0].Inserido === 1) inseridos++;
    else ignorados++;
  }

  return { inseridos, atualizadosOuExistentes: ignorados };
}

async function collectCategory(categoria) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) throw new Error(`Categoria não suportada: ${categoria}`);

  const now = Date.now();
  const cached = cache.get(categoria);
  const cacheMinutes = Number(process.env.NEWS_CACHE_MINUTES || 10);

  if (cached && now - cached.time < cacheMinutes * 60 * 1000) {
    return cached.data;
  }

  const all = [];
  const seen = new Set();

  for (const query of config.queries) {
    const feed = await parser.parseURL(googleNewsUrl(query));
    for (const item of feed.items || []) {
      const url = normalizeUrl(item.link || item.guid);
      const key = url || canonicalTitle(item).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
  }

  all.sort((a, b) => {
    const da = new Date(a.isoDate || a.pubDate || 0).getTime();
    const db = new Date(b.isoDate || b.pubDate || 0).getTime();
    return db - da;
  });

  const limited = all.slice(0, 60);
  const saved = await saveFeedItems(limited, categoria);

  const data = {
    categoria,
    totalColetado: limited.length,
    ...saved,
    atualizadoEm: new Date().toISOString()
  };

  cache.set(categoria, { time: now, data });
  return data;
}

app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

// Servir o frontend existente pelo mesmo servidor.
// O projeto possui a pasta "Site" com as páginas principais.
const sitePath = path.join(__dirname, "..", "Site");
app.use(express.static(sitePath));

app.get("/api/status", async (req, res) => {
  let banco = "offline";
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    banco = "online";
  } catch {}

  res.json({
    sucesso: true,
    servidor: "Portal de Notícias API",
    banco,
    data: new Date().toISOString(),
    categorias: Object.keys(CATEGORY_CONFIG)
  });
});

app.get("/api/categorias", (req, res) => {
  res.json({
    sucesso: true,
    categorias: [
      "Esportes",
      "Economia",
      "Política",
      "Brasil",
      "Mundo",
      "Saúde",
      "Tecnologia",
      "Entretenimento"
    ],
    moduloComercial: "Assinaturas"
  });
});

app.get("/api/noticias", async (req, res) => {
  try {
    const pool = await getPool();
    const categoria = req.query.categoria || null;
    const limite = Math.min(Math.max(Number(req.query.limite || 20), 1), 100);

    const request = pool.request().input("limite", sql.Int, limite);

    let where = "";
    if (categoria) {
      request.input("categoria", sql.VarChar(50), categoria);
      where = "WHERE c.NomeCategoria = @categoria";
    }

    const result = await request.query(`
      SELECT TOP (@limite)
        p.ID_Post AS id,
        p.Titulo_Post AS titulo,
        p.Resumo AS resumo,
        p.URL_Post AS url,
        p.URL_Imagem AS imagem,
        p.Fonte AS fonte,
        c.NomeCategoria AS categoria,
        p.DataPublicacao AS dataPublicacao,
        p.DataColeta AS dataColeta
      FROM Posts p
      INNER JOIN Categorias c ON c.ID_Categoria = p.ID_Categoria
      ${where}
      ORDER BY p.DataPublicacao DESC;
    `);

    res.json({
      sucesso: true,
      total: result.recordset.length,
      noticias: result.recordset
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível consultar as notícias.",
      erro: err.message
    });
  }
});

app.get("/api/noticias/buscar", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const categoria = String(req.query.categoria || "").trim();
    const limite = Math.min(Math.max(Number(req.query.limite || 20), 1), 100);

    if (q.length < 2) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe pelo menos 2 caracteres para a busca."
      });
    }

    const pool = await getPool();
    const request = pool.request()
      .input("q", sql.VarChar(500), `%${q}%`)
      .input("limite", sql.Int, limite);

    let where = `
      WHERE (
        p.Titulo_Post LIKE @q
        OR p.Resumo LIKE @q
        OR p.Fonte LIKE @q
      )
    `;

    if (categoria) {
      request.input("categoria", sql.VarChar(50), categoria);
      where += " AND c.NomeCategoria = @categoria";
    }

    const result = await request.query(`
      SELECT TOP (@limite)
        p.ID_Post AS id,
        p.Titulo_Post AS titulo,
        p.Resumo AS resumo,
        p.URL_Post AS url,
        p.URL_Imagem AS imagem,
        p.Fonte AS fonte,
        c.NomeCategoria AS categoria,
        p.DataPublicacao AS dataPublicacao
      FROM Posts p
      INNER JOIN Categorias c ON c.ID_Categoria = p.ID_Categoria
      ${where}
      ORDER BY p.DataPublicacao DESC;
    `);

    // Pesquisa relacionada ao vivo quando solicitado.
    let aoVivo = [];
    if (req.query.aoVivo === "true") {
      const feed = await parser.parseURL(googleNewsUrl(
        categoria ? `${categoria} ${q}` : q
      ));

      aoVivo = (feed.items || []).slice(0, limite).map((item) => ({
        titulo: canonicalTitle(item),
        resumo: truncate(item.contentSnippet || item.description || "", 1000),
        url: item.link || item.guid || null,
        imagem: imageFromItem(item),
        fonte: sourceFromItem(item),
        dataPublicacao: item.isoDate || item.pubDate || null,
        categoria: categoria || null,
        aoVivo: true
      }));
    }

    res.json({
      sucesso: true,
      termo: q,
      totalBanco: result.recordset.length,
      resultadosBanco: result.recordset,
      resultadosAoVivo: aoVivo
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro na busca.",
      erro: err.message
    });
  }
});

app.post("/api/noticias/sincronizar", authRequired, adminRequired, async (req, res) => {
  try {
    const categoria = String(req.body.categoria || "").trim();

    if (!CATEGORY_CONFIG[categoria]) {
      return res.status(400).json({
        sucesso: false,
        mensagem: `Categoria inválida. Use: ${Object.keys(CATEGORY_CONFIG).join(", ")}`
      });
    }

    const resultado = await collectCategory(categoria);

    res.json({
      sucesso: true,
      mensagem: `Sincronização de ${categoria} concluída.`,
      ...resultado
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao sincronizar notícias.",
      erro: err.message
    });
  }
});

app.post("/api/noticias/sincronizar-todas", authRequired, adminRequired, async (req, res) => {
  try {
    const resultados = {};

    for (const categoria of Object.keys(CATEGORY_CONFIG)) {
      try {
        resultados[categoria] = await collectCategory(categoria);
      } catch (err) {
        resultados[categoria] = {
          sucesso: false,
          erro: err.message
        };
      }
    }

    res.json({
      sucesso: true,
      mensagem: "Sincronização concluída.",
      resultados
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro geral na sincronização.",
      erro: err.message
    });
  }
});

app.get("/api/esportes/jogos", async (req, res) => {
  try {
    const liga = String(req.query.liga || "bra.1");
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(liga)}/scoreboard`;

    const response = await axios.get(url, { timeout: 10000 });

    res.json({
      sucesso: true,
      fonte: "ESPN",
      liga,
      ...response.data
    });
  } catch (err) {
    res.status(502).json({
      sucesso: false,
      mensagem: "Não foi possível consultar os resultados esportivos.",
      erro: err.message
    });
  }
});

app.get("/api/economia/cotacoes", async (req, res) => {
  try {
    const moedas = String(
      req.query.moedas || "USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL"
    );

    const url =
      `https://economia.awesomeapi.com.br/last/${encodeURIComponent(moedas)}`;

    const response = await axios.get(url, { timeout: 10000 });

    res.json({
      sucesso: true,
      fonte: "AwesomeAPI",
      dados: response.data
    });
  } catch (err) {
    res.status(502).json({
      sucesso: false,
      mensagem: "Não foi possível consultar as cotações.",
      erro: err.message
    });
  }
});

app.get("/api/assinaturas", (req, res) => {
  res.json({
    sucesso: true,
    aviso: "Os planos abaixo são catálogo da aplicação. Para cobrança real, conecte um gateway de pagamento.",
    planos: SUBSCRIPTIONS
  });
});

app.post("/api/newsletter", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe um e-mail válido."
      });
    }

    const pool = await getPool();
    const request = pool.request().input("email", sql.VarChar(255), email);

    await request.query(`
      IF OBJECT_ID('Newsletter', 'U') IS NULL
      BEGIN
        CREATE TABLE Newsletter (
          ID_Newsletter INT IDENTITY(1,1) PRIMARY KEY,
          Email VARCHAR(255) NOT NULL UNIQUE,
          Ativo BIT NOT NULL DEFAULT 1,
          DataCadastro DATETIME2 NOT NULL DEFAULT SYSDATETIME()
        );
      END
    `);

    try {
      await pool.request()
        .input("email2", sql.VarChar(255), email)
        .query(`
          INSERT INTO Newsletter (Email)
          VALUES (@email2);
        `);
    } catch (e) {
      if (!String(e.message).toLowerCase().includes("unique")) throw e;
    }

    res.status(201).json({
      sucesso: true,
      mensagem: "E-mail registrado na newsletter."
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível registrar o e-mail.",
      erro: err.message
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const nome = String(req.body.nome || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");

    if (nome.length < 3 || !email || senha.length < 8) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nome, e-mail e senha válida são obrigatórios."
      });
    }

    const pool = await getPool();

    const exists = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT TOP 1 ID_Usuario
        FROM Usuario
        WHERE Email = @email
      `);

    if (exists.recordset.length) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado."
      });
    }

    const hash = await bcrypt.hash(senha, 12);

    const result = await pool.request()
      .input("nome", sql.VarChar(100), nome)
      .input("email", sql.VarChar(255), email)
      .input("tipo", sql.VarChar(20), "Leitor")
      .input("hash", sql.VarBinary(64), Buffer.from(hash, "utf8"))
      .query(`
        INSERT INTO Usuario (NomeUsuario, Email, TipoUsuario, SenhaHash)
        OUTPUT INSERTED.ID_Usuario, INSERTED.NomeUsuario, INSERTED.Email, INSERTED.TipoUsuario
        VALUES (@nome, @email, @tipo, @hash);
      `);

    res.status(201).json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso.",
      usuario: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao cadastrar usuário.",
      erro: err.message
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");

    const pool = await getPool();

    const result = await pool.request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT TOP 1
          ID_Usuario,
          NomeUsuario,
          Email,
          TipoUsuario,
          SenhaHash,
          Ativo
        FROM Usuario
        WHERE Email = @email
      `);

    if (!result.recordset.length) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const usuario = result.recordset[0];

    if (!usuario.Ativo) {
      return res.status(403).json({
        sucesso: false,
        mensagem: "Usuário desativado."
      });
    }

    const stored = Buffer.from(usuario.SenhaHash).toString("utf8");
    const senhaOk = await bcrypt.compare(senha, stored);

    if (!senhaOk) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const token = jwt.sign(
      {
        id: usuario.ID_Usuario,
        nome: usuario.NomeUsuario,
        email: usuario.Email,
        tipo: usuario.TipoUsuario
      },
      process.env.JWT_SECRET || "troque-esta-chave",
      { expiresIn: "7d" }
    );

    res.json({
      sucesso: true,
      token,
      usuario: {
        id: usuario.ID_Usuario,
        nome: usuario.NomeUsuario,
        email: usuario.Email,
        tipo: usuario.TipoUsuario
      }
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao realizar login.",
      erro: err.message
    });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  res.json({
    sucesso: true,
    usuario: req.usuario
  });
});

app.get("/api/noticias/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID inválido."
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT
          p.ID_Post AS id,
          p.Titulo_Post AS titulo,
          p.Resumo AS resumo,
          p.URL_Post AS url,
          p.URL_Imagem AS imagem,
          p.Fonte AS fonte,
          c.NomeCategoria AS categoria,
          p.DataPublicacao AS dataPublicacao,
          p.DataColeta AS dataColeta
        FROM Posts p
        INNER JOIN Categorias c ON c.ID_Categoria = p.ID_Categoria
        WHERE p.ID_Post = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Notícia não encontrada."
      });
    }

    res.json({
      sucesso: true,
      noticia: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar notícia.",
      erro: err.message
    });
  }
});

app.get("/api", (req, res) => {
  res.json({
    sucesso: true,
    mensagem: "API do Portal de Notícias está funcionando.",
    rotas: [
      "/api/status",
      "/api/categorias",
      "/api/noticias",
      "/api/noticias/buscar",
      "/api/noticias/:id",
      "/api/esportes/jogos",
      "/api/economia/cotacoes",
      "/api/assinaturas",
      "/api/auth/register",
      "/api/auth/login",
      "/api/newsletter"
    ]
  });
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Endpoint não encontrado."
    });
  }

  res.status(404).send("Página não encontrada.");
});


async function scheduleAutomaticSync() {
  const minutes = Number(process.env.NEWS_AUTO_SYNC_MINUTES || 15);
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  console.log(`Sincronização automática: a cada ${minutes} minutos.`);

  const executar = async () => {
    for (const categoria of Object.keys(CATEGORY_CONFIG)) {
      try {
        const r = await collectCategory(categoria);
        console.log(
          `[SYNC] ${categoria}: ${r.totalColetado} coletadas, ` +
          `${r.inseridos} novas, ${r.atualizadosOuExistentes} existentes/atualizadas.`
        );
      } catch (err) {
        console.error(`[SYNC] ${categoria}: ${err.message}`);
      }
    }
  };

  await executar();
  setInterval(executar, minutes * 60 * 1000);
}

async function start() {
  try {
    await getPool();
    await ensureCategories();
    await scheduleAutomaticSync();

    app.listen(PORT, () => {
      console.log("==============================================");
      console.log(" PORTAL DE NOTÍCIAS - API");
      console.log("==============================================");
      console.log(` API:      http://localhost:${PORT}/api`);
      console.log(` Status:   http://localhost:${PORT}/api/status`);
      console.log(` Frontend: http://localhost:${PORT}/`);
      console.log(" Banco:    SQL Server / LISIMETRO");
      console.log("==============================================");
    });
  } catch (err) {
    console.error("Não foi possível iniciar a API.");
    console.error(err.message);
    process.exit(1);
  }
}

start();
