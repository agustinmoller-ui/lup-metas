/* =========================================================
   Portal de metas LUP
   Lógica del cliente: sesión privada, navegación y contenido.
   El endpoint se resuelve en tiempo de publicación: el padre
   sustituye la constante API_ENDPOINT por la URL del backend.
   No se imprimen claves ni tokens en consola.
   ========================================================= */
(function () {
  'use strict';

  var API_ENDPOINT = 'https://lupita-f3e3c640.base44.app/functions/portalMetas';
  var MINUTES_ENDPOINT = 'https://lupita-f3e3c640.base44.app/functions/lupMinutes';
  var SESSION_KEY = 'lup.portal.session';
  var PLACEHOLDER = '__API_ENDPOINT__';
  var MIN_PASSWORD = 12;
  var DEFAULT_FRAME_HEIGHT = 560;
  var MAX_FRAME_HEIGHT = 20000;

  /* ---------- Estado en memoria ---------- */
  var state = {
    token: null,
    role: null,
    expiresAt: null,
    page: null,
    activationToken: null,
    loadingPage: false,
    drawerOpen: false,
    collapsed: false
  };

  /* ---------- Utilidades DOM ---------- */
  function byId(id) {
    return document.getElementById(id);
  }

  var els = {};

  function cacheElements() {
    els.boot = byId('boot');
    els.viewLogin = byId('view-login');
    els.viewSetup = byId('view-setup');
    els.viewApp = byId('view-app');

    els.formLogin = byId('form-login');
    els.loginPassword = byId('login-password');
    els.loginError = byId('login-error');
    els.btnLogin = byId('btn-login');

    els.formSetup = byId('form-setup');
    els.setupError = byId('setup-error');
    els.btnSetup = byId('btn-setup');
    els.btnSetupCancel = byId('btn-setup-cancel');

    els.sidebar = byId('sidebar');
    els.drawerScrim = byId('drawer-scrim');
    els.btnDrawer = byId('btn-drawer');
    els.btnDrawerClose = byId('btn-drawer-close');
    els.btnCollapse = byId('btn-collapse');
    els.btnLogout = byId('btn-logout');
    els.navAdmin = byId('nav-admin');
    els.linkHome = byId('link-home');
    els.navInicio = byId('nav-inicio');

    els.crumbs = byId('crumbs');
    els.sessionChip = byId('session-chip');
    els.sessionRole = byId('session-role');
    els.sessionExp = byId('session-exp');

    els.panelInicio = byId('panel-inicio');
    els.panelContent = byId('panel-content');
    els.panelAdmin = byId('panel-admin');
    els.panelTasks = byId('panel-tareas');
    els.tasksRoot = byId('tasks-root');
    els.stage = byId('stage');

    els.contentEyebrow = byId('content-eyebrow');
    els.contentTitle = byId('content-title');
    els.frameShell = byId('frame-shell');
    els.frame = byId('content-frame');
    els.frameError = byId('frame-error');
    els.frameErrorText = byId('frame-error-text');
    els.btnReload = byId('btn-reload');
    els.btnRetry = byId('btn-retry');

    els.adminBlocked = byId('admin-blocked');
    els.adminPanel = byId('admin-panel');
    els.btnReloginAdmin = byId('btn-relogin-admin');
    els.btnSettingsReload = byId('btn-settings-reload');
    els.adminEmail = byId('admin-email');
    els.adminViewer = byId('admin-viewer');
    els.adminHours = byId('admin-hours');
    els.formRevoke = byId('form-revoke');

    els.homeStats = byId('home-stats');
    els.homePeriod = byId('home-period');
    els.statDays = byId('stat-days');
    els.statDaysNote = byId('stat-days-note');
    els.statTime = byId('stat-time');
    els.statTimeNote = byId('stat-time-note');
    els.statAchieved = byId('stat-achieved');
    els.statAchievedNote = byId('stat-achieved-note');
    els.statBonus = byId('stat-bonus');
    els.statBonusNote = byId('stat-bonus-note');
    els.homeStatsNote = byId('home-stats-note');
    els.homeBackupBlock = byId('home-backup-block');
    els.homeBackup = byId('home-backup');

    els.bonusMonth = byId('home-bonus-month');
    els.bonusMonthTag = byId('bonus-month-tag');
    els.bonusMonthStatus = byId('bonus-month-status');
    els.bonusNetSales = byId('bonus-net-sales');
    els.bonusNetSalesNote = byId('bonus-net-sales-note');
    els.bonusProjectedSales = byId('bonus-projected-sales');
    els.bonusProjectedSalesNote = byId('bonus-projected-sales-note');
    els.bonusPace = byId('bonus-pace');
    els.bonusPaceNote = byId('bonus-pace-note');
    els.bonusWorkdays = byId('bonus-workdays');
    els.bonusWorkdaysNote = byId('bonus-workdays-note');
    els.bonusCurrent = byId('bonus-current');
    els.bonusCurrentNote = byId('bonus-current-note');
    els.bonusProjected = byId('bonus-projected');
    els.bonusProjectedNote = byId('bonus-projected-note');
    els.bonusTableWrap = byId('bonus-table-wrap');
    els.bonusCaption = byId('bonus-caption');
    els.bonusRows = byId('bonus-rows');
    els.bonusLegend = byId('bonus-legend');

    els.toasts = byId('toasts');
    els.modal = byId('modal');
    els.modalTitle = byId('modal-title');
    els.modalBody = byId('modal-body');
    els.modalConfirm = byId('modal-confirm');
  }

  /* ---------- Páginas ---------- */
  var PAGES = {
    metas2026: { label: 'Metas', year: 'Metas 2026', group: 'y2026', eyebrow: 'Metas 2026' },
    seguimiento2026: { label: 'Seguimiento', year: 'Metas 2026', group: 'y2026', eyebrow: 'Metas 2026' },
    metas2027: { label: 'Metas', year: 'Metas 2027', group: 'y2027', eyebrow: 'Metas 2027' },
    seguimiento2027: { label: 'Seguimiento', year: 'Metas 2027', group: 'y2027', eyebrow: 'Metas 2027' },
    acuerdos: { label: 'Acuerdos y contratos', year: null, group: null, eyebrow: 'Documentos' }
  };

  /* ---------- Errores de API ---------- */
  function ApiError(message, status, code) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status || 0;
    this.code = code || '';
  }
  ApiError.prototype = Object.create(Error.prototype);

  function friendlyStatus(status) {
    if (status === 400) return 'Revisa los datos ingresados e inténtalo otra vez.';
    if (status === 401) return 'La clave no es correcta o la sesión expiró.';
    if (status === 403) return 'Esta acción requiere una sesión de administrador.';
    if (status === 404) return 'El contenido solicitado no está disponible.';
    if (status === 409) return 'La acción no se puede completar en este estado.';
    if (status === 410) return 'El enlace de activación ya no es válido.';
    if (status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
    if (status >= 500) return 'El servidor no respondió. Inténtalo nuevamente en unos minutos.';
    return 'No pudimos completar la solicitud.';
  }

  function cleanText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/[<>]/g, '').trim();
  }

  function isConfigured() {
    return typeof API_ENDPOINT === 'string' &&
      API_ENDPOINT.length > 0 &&
      API_ENDPOINT.indexOf(PLACEHOLDER) === -1;
  }

  /* ---------- Cliente de API ---------- */
  function callApi(action, payload, timeoutMs, endpoint) {
    if (!isConfigured()) {
      return Promise.reject(new ApiError('El portal todavía no está conectado al servidor privado.', 0, 'not_configured'));
    }

    var body = Object.assign({ action: action }, payload || {});
    var controller = null;
    var timer = null;

    if (typeof AbortController === 'function') {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, timeoutMs || 20000);
    }

    return fetch(endpoint || API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (err) { data = null; }
        }
        if (!response.ok || !data || data.ok !== true) {
          var message = data && typeof data.error === 'string' && data.error
            ? cleanText(data.error)
            : friendlyStatus(response.status);
          throw new ApiError(message || friendlyStatus(response.status), response.status, data && data.code);
        }
        return data;
      });
    }).catch(function (err) {
      if (err instanceof ApiError) throw err;
      if (err && err.name === 'AbortError') {
        throw new ApiError('La solicitud tardó demasiado. Revisa tu conexión e inténtalo otra vez.', 0, 'timeout');
      }
      throw new ApiError('No pudimos conectar con el servidor privado. Revisa tu conexión.', 0, 'network');
    }).then(function (data) {
      if (timer) clearTimeout(timer);
      return data;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  /* ---------- Sesión (solo sessionStorage) ---------- */
  function saveSession(data) {
    var session = {
      token: data.token,
      role: data.role,
      expiresAt: data.expiresAt || null
    };
    state.token = session.token;
    state.role = session.role;
    state.expiresAt = session.expiresAt;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {
      /* Si el navegador bloquea el almacenamiento, la sesión vive en memoria. */
    }
  }

  function readStoredSession() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(SESSION_KEY);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token) return null;
    return parsed;
  }

  function clearSessionStorage() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* sin acción */ }
  }

  function clearSessionState() {
    state.token = null;
    state.role = null;
    state.expiresAt = null;
    state.page = null;
    clearSessionStorage();
  }

  function expireToMillis(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
    var parsed = Date.parse(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function sessionRemaining() {
    var until = expireToMillis(state.expiresAt);
    if (!until) return null;
    return until - Date.now();
  }

  function isExpired() {
    var remaining = sessionRemaining();
    return remaining !== null && remaining <= 0;
  }

  function formatTime(value) {
    var until = expireToMillis(value);
    if (!until) return 'Sesión activa';
    var date = new Date(until);
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return 'Hasta ' + hours + ':' + minutes;
  }

  /* ---------- Avisos ---------- */
  function toast(message, type) {
    if (!els.toasts || !message) return;
    var node = document.createElement('div');
    node.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    node.setAttribute('role', type === 'error' ? 'alert' : 'status');

    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', type === 'error' ? '#i-alert' : '#i-check');
    icon.appendChild(use);

    var text = document.createElement('span');
    text.textContent = message;

    node.appendChild(icon);
    node.appendChild(text);
    els.toasts.appendChild(node);

    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 220);
    }, type === 'error' ? 6000 : 4200);
  }

  /* ---------- Modal de confirmación ---------- */
  var modalResolver = null;

  function openModal(title, body, confirmLabel) {
    if (!els.modal) return Promise.resolve(false);
    els.modalTitle.textContent = title;
    els.modalBody.textContent = body;
    els.modalConfirm.textContent = confirmLabel || 'Confirmar';
    els.modal.hidden = false;
    els.modalConfirm.focus();
    return new Promise(function (resolve) {
      modalResolver = resolve;
    });
  }

  function closeModal(result) {
    if (!els.modal) return;
    els.modal.hidden = true;
    var resolver = modalResolver;
    modalResolver = null;
    if (resolver) resolver(Boolean(result));
  }

  /* ---------- Vistas ---------- */
  function showView(name) {
    els.boot.hidden = true;
    els.viewLogin.hidden = name !== 'login';
    els.viewSetup.hidden = name !== 'setup';
    els.viewApp.hidden = name !== 'app';
    document.body.dataset.view = name;
    if (name !== 'app') closeDrawer(false);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.classList.toggle('is-busy', Boolean(busy));
    button.disabled = Boolean(busy);
  }

  function showFormError(node, message) {
    if (!node) return;
    if (!message) {
      node.hidden = true;
      node.textContent = '';
      return;
    }
    node.textContent = message;
    node.hidden = false;
  }

  /* ---------- Arranque ---------- */
  function readActivationToken() {
    var hash = window.location.hash || '';
    if (!hash || hash.indexOf('#activar=') !== 0) return null;
    var raw = hash.slice('#activar='.length);
    var token = '';
    try { token = decodeURIComponent(raw); } catch (err) { token = raw; }
    token = token.trim();
    wipeActivationHash();
    return token || null;
  }

  function wipeActivationHash() {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    try {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    } catch (err) { /* sin acción */ }
  }

  function boot() {
    cacheElements();
    bindEvents();
    initHomeExtras();

    state.activationToken = readActivationToken();

    if (state.activationToken) {
      showView('setup');
      var first = byId('setup-admin');
      if (first) first.focus();
      return;
    }

    var stored = readStoredSession();
    if (!stored) {
      showView('login');
      if (els.loginPassword) els.loginPassword.focus();
      return;
    }

    if (isExpiredValue(stored.expiresAt)) {
      clearSessionState();
      showView('login');
      toast('Tu sesión anterior expiró. Ingresa tu clave nuevamente.', 'error');
      return;
    }

    callApi('session', { token: stored.token }).then(function (data) {
      saveSession({
        token: stored.token,
        role: data.role || stored.role,
        expiresAt: data.expiresAt || stored.expiresAt
      });
      enterApp();
    }).catch(function (err) {
      clearSessionState();
      showView('login');
      if (err && err.code === 'not_configured') {
        toast(err.message, 'error');
      } else if (err && err.status === 401) {
        toast('La sesión anterior ya no es válida. Ingresa tu clave nuevamente.', 'error');
      } else {
        toast(err && err.message ? err.message : 'No pudimos verificar la sesión.', 'error');
      }
    });
  }

  function isExpiredValue(value) {
    var until = expireToMillis(value);
    return Boolean(until) && until <= Date.now();
  }

  /* ---------- Acceso ---------- */
  function handleLogin(event) {
    if (event) event.preventDefault();
    showFormError(els.loginError, '');

    var roleInput = els.formLogin.querySelector('input[name="role"]:checked');
    var role = roleInput ? roleInput.value : 'viewer';
    var password = els.loginPassword ? els.loginPassword.value : '';

    if (!password) {
      showFormError(els.loginError, 'Ingresa tu clave de acceso.');
      if (els.loginPassword) els.loginPassword.focus();
      return;
    }
    if (password.length < MIN_PASSWORD) {
      showFormError(els.loginError, 'La clave debe tener al menos ' + MIN_PASSWORD + ' caracteres.');
      if (els.loginPassword) els.loginPassword.focus();
      return;
    }

    setBusy(els.btnLogin, true);
    callApi('login', { role: role, password: password }).then(function (data) {
      saveSession(data);
      if (els.loginPassword) els.loginPassword.value = '';
      toast('Bienvenido al portal de metas.');
      enterApp();
    }).catch(function (err) {
      showFormError(els.loginError, err && err.message ? err.message : 'No pudimos iniciar la sesión.');
    }).then(function () {
      setBusy(els.btnLogin, false);
    });
  }

  function handleSetup(event) {
    if (event) event.preventDefault();
    showFormError(els.setupError, '');

    var admin = byId('setup-admin').value;
    var admin2 = byId('setup-admin-2').value;
    var viewer = byId('setup-viewer').value;
    var viewer2 = byId('setup-viewer-2').value;

    if (admin.length < MIN_PASSWORD) {
      showFormError(els.setupError, 'La clave de administración debe tener al menos ' + MIN_PASSWORD + ' caracteres.');
      byId('setup-admin').focus();
      return;
    }
    if (admin !== admin2) {
      showFormError(els.setupError, 'Las claves de administración no coinciden.');
      byId('setup-admin-2').focus();
      return;
    }
    if (viewer.length < MIN_PASSWORD) {
      showFormError(els.setupError, 'La clave de lectura debe tener al menos ' + MIN_PASSWORD + ' caracteres.');
      byId('setup-viewer').focus();
      return;
    }
    if (viewer !== viewer2) {
      showFormError(els.setupError, 'Las claves de lectura no coinciden.');
      byId('setup-viewer-2').focus();
      return;
    }
    if (admin === viewer) {
      showFormError(els.setupError, 'Las dos claves deben ser distintas entre sí.');
      byId('setup-viewer').focus();
      return;
    }

    setBusy(els.btnSetup, true);
    callApi('setup', {
      activationToken: state.activationToken,
      adminPassword: admin,
      viewerPassword: viewer
    }).then(function (data) {
      clearSetupFields();
      state.activationToken = null;
      saveSession(data);
      toast('Portal activado. Las claves quedaron guardadas en el servidor.');
      enterApp();
    }).catch(function (err) {
      if (err && (err.status === 410 || err.status === 409 || err.status === 401)) {
        state.activationToken = null;
        showFormError(els.setupError, 'El enlace de activación ya no es válido. Pide un enlace nuevo al administrador.');
      } else {
        showFormError(els.setupError, err && err.message ? err.message : 'No pudimos activar el portal.');
      }
    }).then(function () {
      setBusy(els.btnSetup, false);
    });
  }

  function clearSetupFields() {
    ['setup-admin', 'setup-admin-2', 'setup-viewer', 'setup-viewer-2'].forEach(function (id) {
      var node = byId(id);
      if (node) node.value = '';
    });
  }

  function cancelSetup() {
    clearSetupFields();
    showFormError(els.setupError, '');
    state.activationToken = null;
    var stored = readStoredSession();
    if (stored && !isExpiredValue(stored.expiresAt)) {
      callApi('session', { token: stored.token }).then(function (data) {
        saveSession({ token: stored.token, role: data.role || stored.role, expiresAt: data.expiresAt || stored.expiresAt });
        enterApp();
      }).catch(function () {
        clearSessionState();
        showView('login');
      });
      return;
    }
    showView('login');
    if (els.loginPassword) els.loginPassword.focus();
  }

  /* ---------- Entrada a la aplicación ---------- */
  function enterApp() {
    showView('app');
    renderSessionChip();
    syncRoleUi();
    startExpiryWatch();
    applyCollapsed(state.collapsed);
    goHome();
  }

  function renderSessionChip() {
    if (!els.sessionChip) return;
    var isAdmin = state.role === 'admin';
    els.sessionChip.classList.toggle('is-admin', isAdmin);
    els.sessionRole.textContent = isAdmin ? 'Administrador' : 'Lector';
    els.sessionExp.textContent = formatTime(state.expiresAt);
    els.sessionChip.title = isAdmin ? 'Sesión de administrador' : 'Sesión de lectura';
  }

  function syncRoleUi() {
    var isAdmin = state.role === 'admin';
    if (els.adminPanel) els.adminPanel.hidden = !isAdmin;
    if (els.adminBlocked) els.adminBlocked.hidden = isAdmin;
  }

  var expiryTimer = null;

  function startExpiryWatch() {
    stopExpiryWatch();
    expiryTimer = setInterval(function () {
      if (!state.token) return;
      if (isExpired()) {
        handleSessionLoss('Tu sesión llegó a su límite de tiempo. Ingresa tu clave nuevamente.');
      }
    }, 30000);
  }

  function stopExpiryWatch() {
    if (expiryTimer) clearInterval(expiryTimer);
    expiryTimer = null;
  }

  /* ---------- Salida ---------- */
  function logout(options) {
    var opts = options || {};
    var token = state.token;
    teardownApp();
    showView('login');
    if (els.loginPassword) els.loginPassword.value = '';
    var adminRadio = els.formLogin.querySelector('input[name="role"][value="admin"]');
    var viewerRadio = els.formLogin.querySelector('input[name="role"][value="viewer"]');
    if (opts.nextRole === 'admin' && adminRadio) adminRadio.checked = true;
    if (opts.nextRole === 'viewer' && viewerRadio) viewerRadio.checked = true;

    if (token) {
      callApi('logout', { token: token }).catch(function () { /* la sesión local ya se cerró */ });
    }
    if (opts.message) toast(opts.message);
  }

  function handleSessionLoss(message) {
    clearSessionState();
    stopExpiryWatch();
    teardownApp();
    showView('login');
    toast(message || 'La sesión terminó. Ingresa tu clave nuevamente.', 'error');
  }

  function teardownApp() {
    clearTasks();
    stopExpiryWatch();
    clearSessionState();
    clearFrame();
    resetNavigation();
    resetHomeStats();
    if (els.contentTitle) els.contentTitle.textContent = 'Metas';
    if (els.crumbs) els.crumbs.innerHTML = '<span class="crumb">LUP</span><span class="crumb-sep">/</span><span class="crumb crumb--now">Inicio</span>';
    setFrameState('loading');
    if (els.adminPanel) els.adminPanel.hidden = true;
    if (els.adminBlocked) els.adminBlocked.hidden = true;
    ['rot-viewer-current', 'rot-viewer-new', 'rot-viewer-confirm', 'rot-admin-current', 'rot-admin-new', 'rot-admin-confirm', 'revoke-current'].forEach(function (id) {
      var node = byId(id);
      if (node) node.value = '';
    });
    document.querySelectorAll('#panel-admin .form-error').forEach(function (node) {
      showFormError(node, '');
    });
    closeModal(false);
  }

  /* ---------- Marco de contenido ---------- */
  function setFrameState(name, message) {
    if (!els.frameShell) return;
    els.frameShell.setAttribute('data-state', name);
    if (name === 'error' && message && els.frameErrorText) {
      els.frameErrorText.textContent = message;
    }
  }

  function setFrameHeight(value) {
    if (!els.frame) return;
    var height = Math.min(Math.max(Math.round(value), 320), MAX_FRAME_HEIGHT);
    els.frame.style.height = height + 'px';
  }

  function clearFrame() {
    if (!els.frame) return;
    if (els.frame.dataset) delete els.frame.dataset.live;
    els.frame.removeAttribute('srcdoc');
    els.frame.setAttribute('src', 'about:blank');
    els.frame.style.height = DEFAULT_FRAME_HEIGHT + 'px';
  }

  var frameFallbackTimer = null;

  function watchFrameFallback() {
    if (frameFallbackTimer) clearTimeout(frameFallbackTimer);
    frameFallbackTimer = setTimeout(function () {
      if (!els.frame || els.frameShell.getAttribute('data-state') !== 'ready') return;
      if (els.frame.dataset && els.frame.dataset.live === '1') return;
      /* Sin mensaje de altura: se deja un marco con scroll propio. */
      setFrameHeight(Math.max(DEFAULT_FRAME_HEIGHT, 640));
    }, 1600);
  }

  function loadPage(pageKey, options) {
    var meta = PAGES[pageKey];
    if (!meta || !state.token) return;

    var opts = options || {};
    state.page = pageKey;
    state.loadingPage = true;

    renderBreadcrumbs(meta);
    if (els.contentEyebrow) els.contentEyebrow.textContent = meta.eyebrow;
    if (els.contentTitle) els.contentTitle.textContent = meta.label;
    setActiveNav(pageKey);
    showPanel('content');
    setFrameState('loading');
    setFrameHeight(DEFAULT_FRAME_HEIGHT);
    setBusy(els.btnReload, true);

    callApi('page', { token: state.token, page: pageKey }, 30000).then(function (data) {
      if (state.page !== pageKey) return;
      if (els.contentTitle && data.title) els.contentTitle.textContent = cleanText(data.title);
      var html = typeof data.html === 'string' ? data.html : '';
      if (!html) throw new ApiError('Esta sección llegó sin contenido.', 0, 'empty');

      els.frame.removeAttribute('src');
      els.frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-forms');
      els.frame.srcdoc = html;
      if (els.frame.dataset) els.frame.dataset.live = '0';
      els.frame.style.height = DEFAULT_FRAME_HEIGHT + 'px';
      if (els.frameShell) els.frameShell.scrollTop = 0;
      watchFrameFallback();
    }).catch(function (err) {
      if (err && (err.status === 401)) {
        handleSessionLoss('Tu sesión terminó. Ingresa tu clave nuevamente.');
        return;
      }
      if (state.page !== pageKey) return;
      setFrameState('error', err && err.message ? err.message : 'No pudimos cargar esta sección.');
    }).then(function () {
      state.loadingPage = false;
      setBusy(els.btnReload, false);
      if (opts.focus !== false) focusStage();
    });
  }

  function focusStage() {
    if (!els.stage) return;
    if (!els.stage.hasAttribute('tabindex')) els.stage.setAttribute('tabindex', '-1');
    try { els.stage.focus({ preventScroll: true }); } catch (err) { els.stage.focus(); }
  }

  /* ---------- Navegación ---------- */
  function renderBreadcrumbs(meta) {
    if (!els.crumbs) return;
    els.crumbs.innerHTML = '';
    var parts = ['LUP'];
    if (meta.year) parts.push('Metas', meta.year);
    parts.push(meta.label);

    parts.forEach(function (part, index) {
      var span = document.createElement('span');
      span.className = 'crumb' + (index === parts.length - 1 ? ' crumb--now' : '');
      span.textContent = part;
      els.crumbs.appendChild(span);
      if (index < parts.length - 1) {
        var sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        els.crumbs.appendChild(sep);
      }
    });
  }

  function renderHomeCrumbs() {
    if (!els.crumbs) return;
    els.crumbs.innerHTML = '<span class="crumb">LUP</span><span class="crumb-sep">/</span><span class="crumb crumb--now">Inicio</span>';
  }

  function setActiveNav(pageKey) {
    document.querySelectorAll('.nav-link[data-page], .nav-item[data-page], .nav-inicio').forEach(function (node) {
      node.classList.remove('is-active');
      node.removeAttribute('aria-current');
    });
    if (pageKey) {
      var target = document.querySelector('.nav-link[data-page="' + pageKey + '"], .nav-item[data-page="' + pageKey + '"]');
      if (target) {
        target.classList.add('is-active');
        target.setAttribute('aria-current', 'page');
      }
      var meta = PAGES[pageKey];
      if (meta && meta.group) expandGroup(meta.group, true);
      expandGroup('metas', true);
    }
    if (els.navAdmin) els.navAdmin.classList.remove('is-active');
  }

  function resetNavigation() {
    document.querySelectorAll('.nav-link, .nav-item, .nav-inicio').forEach(function (node) {
      node.classList.remove('is-active');
      node.removeAttribute('aria-current');
    });
    if (els.navAdmin) els.navAdmin.classList.remove('is-active');
  }

  var tasksCleanup = null, tasksTab = 'lista';
  function clearTasks() {
    if(tasksCleanup){tasksCleanup();tasksCleanup=null;}
    if(els.tasksRoot)els.tasksRoot.textContent='';
    var m=byId('minutes-root');if(m)m.textContent='';
  }
  function renderTasksTab(tab) {
    if(!state.token)return;
    clearTasks();tasksTab=tab==='minutas'?'minutas':'lista';
    var minutes=tasksTab==='minutas',mr=byId('minutes-root');
    els.tasksRoot.hidden=minutes;if(mr)mr.hidden=!minutes;
    document.querySelectorAll('[data-tasks-tab]').forEach(function(node){
      var active=node.getAttribute('data-tasks-tab')===tasksTab;
      node.classList.toggle('is-active',active);node.setAttribute('aria-selected',String(active));node.tabIndex=active?0:-1;
    });
    var root=minutes?mr:els.tasksRoot,mod=minutes?window.LupMinutes:window.LupTasks;
    if(!root||!mod){if(root)root.textContent='No se pudo cargar '+(minutes?'Minutas':'Tareas')+'. Recarga el portal.';return;}
    var instance=mod.mount({container:root,role:state.role,api:function(action,payload){
      return callApi(action,{token:state.token,payload:payload||{}},30000,minutes?MINUTES_ENDPOINT:API_ENDPOINT).catch(function(e){if(e.status===401)handleSessionLoss('Tu sesión terminó.');throw e;});
    }});
    tasksCleanup=typeof instance==='function'?instance:(instance&&typeof instance.destroy==='function'?function(){instance.destroy();}:null);
    renderBreadcrumbs({label:minutes?'Tareas / Minutas':'Tareas'});
  }
  function openTasks() {
    if(!state.token)return;state.page='tareas';showPanel('tasks');setActiveNav('tareas');closeDrawer(false);
    document.querySelectorAll('[data-tasks-tab]').forEach(function(node){
      node.onclick=function(){renderTasksTab(node.getAttribute('data-tasks-tab'));};
      node.onkeydown=function(e){if(['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key)===-1)return;e.preventDefault();var tab=e.key==='Home'?'lista':e.key==='End'?'minutas':tasksTab==='lista'?'minutas':'lista';renderTasksTab(tab);byId(tab==='minutas'?'tab-tareas-minutas':'tab-tareas-lista').focus();};
    });
    renderTasksTab(tasksTab);focusStage();
  }
  function showPanel(name) {
    if(name!=='tasks')clearTasks();if(els.panelTasks)els.panelTasks.hidden=name!=='tasks';
    els.panelInicio.hidden = name !== 'inicio';
    els.panelContent.hidden = name !== 'content';
    els.panelAdmin.hidden = name !== 'admin';
    if (name === 'admin') {
      els.adminPanel.hidden = state.role !== 'admin';
      els.adminBlocked.hidden = state.role === 'admin';
    }
  }

  /* ---------- Inicio: pulso del período ----------
     Los datos llegan del seguimiento autenticado (acción trackingGet).
     Aquí no se guarda ningún valor de negocio: solo se pintan cifras
     que el servidor entrega para la sesión activa. Si un cálculo aún no
     está cerrado, se muestra "Pendiente" en lugar de un cero. */
  var PERIOD_START_LABEL = '01/10/2026';
  var PERIOD_END_LABEL = '31/03/2027';
  var homeRequestSeq = 0;

  function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function formatDecimal(value, digits) {
    var options = { minimumFractionDigits: 0, maximumFractionDigits: typeof digits === 'number' ? digits : 1 };
    try {
      return new Intl.NumberFormat('es-CL', options).format(value);
    } catch (err) {
      return String(Math.round(value * 10) / 10);
    }
  }

  function formatPercent(value) {
    return formatDecimal(value, 1) + '%';
  }

  function formatAmount(value) {
    return '$' + formatDecimal(value, 0);
  }

  function formatDay(value) {
    if (typeof value !== 'string') return '';
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return match[3] + '/' + match[2] + '/' + match[1];
    return '';
  }

  function formatDays(value) {
    var days = Math.round(value);
    return days === 1 ? '1 día' : formatDecimal(days, 0) + ' días';
  }

  function setStat(node, text, pending) {
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('is-pending', Boolean(pending));
  }

  function setStatNote(node, text) {
    if (node) node.textContent = text || '';
  }

  function homeState(name) {
    if (els.homeStats) els.homeStats.setAttribute('data-state', name);
  }

  function homeNote(text) {
    if (els.homeStatsNote) els.homeStatsNote.textContent = text || '';
  }

  function resetHomeStats() {
    homeRequestSeq += 1;
    homeState('loading');
    setStat(els.statDays, '\u2014', true);
    setStatNote(els.statDaysNote, 'Cierre ' + PERIOD_END_LABEL);
    setStat(els.statTime, '\u2014', true);
    setStatNote(els.statTimeNote, 'Base ' + PERIOD_START_LABEL);
    setStat(els.statAchieved, '\u2014', true);
    setStatNote(els.statAchievedNote, 'Se calcula con el seguimiento validado.');
    setStat(els.statBonus, '\u2014', true);
    setStatNote(els.statBonusNote, 'Monto vigente del período.');
    if (els.homePeriod) els.homePeriod.textContent = PERIOD_START_LABEL + ' \u2013 ' + PERIOD_END_LABEL;
    homeNote('Cargando el seguimiento del período\u2026');
    if (els.homeBackupBlock) els.homeBackupBlock.hidden = true;
    if (els.homeBackup) els.homeBackup.removeAttribute('href');
    resetBonusPanel();
  }

  function safeBackupUrl(value) {
    if (typeof value !== 'string' || !value) return '';
    var url;
    try { url = new URL(value); } catch (err) { return ''; }
    /* Solo enlaces https: nunca javascript:, data: ni rutas locales. */
    if (url.protocol !== 'https:') return '';
    return url.href;
  }

  function renderHomeBackup(url) {
    var safe = safeBackupUrl(url);
    if (!safe) {
      if (els.homeBackupBlock) els.homeBackupBlock.hidden = true;
      if (els.homeBackup) els.homeBackup.removeAttribute('href');
      return;
    }
    if (els.homeBackup) els.homeBackup.setAttribute('href', safe);
    if (els.homeBackupBlock) els.homeBackupBlock.hidden = false;
  }

  /* ---------- Inicio: bono mensual proyectado ----------
     El cálculo llega resuelto desde el servidor (trackingGet > data.monthlyBonus).
     El cliente no calcula tramos ni proyecta ventas: solo pinta lo recibido.
     Todo valor ausente se muestra como "Pendiente"; nunca se asume cero. */
  var BONUS_PENDING = 'Pendiente';
  var BONUS_DISCLAIMER = 'Cálculo estimado para seguimiento. La determinación y el pago definitivos se realizarán según el contrato y su Anexo A.';
  var BONUS_DELTA_NOTE = 'Margen diario disponible sobre el ritmo actual; no es una recomendación de vender menos.';

  function textOrPending(value) {
    if (!isNumber(value)) return BONUS_PENDING;
    return null;
  }

  function amountOrPending(value) {
    return isNumber(value) ? formatAmount(value) : BONUS_PENDING;
  }

  function signedAmount(value) {
    var rounded = Math.round(value);
    return (rounded > 0 ? '+' : rounded < 0 ? '\u2212' : '') + formatAmount(Math.abs(rounded));
  }

  function bonusMonthLabel(month) {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) return '';
    var names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var index = parseInt(month.slice(5, 7), 10) - 1;
    if (!(index >= 0 && index < 12)) return '';
    return names[index] + ' ' + month.slice(0, 4);
  }

  function setBonusFigure(valueNode, noteNode, text, note, pending) {
    setStat(valueNode, text, Boolean(pending));
    setStatNote(noteNode, note);
  }

  function setBonusState(name) {
    if (els.bonusMonth) els.bonusMonth.setAttribute('data-state', name);
  }

  function bonusStatus(text) {
    if (els.bonusMonthStatus) els.bonusMonthStatus.textContent = text || '';
  }

  function resetBonusPanel() {
    setBonusState('loading');
    if (els.bonusMonthTag) els.bonusMonthTag.textContent = 'Proyectado mes';
    setBonusFigure(els.bonusNetSales, els.bonusNetSalesNote, '\u2014', 'Facturadas en el mes calendario.', true);
    setBonusFigure(els.bonusProjectedSales, els.bonusProjectedSalesNote, '\u2014', 'Estimación al cierre del mes.', true);
    setBonusFigure(els.bonusPace, els.bonusPaceNote, '\u2014', 'Venta neta por día hábil.', true);
    setBonusFigure(els.bonusWorkdays, els.bonusWorkdaysNote, '\u2014', 'Transcurridos y restantes.', true);
    setBonusFigure(els.bonusCurrent, els.bonusCurrentNote, '\u2014', 'Tramo de las ventas netas registradas.', true);
    setBonusFigure(els.bonusProjected, els.bonusProjectedNote, '\u2014', 'Según el tramo estimado al cierre.', true);
    if (els.bonusRows) els.bonusRows.innerHTML = '';
    if (els.bonusTableWrap) els.bonusTableWrap.hidden = true;
    if (els.bonusLegend) els.bonusLegend.hidden = true;
    if (els.bonusCaption) els.bonusCaption.textContent = 'Tramos de venta neta mensual y bono bruto según el Anexo A.';
    bonusStatus('Cargando el bono mensual del período\u2026');
  }

  function tierRangeText(tier) {
    var min = isNumber(tier.min) ? tier.min : null;
    var max = isNumber(tier.max) ? tier.max : null;
    if (min === null && max === null) return BONUS_PENDING;
    if (min === null) return 'Hasta ' + formatAmount(max);
    if (max === null) return formatAmount(min) + ' o más';
    return formatAmount(min) + ' \u2013 ' + formatAmount(max);
  }

  function tierBonusText(tier) {
    if (!isNumber(tier.bonus)) return BONUS_PENDING;
    return tier.bonus === 0 ? '$0' : formatAmount(tier.bonus);
  }

  function tierPaceText(value) {
    if (!isNumber(value)) return BONUS_PENDING;
    return formatAmount(value) + '/día';
  }

  /* Positiva: todavía hay que aumentar el ritmo. Negativa: margen diario que
     el tramo admite. Nunca se redacta como sugerencia de vender menos. */
  function tierDeltaText(value) {
    if (!isNumber(value)) return BONUS_PENDING;
    var rounded = Math.round(value);
    if (rounded > 0) return 'Aumentar ' + signedAmount(rounded) + '/día';
    if (rounded < 0) return 'Puede caer ' + signedAmount(rounded) + '/día';
    return 'Mantener el ritmo';
  }

  function tierFlags(tier) {
    var status = typeof tier.status === 'string' ? tier.status.toLowerCase() : '';
    var projected = tier.projected === true || status === 'projected' || status === 'proyectado' || status === 'proyeccion';
    var reached = tier.current === true || status === 'current' || status === 'reached' || status === 'alcanzado' || status === 'acumulado';
    return { projected: projected, reached: reached };
  }

  function bonusCell(text, className) {
    var cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function renderBonusRows(tiers) {
    var body = els.bonusRows;
    if (!body) return false;
    body.innerHTML = '';
    if (!tiers || !tiers.length) return false;

    tiers.forEach(function (tier) {
      if (!tier || typeof tier !== 'object') return;
      var flags = tierFlags(tier);
      var row = document.createElement('tr');
      if (flags.reached) row.className = 'is-reached';
      if (flags.projected) row.className = (row.className ? row.className + ' ' : '') + 'is-projected';

      var rangeCell = document.createElement('td');
      rangeCell.className = 'bonus-range';
      var range = document.createElement('span');
      range.textContent = tierRangeText(tier);
      rangeCell.appendChild(range);
      if (flags.reached) {
        var tag = document.createElement('span');
        tag.className = 'bonus-tag';
        tag.textContent = 'En lo que va';
        rangeCell.appendChild(tag);
      }
      row.appendChild(rangeCell);

      row.appendChild(bonusCell(tierBonusText(tier), 'bonus-amount'));

      var paceCell = bonusCell(tierPaceText(tier.neededDaily), 'bonus-pace');
      row.appendChild(paceCell);

      var delta = tier.deltaDaily;
      var deltaCell = bonusCell(tierDeltaText(delta), 'bonus-delta');
      if (isNumber(delta)) {
        var rounded = Math.round(delta);
        deltaCell.className += rounded > 0 ? ' is-up' : rounded < 0 ? ' is-down' : ' is-flat';
        deltaCell.title = BONUS_DELTA_NOTE;
      }
      row.appendChild(deltaCell);

      body.appendChild(row);
    });

    return body.children.length > 0;
  }

  function renderMonthlyBonus(bonus) {
    renderWorkdaysEditor(bonus);
    var b = bonus && typeof bonus === 'object' && !Array.isArray(bonus) ? bonus : null;
    resetBonusPanel();

    if (!b) {
      setBonusState('empty');
      setBonusFigure(els.bonusNetSales, els.bonusNetSalesNote, BONUS_PENDING, 'Facturadas en el mes calendario.', true);
      setBonusFigure(els.bonusProjectedSales, els.bonusProjectedSalesNote, BONUS_PENDING, 'Estimación al cierre del mes.', true);
      setBonusFigure(els.bonusPace, els.bonusPaceNote, BONUS_PENDING, 'Venta neta por día hábil.', true);
      setBonusFigure(els.bonusWorkdays, els.bonusWorkdaysNote, BONUS_PENDING, 'Transcurridos y restantes.', true);
      setBonusFigure(els.bonusCurrent, els.bonusCurrentNote, BONUS_PENDING, 'Tramo de las ventas netas registradas.', true);
      setBonusFigure(els.bonusProjected, els.bonusProjectedNote, BONUS_PENDING, 'Según el tramo estimado al cierre.', true);
      bonusStatus(BONUS_DISCLAIMER);
      return;
    }

    var monthLabel = bonusMonthLabel(b.month);
    if (els.bonusMonthTag) els.bonusMonthTag.textContent = monthLabel ? 'Proyectado mes \u00b7 ' + monthLabel : 'Proyectado mes';

    var elapsed = isNumber(b.elapsedWorkdays) ? b.elapsedWorkdays : null;
    var remaining = isNumber(b.remainingWorkdays) ? b.remainingWorkdays : null;
    var workdaysText = BONUS_PENDING;
    var workdaysNote = 'Días hábiles transcurridos y restantes del mes.';
    if (elapsed !== null || remaining !== null) {
      workdaysText = (elapsed !== null ? formatDecimal(elapsed, 0) : BONUS_PENDING) + ' / ' +
        (remaining !== null ? formatDecimal(remaining, 0) : BONUS_PENDING);
      workdaysNote = 'Transcurridos / restantes.';
    }

    setBonusFigure(els.bonusNetSales, els.bonusNetSalesNote, amountOrPending(b.netSales),
      monthLabel ? 'Netas facturadas en ' + monthLabel + '.' : 'Netas facturadas en el mes calendario.', !isNumber(b.netSales));
    setBonusFigure(els.bonusProjectedSales, els.bonusProjectedSalesNote,
      amountOrPending(b.projectedSales), 'Estimación al cierre del mes.', !isNumber(b.projectedSales));
    setBonusFigure(els.bonusPace, els.bonusPaceNote,
      isNumber(b.pace) ? formatAmount(b.pace) + '/día' : BONUS_PENDING, 'Venta neta por día hábil.', !isNumber(b.pace));
    setBonusFigure(els.bonusWorkdays, els.bonusWorkdaysNote, workdaysText, workdaysNote, elapsed === null && remaining === null);
    setBonusFigure(els.bonusCurrent, els.bonusCurrentNote,
      amountOrPending(b.currentBonus), 'Tramo de las ventas netas registradas.', !isNumber(b.currentBonus));
    setBonusFigure(els.bonusProjected, els.bonusProjectedNote,
      amountOrPending(b.projectedBonus), 'Según el tramo estimado al cierre.', !isNumber(b.projectedBonus));

    var hasRows = renderBonusRows(Array.isArray(b.tiers) ? b.tiers : []);
    if (els.bonusTableWrap) els.bonusTableWrap.hidden = !hasRows;
    if (els.bonusLegend) els.bonusLegend.hidden = !hasRows;
    if (hasRows && monthLabel && els.bonusCaption) {
      els.bonusCaption.textContent = 'Tramos de venta neta mensual y bono bruto según el Anexo A \u00b7 ' + monthLabel + '.';
    }

    setBonusState(hasRows || isNumber(b.netSales) ? 'ok' : 'empty');
    bonusStatus(cleanText(b.message) || 'Datos operacionales estimados del mes en curso, sujetos a posibles cambios contables.');
  }

  function renderHome(home, backupUrl, monthlyBonus) {
    var data = home && typeof home === 'object' ? home : null;
    homeState('ok');

    var from = formatDay(data && data.startDate) || PERIOD_START_LABEL;
    var to = formatDay(data && data.endDate) || PERIOD_END_LABEL;
    if (els.homePeriod) els.homePeriod.textContent = from + ' \u2013 ' + to;

    /* Días restantes al cierre del período. */
    if (data && isNumber(data.daysRemaining)) {
      setStat(els.statDays, formatDays(data.daysRemaining), false);
      setStatNote(els.statDaysNote, 'Cierre ' + to);
    } else {
      setStat(els.statDays, 'Pendiente', true);
      setStatNote(els.statDaysNote, 'Cierre ' + to);
    }

    /* Tiempo transcurrido, con la fecha base explícita. */
    if (data && isNumber(data.elapsedPercent)) {
      setStat(els.statTime, formatPercent(data.elapsedPercent), false);
      setStatNote(els.statTimeNote, 'Base ' + from + ' al ' + to);
    } else {
      setStat(els.statTime, 'Pendiente', true);
      setStatNote(els.statTimeNote, 'Base ' + from + ' al ' + to);
    }

    /* Avance logrado. Sin cálculo cerrado no se asume cero. */
    var validated = data && isNumber(data.validatedPercent) ? data.validatedPercent : null;
    var pendingWeight = data && isNumber(data.pendingWeight) ? data.pendingWeight : null;
    if (data && isNumber(data.achievedPercent)) {
      setStat(els.statAchieved, formatPercent(data.achievedPercent), false);
      setStatNote(els.statAchievedNote, validated !== null
        ? 'Logro hasta hoy desde ' + from + (pendingWeight>0?' · '+formatPercent(pendingWeight)+' del peso pendiente de datos.':'.')
        : 'Sobre la meta del período.');
    } else {
      setStat(els.statAchieved, 'Pendiente', true);
      var parts = [];
      if (validated !== null) parts.push('Avance validado ' + formatPercent(validated));
      if (pendingWeight !== null) parts.push(formatPercent(pendingWeight) + ' del peso sin validar');
      setStatNote(els.statAchievedNote, parts.length
        ? parts.join(' \u00b7 ') + '.'
        : 'El avance se cierra cuando el seguimiento valida los indicadores.');
    }

    /* Bono anual estimado. Un cero es un valor válido si el servidor lo
       entrega validado; sin cifra se muestra "Pendiente", nunca cero.
       El tope anual solo se rotula si el servidor lo entrega: la interfaz
       pública no lleva remuneraciones escritas. */
    var annualTarget = data && isNumber(data.annualTarget) ? data.annualTarget : null;
    var annualBase = annualTarget !== null
      ? 'Referencia anual al 100% ' + formatAmount(annualTarget) + '.'
      : 'Monto estimado del período.';
    if (data && isNumber(data.bonusAmount)) {
      setStat(els.statBonus, formatAmount(data.bonusAmount), false);
      setStatNote(els.statBonusNote, cleanText(data.bonusMessage) || annualBase);
    } else {
      setStat(els.statBonus, BONUS_PENDING, true);
      setStatNote(els.statBonusNote, cleanText(data && data.bonusMessage)
        || 'Sin cifra validada' + (annualTarget !== null ? ' · tope ' + formatAmount(annualTarget) : '') + '.');
    }

    /* Bono mensual proyectado: bloque propio de la respuesta autenticada. */
    renderMonthlyBonus(monthlyBonus || (data && data.monthlyBonus));

    homeNote('Datos del seguimiento privado. Se actualizan desde el servidor autenticado.');

    renderHomeBackup(backupUrl || (data && data.backupUrl));
  }

  function loadHome() {
    if (!state.token) return;
    var seq = ++homeRequestSeq;
    var token = state.token;
    homeState('loading');
    homeNote('Cargando el seguimiento del período\u2026');

    callApi('trackingGet', { token: token }, 30000).then(function (data) {
      if (seq !== homeRequestSeq || state.token !== token) return;
      /* El backend entrega home={...} y monthlyBonus; si llegara aplanado, se tolera igual. */
      var home = data.home || data;
      renderHome(home, data.backupUrl, data.monthlyBonus || (home && home.monthlyBonus));
    }).catch(function (err) {
      if (seq !== homeRequestSeq || state.token !== token) return;
      if (err && err.status === 401) {
        handleSessionLoss('Tu sesión terminó. Ingresa tu clave nuevamente.');
        return;
      }
      homeState('error');
      setStat(els.statDays, 'No disponible', true);
      setStat(els.statTime, 'No disponible', true);
      setStat(els.statAchieved, 'No disponible', true);
      setStat(els.statBonus, 'No disponible', true);
      homeNote(err && err.message ? err.message : 'No pudimos cargar el seguimiento del período.');
      setBonusState('error');
      setBonusFigure(els.bonusNetSales, els.bonusNetSalesNote, 'No disponible', 'Facturadas en el mes calendario.', true);
      setBonusFigure(els.bonusProjectedSales, els.bonusProjectedSalesNote, 'No disponible', 'Estimación al cierre del mes.', true);
      setBonusFigure(els.bonusPace, els.bonusPaceNote, 'No disponible', 'Venta neta por día hábil.', true);
      setBonusFigure(els.bonusWorkdays, els.bonusWorkdaysNote, 'No disponible', 'Transcurridos y restantes.', true);
      setBonusFigure(els.bonusCurrent, els.bonusCurrentNote, 'No disponible', 'Tramo de las ventas netas registradas.', true);
      setBonusFigure(els.bonusProjected, els.bonusProjectedNote, 'No disponible', 'Según el tramo estimado al cierre.', true);
      bonusStatus('Bono mensual: no disponible con la sesión actual.');
      renderHomeBackup('');
    });
  }

  function goHome() {
    state.page = null;
    clearFrame();
    setFrameState('loading');
    resetNavigation();
    renderHomeCrumbs();
    showPanel('inicio');
    focusStage();
    if (!state.token) return;
    resetHomeStats();
    loadHome();
  }

  function openAdmin() {
    if (!state.token) return;
    state.page = null;
    resetNavigation();
    if (els.navAdmin) els.navAdmin.classList.add('is-active');
    if (els.crumbs) {
      els.crumbs.innerHTML = '<span class="crumb">LUP</span><span class="crumb-sep">/</span><span class="crumb crumb--now">Administración</span>';
    }
    showPanel('admin');
    closeDrawer(true);
    focusStage();
    if (state.role === 'admin') loadSettings();
  }

  function expandGroup(name, expanded) {
    var toggle = document.querySelector('.nav-toggle[data-group="' + name + '"]');
    var target = toggle ? byId(toggle.getAttribute('aria-controls')) : null;
    if (!toggle || !target) return;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    target.hidden = !expanded;
  }

  function toggleGroup(toggle) {
    var target = byId(toggle.getAttribute('aria-controls'));
    if (!target) return;
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    target.hidden = isOpen;
  }

  /* ---------- Barra lateral ---------- */
  function applyCollapsed(collapsed) {
    state.collapsed = collapsed;
    if (els.viewApp) els.viewApp.classList.toggle('is-collapsed', collapsed && window.innerWidth > 860);
    if (els.btnCollapse) {
      els.btnCollapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      els.btnCollapse.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
    }
  }

  function openDrawer() {
    if (!els.viewApp) return;
    state.drawerOpen = true;
    els.viewApp.classList.add('is-drawer-open');
    if (els.drawerScrim) els.drawerScrim.hidden = false;
    if (els.btnDrawer) els.btnDrawer.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    if (els.btnDrawerClose) els.btnDrawerClose.focus();
  }

  function closeDrawer(restoreFocus) {
    if (!els.viewApp) return;
    state.drawerOpen = false;
    els.viewApp.classList.remove('is-drawer-open');
    if (els.drawerScrim) els.drawerScrim.hidden = true;
    if (els.btnDrawer) els.btnDrawer.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    if (restoreFocus &&
      els.btnDrawer &&
      window.innerWidth <= 860 &&
      !els.viewApp.hidden) {
      els.btnDrawer.focus();
    }
  }

  var stickyTick=false;
  function syncTrackingSticky(){stickyTick=false;if(!els.frame||state.page!=='seguimiento2026'||!els.frame.contentWindow)return;var top=document.querySelector('.topbar'),r=els.frame.getBoundingClientRect(),edge=top?Math.max(0,top.getBoundingClientRect().bottom):0;els.frame.contentWindow.postMessage({type:'lup:sticky-offset',offset:Math.max(0,edge-r.top)},'*');}
  function requestTrackingSticky(){if(!stickyTick){stickyTick=true;requestAnimationFrame(syncTrackingSticky);}}
  window.addEventListener('scroll',requestTrackingSticky,{passive:true,capture:true});window.addEventListener('resize',requestTrackingSticky,{passive:true});
  /* ---------- Altura del iframe por postMessage ---------- */
  function onMessage(event) {
    if (!els.frame) return;
    if (event.source !== els.frame.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'lup:tracking:request') {
      var allowed = ['trackingGet','milestoneAdd','milestoneToggle','milestoneEdit','milestoneRemove','bonusWorkdaysSet'];
      if (!state.token || state.page !== 'seguimiento2026' || allowed.indexOf(data.action) < 0 || typeof data.requestId !== 'string' || data.requestId.length > 100) return;
      var target = event.source, session = state.token;
      callApi(data.action,{token:session,payload:data.payload || {},fast:data.fast===true}).then(function(result){
        if (state.token === session && target === els.frame.contentWindow) target.postMessage({type:'lup:tracking:response',requestId:data.requestId,ok:true,data:result.data || result},'*');
      }).catch(function(error){
        if (state.token === session && target === els.frame.contentWindow) target.postMessage({type:'lup:tracking:response',requestId:data.requestId,ok:false,error:error.message || 'No se pudo actualizar el seguimiento.'},'*');
      });
      return;
    }
    if (data.type === 'lup:download') {
      if (state.token && (data.file === 'carta' || data.file === 'kpiPDF')) {
        var button = document.querySelector('[data-download="' + data.file + '"]');
        if (button) handleDownload(button);
      }
      return;
    }
    if (data.type !== 'lup:resize') return;
    var height = Number(data.height);
    if (!isFinite(height) || height <= 0) return;
    if (els.frameShell.getAttribute('data-state') !== 'ready') return;
    if (els.frame.dataset) els.frame.dataset.live = '1';
    setFrameHeight(height);requestTrackingSticky();
  }

  /* ---------- Descargas ---------- */
  function base64ToBlob(base64, mime) {
    var clean = String(base64 || '').replace(/\s/g, '');
    var binary = atob(clean);
    var length = binary.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  }

  function safeFilename(name, fallback) {
    var value = typeof name === 'string' ? name : '';
    value = value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    return value || fallback;
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function handleDownload(button) {
    if (!state.token) return;
    var file = button.getAttribute('data-download');
    if (file !== 'carta' && file !== 'kpiPDF') return;

    setBusy(button, true);
    callApi('download', { token: state.token, file: file }, 45000).then(function (data) {
      if (!data.base64) throw new ApiError('El archivo llegó vacío. Inténtalo otra vez.');
      var mime = cleanText(data.mime) || 'application/pdf';
      var fallback = file === 'carta' ? 'carta.pdf' : 'kpi.pdf';
      var blob = base64ToBlob(data.base64, mime);
      triggerDownload(blob, safeFilename(data.filename, fallback));
      toast('Descarga lista.');
    }).catch(function (err) {
      if (err && err.status === 401) {
        handleSessionLoss('Tu sesión terminó. Ingresa tu clave nuevamente.');
        return;
      }
      toast(err && err.message ? err.message : 'No pudimos preparar la descarga.', 'error');
    }).then(function () {
      setBusy(button, false);
    });
  }

  /* ---------- Administración ---------- */
  function loadSettings() {
    if (!state.token || state.role !== 'admin') return;
    setBusy(els.btnSettingsReload, true);

    callApi('settings', { token: state.token }).then(function (data) {
      if (els.adminEmail) els.adminEmail.textContent = cleanText(data.adminEmail) || 'Sin información';
      if (els.adminViewer) {
        els.adminViewer.textContent = data.viewerEnabled === false ? 'Desactivado' : 'Habilitado';
      }
      if (els.adminHours) {
        var hours = Number(data.sessionHours);
        els.adminHours.textContent = isFinite(hours) && hours > 0
          ? hours + (hours === 1 ? ' hora' : ' horas')
          : 'Sin información';
      }
    }).catch(function (err) {
      if (err && err.status === 401) {
        handleSessionLoss('Tu sesión terminó. Ingresa tu clave nuevamente.');
        return;
      }
      if (els.adminEmail) els.adminEmail.textContent = 'No disponible';
      if (els.adminViewer) els.adminViewer.textContent = 'No disponible';
      if (els.adminHours) els.adminHours.textContent = 'No disponible';
      toast(err && err.message ? err.message : 'No pudimos leer la configuración.', 'error');
    }).then(function () {
      setBusy(els.btnSettingsReload, false);
    });
  }

  function handleRotate(form) {
    var kind = form.getAttribute('data-rotate');
    if (kind !== 'admin' && kind !== 'viewer') return;
    var errorNode = form.querySelector('.form-error');
    showFormError(errorNode, '');

    var current = form.querySelector('input[name="currentPassword"]');
    var next = form.querySelector('input[name="newPassword"]');
    var confirm = form.querySelector('input[name="newPasswordConfirm"]');
    var submit = form.querySelector('button[type="submit"]');

    if (!current.value) {
      showFormError(errorNode, 'Ingresa tu clave de administración actual.');
      current.focus();
      return;
    }
    if (next.value.length < MIN_PASSWORD) {
      showFormError(errorNode, 'La nueva clave debe tener al menos ' + MIN_PASSWORD + ' caracteres.');
      next.focus();
      return;
    }
    if (next.value !== confirm.value) {
      showFormError(errorNode, 'La nueva clave y su confirmación no coinciden.');
      confirm.focus();
      return;
    }

    setBusy(submit, true);
    callApi('rotatePassword', {
      token: state.token,
      kind: kind,
      currentPassword: current.value,
      newPassword: next.value
    }).then(function (data) {
      current.value = '';
      next.value = '';
      confirm.value = '';
      if (data.signedOut) {
        clearSessionState();
        stopExpiryWatch();
        teardownApp();
        showView('login');
        toast(kind === 'admin'
          ? 'Clave de administración actualizada. Todas las sesiones se cerraron.'
          : 'Clave de lectura actualizada. Las sesiones de lectura se cerraron.');
      } else {
        toast(kind === 'admin' ? 'Clave de administración actualizada.' : 'Clave de lectura actualizada.');
      }
    }).catch(function (err) {
      if (err && err.status === 401) {
        showFormError(errorNode, 'La clave actual no es correcta.');
        current.focus();
        return;
      }
      showFormError(errorNode, err && err.message ? err.message : 'No pudimos cambiar la clave.');
    }).then(function () {
      setBusy(submit, false);
    });
  }

  function handleRevoke(form) {
    var errorNode = form.querySelector('.form-error');
    var current = form.querySelector('input[name="currentPassword"]');
    var submit = form.querySelector('button[type="submit"]');
    showFormError(errorNode, '');

    if (!current.value) {
      showFormError(errorNode, 'Ingresa tu clave de administración actual.');
      current.focus();
      return;
    }

    openModal(
      'Cerrar todas las sesiones',
      'Se cerrarán todas las sesiones abiertas, incluida esta. Para volver a entrar tendrás que usar tu clave de administración.',
      'Cerrar todas'
    ).then(function (confirmed) {
      if (!confirmed) return;
      setBusy(submit, true);
      callApi('revokeSessions', {
        token: state.token,
        currentPassword: current.value
      }).then(function () {
        current.value = '';
        clearSessionState();
        stopExpiryWatch();
        teardownApp();
        showView('login');
        toast('Cerramos todas las sesiones. Ingresa nuevamente con tu clave.');
      }).catch(function (err) {
        if (err && err.status === 401) {
          showFormError(errorNode, 'La clave actual no es correcta.');
          current.focus();
          return;
        }
        showFormError(errorNode, err && err.message ? err.message : 'No pudimos cerrar las sesiones.');
      }).then(function () {
        setBusy(submit, false);
      });
    });
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    if (els.formLogin) els.formLogin.addEventListener('submit', handleLogin);
    if (els.formSetup) els.formSetup.addEventListener('submit', handleSetup);
    if (els.btnSetupCancel) els.btnSetupCancel.addEventListener('click', cancelSetup);

    document.querySelectorAll('.reveal').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = byId(button.getAttribute('data-reveal'));
        if (!target) return;
        var show = target.type === 'password';
        target.type = show ? 'text' : 'password';
        button.setAttribute('aria-pressed', show ? 'true' : 'false');
        button.setAttribute('aria-label', show ? 'Ocultar clave' : 'Mostrar clave');
        var use = button.querySelector('use');
        if (use) use.setAttribute('href', show ? '#i-eye-off' : '#i-eye');
      });
    });

    document.querySelectorAll('.nav-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () { toggleGroup(toggle); });
    });

    document.addEventListener('click', function (event) {
      var pageButton = event.target.closest('[data-page]');
      if (pageButton) {
        event.preventDefault();
        var pageKey = pageButton.getAttribute('data-page');
        if (!state.token) return;
        closeDrawer(false);
        if(pageKey==='tareas')openTasks();else loadPage(pageKey);
        return;
      }

      var downloadButton = event.target.closest('[data-download]');
      if (downloadButton) {
        event.preventDefault();
        handleDownload(downloadButton);
        return;
      }

      if (event.target.closest('[data-modal-cancel]')) {
        closeModal(false);
        return;
      }
    });

    if (els.navInicio) els.navInicio.addEventListener('click', function () { closeDrawer(false); goHome(); });
    if (els.linkHome) {
      els.linkHome.addEventListener('click', function (event) {
        event.preventDefault();
        if (!state.token) return;
        closeDrawer(false);
        goHome();
      });
    }
    if (els.navAdmin) els.navAdmin.addEventListener('click', function () { openAdmin(); });

    if (els.btnDrawer) els.btnDrawer.addEventListener('click', openDrawer);
    if (els.btnDrawerClose) els.btnDrawerClose.addEventListener('click', function () { closeDrawer(true); });
    if (els.drawerScrim) els.drawerScrim.addEventListener('click', function () { closeDrawer(true); });
    if (els.btnCollapse) {
      els.btnCollapse.addEventListener('click', function () {
        applyCollapsed(!state.collapsed);
      });
    }

    if (els.btnLogout) {
      els.btnLogout.addEventListener('click', function () {
        openModal(
          'Cerrar sesión',
          'Se cerrará la sesión en esta pestaña y el portal te pedirá la clave la próxima vez.',
          'Cerrar sesión'
        ).then(function (confirmed) {
          if (!confirmed) return;
          logout({ message: 'Sesión cerrada.' });
        });
      });
    }

    if (els.btnReload) {
      els.btnReload.addEventListener('click', function () {
        if (state.page) loadPage(state.page, { focus: false });
      });
    }
    if (els.btnRetry) {
      els.btnRetry.addEventListener('click', function () {
        if (state.page) loadPage(state.page, { focus: false });
      });
    }
    if (els.btnSettingsReload) els.btnSettingsReload.addEventListener('click', loadSettings);
    if (els.btnReloginAdmin) {
      els.btnReloginAdmin.addEventListener('click', function () {
        logout({
          nextRole: 'admin',
          message: 'Ingresa con tu clave de administración para cambiar claves o cerrar sesiones.'
        });
      });
    }

    document.querySelectorAll('#panel-admin form[data-rotate]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        handleRotate(form);
      });
    });

    if (els.formRevoke) {
      els.formRevoke.addEventListener('submit', function (event) {
        event.preventDefault();
        handleRevoke(els.formRevoke);
      });
    }

    if (els.frame) {
      els.frame.addEventListener('load', function () {
        if (!els.frame.getAttribute('srcdoc')) return;
        setFrameState('ready');
        watchFrameFallback();requestTrackingSticky();
      });
    }

    if (els.modalConfirm) {
      els.modalConfirm.addEventListener('click', function () { closeModal(true); });
    }

    window.addEventListener('message', onMessage);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!els.modal.hidden) {
          closeModal(false);
          return;
        }
        if (state.drawerOpen) closeDrawer(true);
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && state.drawerOpen) closeDrawer(false);
      applyCollapsed(state.collapsed);
    });

    window.addEventListener('pagehide', function () {
      /* La pestaña se cierra: no queda contenido privado en el DOM. */
      clearFrame();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
setInterval(function(){if(state.token && state.page === null && document.visibilityState !== 'hidden') loadHome();},300000);
function initHomeExtras(){document.querySelectorAll('[data-fold]').forEach(function(b){b.addEventListener('click',function(){var p=document.getElementById(b.dataset.fold);p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));b.textContent=p.hidden?'Mostrar ▾':'Ocultar ▴';});});var mode=document.getElementById('workdays-mode'),form=document.getElementById('workdays-form');mode.addEventListener('change',function(){['workdays-elapsed','workdays-remaining'].forEach(function(id){document.getElementById(id).disabled=mode.value!=='manual';});});form.addEventListener('submit',function(e){e.preventDefault();var msg=document.getElementById('workdays-feedback'),p={mode:mode.value};if(p.mode==='manual'){p.elapsedWorkdays=Number(document.getElementById('workdays-elapsed').value);p.remainingWorkdays=Number(document.getElementById('workdays-remaining').value);if(!Number.isInteger(p.elapsedWorkdays)||!Number.isInteger(p.remainingWorkdays)||p.elapsedWorkdays<0||p.remainingWorkdays<0||(p.elapsedWorkdays+p.remainingWorkdays<1||p.elapsedWorkdays+p.remainingWorkdays>31)){msg.textContent='Ingresa días enteros válidos, máximo 31 en total.';return;}}msg.textContent='Guardando…';form.dataset.saving='yes';callApi('bonusWorkdaysSet',{token:state.token,payload:p},45000).then(function(r){msg.textContent='Días guardados para este mes.';renderHome(r.home,r.backupUrl,r.monthlyBonus);}).catch(function(err){msg.textContent=err.message||'No se pudo guardar.';}).finally(function(){delete form.dataset.saving;});});}
function renderWorkdaysEditor(data){var box=document.getElementById('workdays-editor');if(!box)return;box.hidden=state.role!=='admin'||!data||!data.month;if(box.hidden)return;var form=document.getElementById('workdays-form');document.getElementById('workdays-estimate').textContent='Automático estimado: '+data.autoElapsedWorkdays+' transcurridos y '+data.autoRemainingWorkdays+' restantes. El ajuste manual rige solo este mes.';if(form.contains(document.activeElement)&&!form.dataset.saving)return;var mode=document.getElementById('workdays-mode');mode.value=data.mode||'auto';document.getElementById('workdays-elapsed').value=data.elapsedWorkdays;document.getElementById('workdays-remaining').value=data.remainingWorkdays;mode.dispatchEvent(new Event('change'));}
})();
