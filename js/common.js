/* 淮北市实验高级中学 · 体育课选课系统 通用工具 */
window.$ = function (sel, root) { return (root || document).querySelector(sel); };
window.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

async function apiFetch(path, options) {
  options = options || {};
  var method = options.method || (options.body !== undefined || options.form ? 'POST' : 'GET');
  var opts = { method: method, credentials: 'same-origin' };
  if (options.form) {
    opts.body = options.form;
  } else if (options.body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(options.body);
  }
  var res;
  try {
    res = await fetch(path, opts);
  } catch (e) {
    throw new Error('网络连接失败，请确认服务已启动');
  }
  var data = {};
  try { data = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok || data.ok === false) {
    var err = new Error(data.error || ('请求失败（' + res.status + '）'));
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(message, type) {
  type = type || 'success';
  var box = $('#toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  var icon = type === 'success' ? '✔' : (type === 'error' ? '✖' : 'ℹ');
  var iSpan = document.createElement('span');
  iSpan.textContent = icon;
  var mSpan = document.createElement('span');
  mSpan.textContent = message;
  el.appendChild(iSpan);
  el.appendChild(mSpan);
  box.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .35s';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 360);
  }, 3400);
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch (e) { return iso; }
}
async function doLogout() {
  try { await apiFetch('/api/logout'); } catch (e) { /* ignore */ }
  location.href = '/';
}
