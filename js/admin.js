/* 管理员后台逻辑 */
(function () {
  var state = { users: [], courses: [], rows: [], stats: [] };
  var viewTitles = { users: '用户管理', courses: '课程管理', selections: '选课情况', settings: '系统设置' };
  var currentView = 'users';
  var modalAction = null; // 模态框确认回调

  /* ---------- 初始化 ---------- */
  async function init() {
    try {
      var me = await apiFetch('/api/me');
      if (me.role !== 'admin') { location.href = '/admin'; return; }
      $('#admin-name').textContent = me.username;
    } catch (e) { location.href = '/admin'; return; }

    $('#logout-btn').addEventListener('click', doLogout);
    $$('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () { switchView(n.getAttribute('data-view')); });
    });
    $('#user-search').addEventListener('input', function () { renderUsers(); });
    $('#manual-form').addEventListener('submit', onSubmitManual);
    $('#batch-btn').addEventListener('click', onBatchImport);
    $('#batch-file-btn').addEventListener('click', function () { $('#batch-file').click(); });
    $('#batch-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      $('#batch-file-name').textContent = f ? f.name : '未选择文件';
    });
    $('#course-form').addEventListener('submit', onSubmitCourse);
    $('#pwd-form').addEventListener('submit', onSubmitPwd);
    $('#export-csv').addEventListener('click', exportCsv);
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-cancel').addEventListener('click', closeModal);
    $('#modal-mask').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    $('#modal-ok').addEventListener('click', function () {
      if (modalAction) modalAction();
    });

    await refreshAll();
    switchView('users');
  }

  /* ---------- 数据加载 ---------- */
  async function refreshAll() {
    try {
      var results = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/courses'),
        apiFetch('/api/admin/selections')
      ]);
      state.users = results[0].users || [];
      state.courses = results[1].courses || [];
      state.rows = results[2].rows || [];
      state.stats = results[2].stats || [];
      renderStats();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function renderStats() {
    var selectedCount = state.rows.length;
    var fullCount = state.courses.filter(function (c) { return c.enrolled >= c.capacity; }).length;
    $('#stat-row').innerHTML =
      statCard('👥', state.users.length, '学生账号') +
      statCard('🏅', state.courses.length, '开设课程') +
      statCard('✅', selectedCount, '已选课人数') +
      statCard('⚠️', fullCount, '名额已满课程');
  }
  function statCard(icon, num, label) {
    return '<div class="stat-card"><div style="font-size:22px">' + icon + '</div><div class="n">' + num + '</div><div class="t">' + esc(label) + '</div></div>';
  }

  /* ---------- 视图切换 ---------- */
  function switchView(view) {
    currentView = view;
    $$('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.getAttribute('data-view') === view);
    });
    ['users', 'courses', 'selections', 'settings'].forEach(function (v) {
      $('#view-' + v).classList.toggle('hidden', v !== view);
    });
    $('#view-title').textContent = viewTitles[view];
    if (view === 'users') renderUsers();
    else if (view === 'courses') renderCourses();
    else if (view === 'selections') renderSelections();
    else if (view === 'settings') { /* 无动态数据 */ }
  }

  /* ================= 用户管理 ================= */

  async function onSubmitManual(e) {
    e.preventDefault();
    var username = $('#m-username').value.trim();
    var password = $('#m-password').value;
    if (!username) { toast('请输入用户名', 'error'); return; }
    if (!password) { toast('请输入密码', 'error'); return; }
    try {
      await apiFetch('/api/admin/users', { body: { username: username, password: password } });
      toast('账号「' + username + '」添加成功');
      $('#m-username').value = '';
      $('#m-password').value = '';
      await refreshAll();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function onBatchImport() {
    var input = $('#batch-file');
    var file = input.files && input.files[0];
    var resultBox = $('#batch-result');
    if (!file) { toast('请先选择 .txt 文件', 'error'); return; }
    if (!/\.(txt|xlsx)$/i.test(file.name)) { toast('请选择 .txt 文本文档或 .xlsx 表格', 'error'); return; }
    var fd = new FormData();
    fd.append('file', file);
    var btn = $('#batch-btn');
    btn.disabled = true;
    btn.textContent = '导入中…';
    resultBox.innerHTML = '';
    try {
      var r = await apiFetch('/api/admin/users/batch', { form: fd });
      var html = '<div class="panel-body" style="padding:12px;border:1px solid var(--gray-200);border-radius:8px;background:var(--gray-50)">';
      html += '<div style="font-weight:700;margin-bottom:8px">导入结果（' + esc(r.filename) + '）</div>';
      if (r.created && r.created.length) {
        html += '<div class="text-green" style="margin-bottom:4px">✔ 成功导入 ' + r.created.length + ' 个账号：' + esc(r.created.join('、')) + '</div>';
      }
      if (r.skipped && r.skipped.length) {
        html += '<div class="text-danger" style="margin:4px 0">✖ 跳过 ' + r.skipped.length + ' 个：' + esc(r.skipped.map(function (s) { return s.username + '（' + s.reason + '）'; }).join('、')) + '</div>';
      }
      if (r.invalid && r.invalid.length) {
        html += '<div class="text-muted" style="margin:4px 0">⚠ 无效行 ' + r.invalid.length + ' 个：' + esc(r.invalid.map(function (s) { return '「' + s.text + '」' + s.reason; }).join('；')) + '</div>';
      }
      if (!r.created.length && !r.skipped.length && !r.invalid.length) html += '<div class="text-muted">未解析到任何账号</div>';
      html += '</div>';
      resultBox.innerHTML = html;
      toast('导入完成：成功 ' + (r.created ? r.created.length : 0) + ' 个');
      input.value = '';
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '上传并导入';
    }
  }

  function renderUsers() {
    var kw = ($('#user-search').value || '').trim().toLowerCase();
    var list = state.users;
    if (kw) list = list.filter(function (u) { return u.username.toLowerCase().indexOf(kw) >= 0; });
    $('#user-count').textContent = '共 ' + state.users.length + ' 个账号' + (kw ? '，筛选出 ' + list.length + ' 个' : '');
    var tb = $('#users-tbody');
    if (!list.length) {
      tb.innerHTML = '<tr class="empty-row"><td colspan="5">' + (kw ? '没有匹配的账号' : '暂无账号，请在上方添加或批量导入') + '</td></tr>';
      return;
    }
    tb.innerHTML = list.map(function (u, i) {
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><b>' + esc(u.username) + '</b></td>' +
        '<td>' + (u.courseName ? '<span class="badge badge-blue">' + esc(u.courseName) + '</span>' : '<span class="badge badge-gray">未选课</span>') + '</td>' +
        '<td class="text-muted">' + fmtTime(u.createdAt) + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-sm btn-ghost reset-btn" data-id="' + u.id + '" data-name="' + esc(u.username) + '" type="button">重置密码</button> ' +
          '<button class="btn btn-sm btn-danger del-btn" data-id="' + u.id + '" data-name="' + esc(u.username) + '" type="button">删除</button>' +
        '</td></tr>';
    }).join('');
    $$('.reset-btn', tb).forEach(function (b) {
      b.addEventListener('click', function () { openResetModal(b.getAttribute('data-id'), b.getAttribute('data-name')); });
    });
    $$('.del-btn', tb).forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-name');
        if (!confirm('确定删除账号「' + name + '」吗？其选课记录将一并删除。')) return;
        apiFetch('/api/admin/users/' + b.getAttribute('data-id'), { method: 'DELETE' })
          .then(function (r) { toast(r.message || '已删除'); return refreshAll(); })
          .catch(function (e) { toast(e.message, 'error'); });
      });
    });
  }
  /* ================= 课程管理 ================= */

  async function onSubmitCourse(e) {
    e.preventDefault();
    var name = $('#c-name').value.trim();
    var teacher = $('#c-teacher').value.trim();
    var location = $('#c-location').value.trim();
    var capacity = parseInt($('#c-capacity').value, 10);
    var desc = $('#c-desc').value.trim();
    if (!name || !teacher || !location) { toast('请完整填写课程名称、教师与地点', 'error'); return; }
    if (!(capacity >= 1)) { toast('人数上限需为不小于 1 的整数', 'error'); return; }
    try {
      await apiFetch('/api/admin/courses', { body: { name: name, teacher: teacher, location: location, capacity: capacity, description: desc } });
      toast('课程「' + name + '」添加成功');
      $('#c-name').value = ''; $('#c-teacher').value = ''; $('#c-location').value = ''; $('#c-desc').value = '';
      $('#c-capacity').value = '40';
      await refreshAll();
      renderCourses();
    } catch (err) { toast(err.message, 'error'); }
  }

  function renderCourses() {
    $('#course-count').textContent = '共 ' + state.courses.length + ' 门课程';
    var tb = $('#courses-tbody');
    if (!state.courses.length) {
      tb.innerHTML = '<tr class="empty-row"><td colspan="5">暂无课程，请先添加课程</td></tr>';
      return;
    }
    tb.innerHTML = state.courses.map(function (c, i) {
      var pct = c.capacity ? Math.min(100, Math.round(c.enrolled / c.capacity * 100)) : 0;
      var full = c.enrolled >= c.capacity;
      return '<tr>' +
        '<td><b>' + esc(c.name) + '</b>' + (c.description ? '<div class="text-muted" style="font-size:12px">' + esc(c.description) + '</div>' : '') + '</td>' +
        '<td>' + esc(c.teacher) + '</td>' +
        '<td>' + esc(c.location) + '</td>' +
        '<td><div class="progress" style="min-width:120px"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="num">' + c.enrolled + ' / ' + c.capacity + (full ? '（已满）' : '') + '</div></div></td>' +
        '<td class="actions"><button class="btn btn-sm btn-danger del-course" data-id="' + c.id + '" data-name="' + esc(c.name) + '" type="button">删除</button></td>' +
      '</tr>';
    }).join('');
    $$('.del-course', tb).forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-name');
        if (!confirm('确定删除课程「' + name + '」吗？该课程的学生选课记录将被清除。')) return;
        apiFetch('/api/admin/courses/' + b.getAttribute('data-id'), { method: 'DELETE' })
          .then(function (r) { toast(r.message || '已删除'); return refreshAll(); })
          .catch(function (e) { toast(e.message, 'error'); });
      });
    });
  }

  /* ================= 选课情况 ================= */

  function renderSelections() {
    var rows = state.rows;
    var unselected = state.users.length - rows.length;
    $('#sel-summary').textContent =
      '共 ' + state.users.length + ' 名学生，' + rows.length + ' 人已选课，' + Math.max(0, unselected) + ' 人未选课。';

    var box = $('#course-groups');
    if (!state.courses.length) {
      box.innerHTML = '<div class="panel"><div class="panel-body notice">📢 暂无课程</div></div>';
      return;
    }
    box.innerHTML = state.courses.map(function (c) {
      var people = rows.filter(function (r) { return r.courseId === c.id; });
      var full = c.enrolled >= c.capacity;
      var pct = c.capacity ? Math.min(100, Math.round(c.enrolled / c.capacity * 100)) : 0;
      var badge = full
        ? '<span class="badge badge-red">已满 ' + c.enrolled + ' / ' + c.capacity + ' 人</span>'
        : '<span class="badge badge-green">已报 ' + c.enrolled + ' / ' + c.capacity + ' 人</span>';
      var detail;
      if (!people.length) {
        detail = '<div class="text-muted" style="padding:14px 18px">该课程暂无学生报名</div>';
      } else {
        detail = '<div class="table-wrap"><table class="table"><thead><tr><th style="width:60px">序号</th><th>账号</th><th>选课时间</th></tr></thead><tbody>' +
          people.map(function (r, i) {
            return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.username) + '</b></td><td class="text-muted">' + fmtTime(r.selectedAt) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      return '<div class="panel course-group mb">' +
        '<div class="group-head" role="button" tabindex="0">' +
          '<button class="caret" type="button" aria-label="展开或收起">▸</button>' +
          '<span class="g-name">' + esc(c.name) + '</span>' +
          '<span class="text-muted">' + esc(c.teacher || '') + '</span>' +
          '<div class="progress g-progress"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="num">' + c.enrolled + ' / ' + c.capacity + ' 人</div></div>' +
          '<span class="g-count">' + badge + '</span>' +
        '</div>' +
        '<div class="group-detail">' + detail + '</div>' +
      '</div>';
    }).join('');

    $$('.course-group').forEach(function (g) {
      var caret = g.querySelector('.caret');
      var head = g.querySelector('.group-head');
      function toggle() {
        var open = g.classList.toggle('open');
        if (caret) caret.textContent = open ? '▾' : '▸';
      }
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      if (caret) caret.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    });
  }
  function exportCsv() {
    var rows = state.rows;
    if (!rows.length) { toast('暂无数据可导出', 'error'); return; }
    var lines = ['账号,所选课程,选课时间'];
    rows.forEach(function (r) {
      lines.push(csvCell(r.username) + ',' + csvCell(r.courseName) + ',' + csvCell(fmtTime(r.selectedAt)));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '选课情况.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }
  function csvCell(v) {
    v = String(v === null || v === undefined ? '' : v);
    if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  /* ================= 系统设置 ================= */

  async function onSubmitPwd(e) {
    e.preventDefault();
    var oldPwd = $('#p-old').value;
    var newPwd = $('#p-new').value;
    var confirmPwd = $('#p-confirm').value;
    if (!oldPwd || !newPwd) { toast('请填写完整', 'error'); return; }
    if (newPwd !== confirmPwd) { toast('两次输入的新密码不一致', 'error'); return; }
    try {
      var r = await apiFetch('/api/admin/password', { body: { oldPassword: oldPwd, newPassword: newPwd } });
      toast(r.message || '管理员密码已修改');
      $('#p-old').value = ''; $('#p-new').value = ''; $('#p-confirm').value = '';
    } catch (err) { toast(err.message, 'error'); }
  }

  /* ================= 模态框 ================= */

  function openModal(title, bodyHtml, onOk) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    modalAction = onOk;
    $('#modal-mask').classList.remove('hidden');
    var input = $('#modal-input');
    if (input) { setTimeout(function () { input.focus(); }, 30); }
  }
  function closeModal() {
    $('#modal-mask').classList.add('hidden');
    modalAction = null;
    $('#modal-body').innerHTML = '';
  }

  function openResetModal(userId, username) {
    openModal(
      '重置密码 - ' + username,
      '<div class="field"><label>输入新密码</label><input class="input" id="modal-input" type="password" maxlength="64" placeholder="请输入新密码"><div class="hint">重置后将立即生效，请及时告知该学生。</div></div>',
      function () {
        var pwd = $('#modal-input').value;
        if (!pwd) { toast('请输入新密码', 'error'); return; }
        apiFetch('/api/admin/users/' + userId + '/password', { body: { password: pwd } })
          .then(function (r) {
            toast(r.message || '密码已重置');
            closeModal();
            return refreshAll();
          })
          .catch(function (e) { toast(e.message, 'error'); });
      }
    );
  }

  document.addEventListener('DOMContentLoaded', init);
})();

