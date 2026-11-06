/* Minutas · módulo de solo lectura para el portal LUP (servidor privado).
   Se engancha dentro de la sección Tareas como subpestaña "Minutas".

   Contrato con el portal (options.api, mismo adaptador que usa LupTasks):
     api('minuteList', {})    -> { minutes: [{ id, date, title, keywords: [], summary, pdf_name }] }
     api('minutePdf', { id }) -> { base64, filename }

   El PDF nunca vive en este repositorio: se pide al servidor privado con la
   sesión activa y se entrega como descarga temporal (Blob + object URL que
   se revoca). No se guarda base64 en el DOM, en storage ni en variables
   persistentes. No se escribe: no hay creación, edición ni borrado. */
(function () {
  'use strict';

  var MAX_ITEMS = 500;
  var MAX_KEYWORDS = 40;
  var KEYWORD_LEN = 48;
  var URL_TTL = 30000;

  function el(tag, cls, value) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function button(label, fn, cls) {
    var node = el('button', 'lm-button ' + (cls || ''), label);
    node.type = 'button';
    if (fn) node.addEventListener('click', fn);
    return node;
  }
  function clean(value, max) {
    if (typeof value === 'number' && isFinite(value)) value = String(value);
    if (typeof value !== 'string') return '';
    return value.replace(/[<>]/g, '').trim().slice(0, max || 200);
  }
  function first(obj, names) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (var i = 0; i < names.length; i += 1) {
      var value = obj[names[i]];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }
  function isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  }
  function fold(value) {
    var out = typeof value === 'string' ? value : '';
    try { out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (err) { /* navegador sin normalize */ }
    return out.toLowerCase();
  }
  function unique(list) {
    return list.filter(function (value, index) { return value && list.indexOf(value) === index; });
  }
  function pad(value) { return (value < 10 ? '0' : '') + value; }
  function validIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var year = Number(value.slice(0, 4));
    var month = Number(value.slice(5, 7));
    var day = Number(value.slice(8, 10));
    if (month < 1 || month > 12 || day < 1) return false;
    var probe = new Date(Date.UTC(year, month - 1, day));
    return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  }
  /* Acepta 2026-11-06, 06/11/2026 y 6-11-26. Devuelve siempre ISO o ''. */
  function isoDate(value) {
    if (typeof value !== 'string') return '';
    var raw = value.trim();
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (iso) {
      var direct = iso[1] + '-' + iso[2] + '-' + iso[3];
      return validIso(direct) ? direct : '';
    }
    var local = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(raw);
    if (local) {
      var year = local[3].length === 2 ? '20' + local[3] : local[3];
      var converted = year + '-' + pad(Number(local[2])) + '-' + pad(Number(local[1]));
      return validIso(converted) ? converted : '';
    }
    return '';
  }
  function dateText(iso) {
    return iso ? iso.split('-').reverse().join('/') : 'Sin fecha';
  }
  function keywordList(value) {
    var list = [];
    if (isArray(value)) list = value.slice(0, MAX_KEYWORDS).map(function (item) { return clean(item, KEYWORD_LEN); });
    else if (typeof value === 'string') list = value.split(/[,;|\n]+/).slice(0, MAX_KEYWORDS).map(function (item) { return clean(item, KEYWORD_LEN); });
    return unique(list.filter(function (item) { return item.length > 0; }));
  }
  function safeName(value, fallback) {
    var name = typeof value === 'string' ? value : '';
    name = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (name && !/\.pdf$/i.test(name)) name += '.pdf';
    return name || fallback;
  }
  function base64ToBlob(base64) {
    var tidy = String(base64 || '').replace(/\s/g, '');
    if (!tidy || !/^[A-Za-z0-9+/]+={0,2}$/.test(tidy)) throw new Error('El PDF llegó incompleto. Inténtalo otra vez.');
    var binary = window.atob(tidy);
    var length = binary.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  function normalizeList(response) {
    var list = null;
    if (isArray(response)) list = response;
    else if (response && isArray(response.minutes)) list = response.minutes;
    else if (response && response.data && isArray(response.data.minutes)) list = response.data.minutes;
    if (!list) throw new Error('El servidor no devolvió una lista de minutas válida.');
    var seen = {};
    return list.slice(0, MAX_ITEMS).map(function (raw) {
      if (!raw || typeof raw !== 'object') return null;
      var id = clean(first(raw, ['id', 'minute_id', 'minuteId', 'slug', 'key']), 120);
      var date = isoDate(first(raw, ['date', 'fecha', 'meeting_date', 'fecha_reunion']));
      var title = clean(first(raw, ['title', 'titulo', 'name', 'asunto']), 200);
      var pdfName = clean(first(raw, ['pdf_name', 'pdfName', 'filename', 'file_name']), 160);
      var summary = clean(first(raw, ['summary', 'resumen']), 2000);
      var keywords = keywordList(first(raw, ['keywords', 'palabras_clave', 'palabrasClave', 'tags', 'etiquetas']));
      if (!id && !date && !title && !pdfName && !keywords.length) return null;
      if (id) {
        if (seen[id]) return null;
        seen[id] = true;
      }
      return { id: id, date: date, title: title, keywords: keywords, summary: summary, pdf_name: pdfName };
    }).filter(function (item) { return !!item; }).sort(function (a, b) {
      if (a.date === b.date) return a.title.localeCompare(b.title);
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? 1 : -1;
    });
  }

  function normalizePdf(response) {
    var body = response && response.data && typeof response.data === 'object' && !response.base64 ? response.data : response;
    var base64 = first(body, ['base64', 'content', 'file_base64']);
    if (typeof base64 !== 'string') throw new Error('El PDF llegó vacío. Inténtalo otra vez.');
    return {
      base64: base64,
      filename: safeName(first(body, ['filename', 'pdf_name', 'name']), 'minuta.pdf')
    };
  }

  function mount(options) {
    var opts = options || {};
    var root = opts.container;
    var role = opts.role === 'admin' ? 'admin' : 'viewer';
    var api = typeof opts.api === 'function' ? opts.api : function () {
      return Promise.reject(new Error('El portal no está conectado al servidor privado.'));
    };

    var alive = true;
    var seq = 0;
    var loading = false;
    var busy = '';
    var data = { minutes: [] };
    var filters = { from: '', to: '', q: '' };
    var urls = [];
    var timers = [];
    var nodes = {};

    function isElement(node) {
      return !!(node && node.nodeType === 1 && typeof node.appendChild === 'function');
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      seq += 1;
      loading = false;
      busy = '';
      timers.forEach(function (id) { window.clearTimeout(id); window.clearInterval(id); });
      timers = [];
      urls.forEach(function (url) { try { window.URL.revokeObjectURL(url); } catch (err) { /* nada que revocar */ } });
      urls = [];
      nodes = {};
      data = { minutes: [] };
      if (isElement(root)) root.textContent = '';
    }

    var instance = function () { destroy(); };
    instance.destroy = destroy;

    /* Sin contenedor válido: se devuelve un destroy inerte para que app.js
       siempre pueda limpiar sin excepciones. */
    if (!isElement(root)) return instance;

    function later(fn, ms) {
      var id = window.setTimeout(function () { if (alive) fn(); }, ms);
      timers.push(id);
      return id;
    }
    function revoke(url) {
      var index = urls.indexOf(url);
      if (index > -1) urls.splice(index, 1);
      try { window.URL.revokeObjectURL(url); } catch (err) { /* nada que revocar */ }
    }
    function clearError() {
      if (!nodes.alert) return;
      nodes.alert.hidden = true;
      nodes.alert.textContent = '';
    }
    function showError(message) {
      if (!nodes.alert) return;
      nodes.alert.hidden = false;
      nodes.alert.textContent = message;
    }
    function field(labelText, input) {
      var wrap = el('label', 'lm-field');
      wrap.appendChild(el('span', 'lm-field-label', labelText));
      wrap.appendChild(input);
      return wrap;
    }
    function dateInput() {
      var input = el('input', 'lm-input');
      input.type = 'date';
      return input;
    }
    function searchInput(placeholder) {
      var input = el('input', 'lm-input');
      input.type = 'search';
      input.placeholder = placeholder || '';
      input.autocomplete = 'off';
      input.spellcheck = false;
      return input;
    }

    function tokens() {
      return fold(filters.q).split(/[\s,;]+/).filter(function (token) {
        return token.length > 0;
      }).slice(0, 8);
    }
    function invalidRange() {
      return !!(filters.from && filters.to && filters.from > filters.to);
    }
    function match(minute) {
      if (filters.from && (!minute.date || minute.date < filters.from)) return false;
      if (filters.to && (!minute.date || minute.date > filters.to)) return false;
      var words = tokens();
      if (words.length) {
        var haystack = fold(minute.keywords.join(' ') + ' ' + minute.title);
        for (var i = 0; i < words.length; i += 1) {
          if (haystack.indexOf(words[i]) < 0) return false;
        }
      }
      return true;
    }
    function countText(total) {
      if (!total) return 'Sin minutas';
      return total === 1 ? '1 minuta' : total + ' minutas';
    }

    function download(url, filename) {
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      later(function () {
        if (link.parentNode) link.parentNode.removeChild(link);
        revoke(url);
      }, URL_TTL);
    }

    function downloadPdf(minute, node) {
      if (!alive || busy || !minute.id) return;
      busy = minute.id;
      var label = node.textContent;
      node.disabled = true;
      node.setAttribute('aria-busy', 'true');
      node.textContent = 'Preparando…';
      clearError();
      Promise.resolve(api('minutePdf', { id: minute.id })).then(function (response) {
        if (!alive || busy !== minute.id) return;
        var pdf = normalizePdf(response);
        var blob = base64ToBlob(pdf.base64);
        if (!blob.size) throw new Error('El PDF llegó vacío. Inténtalo otra vez.');
        var url = window.URL.createObjectURL(blob);
        urls.push(url);
        download(url, pdf.filename || safeName(minute.pdf_name, 'minuta-' + (minute.date || 's-f') + '.pdf'));
      }).catch(function (error) {
        if (!alive) return;
        showError(error && error.message ? error.message : 'No se pudo preparar el PDF.');
      }).then(function () {
        busy = '';
        if (!alive) return;
        node.disabled = false;
        node.removeAttribute('aria-busy');
        node.textContent = label;
      });
    }

    function row(minute) {
      var tr = el('tr');
      if (minute.id) tr.dataset.minuteId = minute.id;

      var dateCell = el('td', 'lm-date', dateText(minute.date));
      if (minute.title) dateCell.appendChild(el('span', 'lm-subtitle', minute.title));

      var pdfCell = el('td', 'lm-pdf');
      if (minute.id) {
        var node = button('Descargar PDF', function (event) {
          event.preventDefault();
          downloadPdf(minute, node);
        }, 'lm-pdf-button');
        node.setAttribute('aria-label', 'Descargar el PDF de la minuta del ' + dateText(minute.date) + (minute.title ? ' (' + minute.title + ')' : ''));
        if (minute.pdf_name) node.title = minute.pdf_name;
        pdfCell.appendChild(node);
      } else {
        pdfCell.appendChild(el('span', 'lm-hint', 'Sin PDF'));
      }

      var keywordCell = el('td', 'lm-keywords');
      if (minute.keywords.length) {
        var chips = el('div', 'lm-chips');
        minute.keywords.forEach(function (keyword) {
          var chip = button(keyword, function () {
            filters.q = keyword;
            nodes.q.value = keyword;
            renderRows();
          }, 'lm-chip');
          chip.title = 'Filtrar por «' + keyword + '»';
          chips.appendChild(chip);
        });
        keywordCell.appendChild(chips);
      } else {
        keywordCell.appendChild(el('span', 'lm-hint', 'Sin palabras clave'));
      }

      tr.append(dateCell, pdfCell, keywordCell);
      return tr;
    }

    function renderRows() {
      if (!alive || !nodes.body) return;
      var all = data.minutes || [];
      var shown = all.filter(match);
      nodes.body.textContent = '';
      shown.forEach(function (minute) { nodes.body.appendChild(row(minute)); });
      if (!shown.length) {
        var placeholder = el('tr');
        var cell = el('td', 'lm-empty', all.length
          ? 'No hay minutas que coincidan con los filtros.'
          : 'Aún no hay minutas publicadas.');
        cell.colSpan = 3;
        placeholder.appendChild(cell);
        nodes.body.appendChild(placeholder);
      }
      if (invalidRange()) {
        nodes.status.className = 'lm-status lm-status--alert';
        nodes.status.textContent = 'Revisa el rango: «Desde» es posterior a «Hasta».';
      } else {
        nodes.status.className = 'lm-status';
        nodes.status.textContent = shown.length === all.length
          ? countText(all.length)
          : shown.length + ' de ' + countText(all.length);
      }
    }

    function buildShell() {
      root.textContent = '';
      var panel = el('section', 'lm-panel');
      panel.setAttribute('aria-label', 'Minutas de reunión');

      var heading = el('div', 'lm-heading');
      var intro = el('div');
      intro.appendChild(el('p', 'lm-eyebrow', 'EQUIPO LUP'));
      intro.appendChild(el('h1', 'lm-title', 'Minutas'));
      intro.appendChild(el('p', 'lm-hint', 'Actas de reunión del equipo. Los PDF se descargan del servidor privado con tu sesión activa y no se guardan en este portal.'));
      var tools = el('div', 'lm-tools');
      nodes.refresh = button('Actualizar', function () { refresh(true); }, 'lm-muted');
      tools.appendChild(nodes.refresh);
      tools.appendChild(el('span', 'lm-hint', role === 'admin' ? 'Administración · lectura' : 'Acceso de lectura'));
      heading.append(intro, tools);
      panel.appendChild(heading);

      var form = el('div', 'lm-filters');
      form.setAttribute('role', 'search');
      nodes.from = dateInput();
      nodes.from.setAttribute('aria-label', 'Filtrar desde la fecha');
      nodes.to = dateInput();
      nodes.to.setAttribute('aria-label', 'Filtrar hasta la fecha');
      nodes.q = searchInput('Ej. presupuesto, metas');
      nodes.q.setAttribute('aria-label', 'Filtrar por palabras clave');
      form.append(
        field('Desde', nodes.from),
        field('Hasta', nodes.to),
        field('Palabras clave', nodes.q),
        button('Limpiar filtros', function () { resetFilters(); }, 'lm-muted')
      );
      panel.appendChild(form);

      nodes.alert = el('p', 'lm-alert');
      nodes.alert.setAttribute('role', 'alert');
      nodes.alert.hidden = true;
      panel.appendChild(nodes.alert);

      nodes.status = el('p', 'lm-status');
      nodes.status.setAttribute('role', 'status');
      nodes.status.setAttribute('aria-live', 'polite');
      panel.appendChild(nodes.status);

      var wrap = el('div', 'lm-table-wrap');
      var table = el('table', 'lm-table');
      var caption = el('caption', 'lm-caption', 'Minutas ordenadas de la más reciente a la más antigua');
      table.appendChild(caption);
      var head = el('thead');
      var headRow = el('tr');
      ['Fecha', 'PDF', 'Palabras clave'].forEach(function (label) {
        var cell = el('th', '', label);
        cell.scope = 'col';
        headRow.appendChild(cell);
      });
      head.appendChild(headRow);
      table.appendChild(head);
      nodes.body = el('tbody');
      table.appendChild(nodes.body);
      wrap.appendChild(table);
      panel.appendChild(wrap);

      panel.appendChild(el('p', 'lm-hint', 'Las minutas y sus PDF viven fuera de este repositorio. Nada de su contenido se publica en GitHub Pages.'));

      root.appendChild(panel);

      function onFilter() {
        filters.from = nodes.from.value || '';
        filters.to = nodes.to.value || '';
        filters.q = nodes.q.value || '';
        renderRows();
      }
      [nodes.from, nodes.to].forEach(function (input) {
        input.addEventListener('input', onFilter);
        input.addEventListener('change', onFilter);
      });
      nodes.q.addEventListener('input', onFilter);
    }

    function resetFilters() {
      if (!alive || !nodes.q) return;
      filters = { from: '', to: '', q: '' };
      nodes.from.value = '';
      nodes.to.value = '';
      nodes.q.value = '';
      renderRows();
    }

    function refresh(manual) {
      if (!alive) return Promise.resolve();
      if (loading) return Promise.resolve();
      loading = true;
      var mine = ++seq;
      if (manual && nodes.refresh) {
        nodes.refresh.disabled = true;
        nodes.refresh.setAttribute('aria-busy', 'true');
      }
      if (!data.minutes.length && nodes.status) nodes.status.textContent = 'Cargando minutas…';
      return Promise.resolve(api('minuteList', {})).then(function (response) {
        if (!alive || mine !== seq) return;
        data.minutes = normalizeList(response);
        clearError();
        renderRows();
      }).catch(function (error) {
        if (!alive || mine !== seq) return;
        showError(error && error.message ? error.message : 'No se pudieron cargar las minutas.');
        if (!data.minutes.length && nodes.status) nodes.status.textContent = 'Sin datos para mostrar.';
      }).then(function () {
        if (mine === seq) loading = false;
        if (!alive) return;
        if (nodes.refresh) {
          nodes.refresh.disabled = false;
          nodes.refresh.removeAttribute('aria-busy');
        }
      });
    }

    instance.refresh = refresh;
    buildShell();
    refresh(false);
    return instance;
  }

  window.LupMinutes = { mount: mount };
})();
