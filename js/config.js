// Em acesso público, a API responde no mesmo domínio em /api (proxy IIS).
// No navegador da própria VPS, durante o teste local, usa a porta 8001.
window.API_BASE_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:8001/api'
  : '/api';
