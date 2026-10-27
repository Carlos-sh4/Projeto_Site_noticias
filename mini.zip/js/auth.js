/* Cadastro e login - versão didática (dados salvos no navegador via localStorage).
   Para um site real, essa lógica precisa rodar em um servidor com banco de dados. */
(function () {
  var USERS_KEY = 'site-users';
  var SESSION_KEY = 'site-session';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
  }
  function saveUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function fromHex(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }));
  }

  // Nunca guardamos a senha em texto puro: guardamos um hash PBKDF2 com "sal" aleatório.
  async function hashSenha(senha, saltHex) {
    var salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
    var chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, chave, 256);
    return { salt: toHex(salt), hash: toHex(bits) };
  }

  function mostrarMsg(el, texto, ok) {
    el.textContent = texto;
    el.className = 'mb-4 rounded-md px-4 py-3 text-sm font-semibold ' +
      (ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
    el.hidden = false;
  }

  // Sessão atual (use nas outras páginas para saber se há usuário logado)
  window.Auth = {
    usuarioAtual: function () {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
    },
    sair: function () { sessionStorage.removeItem(SESSION_KEY); location.href = 'index.html'; }
  };

  // ===== CADASTRO =====
  var formCadastro = document.getElementById('form-cadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('msg');
      var nome = formCadastro.nome.value.trim();
      var email = formCadastro.email.value.trim().toLowerCase();
      var senha = formCadastro.senha.value;
      var confirma = formCadastro.confirma.value;

      if (nome.length < 3) return mostrarMsg(msg, 'Informe seu nome completo.', false);
      if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha))
        return mostrarMsg(msg, 'A senha precisa ter 8 caracteres ou mais, com letras e números.', false);
      if (senha !== confirma) return mostrarMsg(msg, 'As senhas não são iguais.', false);

      var users = getUsers();
      if (users.some(function (u) { return u.email === email; }))
        return mostrarMsg(msg, 'Este e-mail já está cadastrado. Entre na sua conta.', false);

      try {
        var h = await hashSenha(senha);
        users.push({ nome: nome, email: email, salt: h.salt, hash: h.hash, criadoEm: new Date().toISOString() });
        saveUsers(users);
        mostrarMsg(msg, 'Conta criada! Redirecionando para o login...', true);
        setTimeout(function () { location.href = 'login.html'; }, 1500);
      } catch (err) {
        mostrarMsg(msg, 'Não foi possível criar a conta neste navegador. Abra o site por https ou localhost.', false);
      }
    });
  }

  // ===== LOGIN =====
  var formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('msg');
      var email = formLogin.email.value.trim().toLowerCase();
      var senha = formLogin.senha.value;
      var user = getUsers().find(function (u) { return u.email === email; });

      try {
        // Mesma mensagem para e-mail ou senha errados, para não revelar quais e-mails existem.
        if (!user) return mostrarMsg(msg, 'E-mail ou senha incorretos.', false);
        var h = await hashSenha(senha, user.salt);
        if (h.hash !== user.hash) return mostrarMsg(msg, 'E-mail ou senha incorretos.', false);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nome: user.nome, email: user.email }));
        location.href = 'index.html';
      } catch (err) {
        mostrarMsg(msg, 'Não foi possível entrar neste navegador. Abra o site por https ou localhost.', false);
      }
    });
  }

  // Mostrar/ocultar senha
  document.querySelectorAll('[data-toggle-senha]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var campo = document.getElementById(btn.getAttribute('data-toggle-senha'));
      var mostrar = campo.type === 'password';
      campo.type = mostrar ? 'text' : 'password';
      btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      btn.firstElementChild.className = mostrar ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  });
})();
