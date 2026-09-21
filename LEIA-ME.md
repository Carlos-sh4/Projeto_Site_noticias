# Notícias Hoje — PWA pronto para publicar

Todos os arquivos desta pasta precisam ficar **juntos, no mesmo nível**:

```
index.html              página original + as tags do PWA
manifest.json           define nome, cores e ícones do app
sw.js                   service worker (instalação + offline)
icon-192.png            ícone 192x192
icon-512.png            ícone 512x512
icon-512-maskable.png   ícone adaptativo do Android
```

## 1. Testar no computador

O PWA não funciona abrindo o arquivo com duplo clique (`file://`). Rode um
servidor local: abra o terminal dentro desta pasta e execute

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`. No Chrome, F12 → aba **Application** →
**Manifest** e **Service Workers** mostram se está tudo certo.

## 2. Publicar com HTTPS

Escolha um dos dois:

**GitHub Pages** — crie um repositório, suba estes arquivos na raiz, vá em
*Settings → Pages*, selecione a branch `main` e a pasta `/ (root)`. Em um ou
dois minutos a URL `https://seuusuario.github.io/nome-do-repo/` fica no ar.

**Netlify Drop** — arraste esta pasta inteira para `app.netlify.com/drop`.
A URL sai na hora.

## 3. Instalar no celular

Abra a URL publicada no celular:

- **Android/Chrome**: aparece o aviso "Instalar app" (ou menu ⋮ → Instalar app).
- **iPhone/Safari**: botão Compartilhar → Adicionar à Tela de Início.

## Depois de atualizar o site

O service worker guarda os arquivos em cache. Sempre que mudar algo, abra o
`sw.js` e troque a versão do cache (`noticias-v1` → `noticias-v2`), senão o
celular continua mostrando a versão antiga.

## Limitações conhecidas

- O Tailwind vem do CDN e as imagens vêm do `placehold.co`. Sem internet o app
  abre, mas sem estilo e sem fotos. Para resolver: instalar o Tailwind no
  projeto e colocar as imagens nesta pasta.
- O site é estático: as notícias estão escritas direto no HTML.
- Precisa de APK para a Play Store? Publique o PWA primeiro e depois gere o
  pacote Android a partir da URL em `pwabuilder.com`.
