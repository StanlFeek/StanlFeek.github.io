/* 静态演示版管理后台（localStorage） */
(function () {
  var db = Store.load();
  var viewTitles = { users: '用户管理', courses: '课程管理', selections: '选课情况', settings: '系统设置' };
  var currentView = 'users';
  var modalAction = null;

  function enrolled(courseId) {
    var n = 0;
    Object.keys(db.selections).forEach(function (u) { if (db.selections[u] === courseId) n++; });
    return n;
  }
  function courseName(id) {
    var c = db.courses.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : '';
  }

  /* ---------- 登录 ---------- */
  function isAdmin() {
    try { return sessionStorage.getItem('pe_admin') === '1'; } catch (e) { return false; }
  }
  function showConsole() {
    $('#admin-login-view').classList.add('hidden');
    $('#admin-console').classList.remove('hidden');
    bindConsole();
    switchView('users');
    refresh();
  }

  function bindConsole() {
    $('#logout-btn').addEventListener('click', function () {
      try { sessionStorage.removeItem('pe_admin'); } catch (e) { /* ignore */ }
      location.reload();
    });
    $$('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () { switchView(n.getAttribute('data-view')); });
    });
    $('#user-search').addEventListener('input', renderUsers);
    $('#manual-form').addEventListener('submit', onSubmitManual);
    $('#batch-file-btn').addEventListener('click', function () { $('#batch-file').click(); });
    $('#batch-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      $('#batch-file-name').textContent = f ? f.name : '未选择文件';
    });
    $('#batch-btn').addEventListener('click', onBatchImport);
    $('#course-form').addEventListener('submit', onSubmitCourse);
    $('#export-csv').addEventListener('click', exportCsv);
    $('#pwd-form').addEventListener('submit', onSubmitPwd);
    $('#reset-data-btn').addEventListener('click', function () {
      if (!confirm('确定重置为默认演示数据吗？当前浏览器中的所有改动将丢失。')) return;
      Store.reset();
      location.reload();
    });
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-cancel').addEventListener('click', closeModal);
    $('#modal-mask').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    $('#modal-ok').addEventListener('click', function () { if (modalAction) modalAction(); });
  }

  function init() {
    var form = $('#admin-login-form');
    $('#a-eye').addEventListener('click', function () {
      var inp = $('#a-password');
      var isPwd = inp.type === 'password';
      inp.type = isPwd ? 'text' : 'password';
      $('#a-eye').textContent = isPwd ? '🙈' : '👁';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('#a-username').value.trim();
      var p = $('#a-password').value;
      var err = $('#auth-error');
      err.classList.remove('show');
      if (u !== 'admin' || p !== db.adminPwd) {
        err.textContent = '管理员账号或密码错误（默认 admin / password123456）';
        err.classList.add('show');
        return;
      }
      try { sessionStorage.setItem('pe_admin', '1'); } catch (ex) { /* ignore */ }
      showConsole();
    });
    if (isAdmin()) showConsole();
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
  }

  function refresh() {
    $('#stat-row').innerHTML =
      statCard('👥', db.users.length, '学生账号') +
      statCard('🏅', db.courses.length, '开设课程') +
      statCard('✅', Object.keys(db.selections).length, '已选课人数') +
      statCard('⚠️', db.courses.filter(function (c) { return enrolled(c.id) >= c.capacity; }).length, '名额已满课程');
    if (currentView === 'users') renderUsers();
    else if (currentView === 'courses') renderCourses();
    else if (currentView === 'selections') renderSelections();
  }
  function statCard(icon, num, label) {
    return '<div class="stat-card"><div style="font-size:22px">' + icon + '</div><div class="n">' + num + '</div><div class="t">' + esc(label) + '</div></div>';
  }

  /* ---------- 用户管理 ---------- */
  function onSubmitManual(e) {
    e.preventDefault();
    var u = $('#m-username').value.trim();
    var p = $('#m-password').value;
    if (!u || !p) { toast('请填写用户名和密码', 'error'); return; }
    if (db.users.some(function (x) { return x.u === u; })) { toast('用户名「' + u + '」已存在', 'error'); return; }
    db.users.push({ u: u, p: p });
    Store.save(db);
    toast('账号「' + u + '」添加成功');
    $('#m-username').value = ''; $('#m-password').value = '';
    refresh();
  }

  function onBatchImport() {
    var input = $('#batch-file');
    var file = input.files && input.files[0];
    if (!file) { toast('请先选择 .txt 文件', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var accounts = parseAccountsText(String(reader.result));
      var created = [], skipped = [];
      accounts.forEach(function (a) {
        if (!validUser(a.u)) return;
        if (db.users.some(function (x) { return x.u === a.u; })) { skipped.push(a.u); return; }
        db.users.push({ u: a.u, p: a.p });
        created.push(a.u);
      });
      Store.save(db);
      var html = '<div class="panel-body" style="padding:12px;border:1px solid var(--gray-200);border-radius:8px;background:var(--gray-50)">' +
        '<div style="font-weight:700;margin-bottom:6px">导入结果（' + esc(file.name) + '）</div>';
      html += created.length ? '<div class="text-green">✔ 成功 ' + created.length + ' 个：' + esc(created.join('、')) + '</div>' : '';
      html += skipped.length ? '<div class="text-danger" style="margin-top:4px">✖ 跳过(已存在) ' + skipped.length + ' 个：' + esc(skipped.join('、')) + '</div>' : '';
      html += (!created.length && !skipped.length) ? '<div class="text-muted">未识别到账号</div>' : '';
      html += '</div>';
      $('#batch-result').innerHTML = html;
      toast('导入完成：成功 ' + created.length + ' 个');
      input.value = '';
      $('#batch-file-name').textContent = '未选择文件';
      refresh();
    };
    reader.onerror = function () { toast('读取文件失败', 'error'); };
    reader.readAsText(file, 'utf-8');
  }

  function renderUsers() {
    var kw = ($('#user-search').value || '').trim().toLowerCase();
    var list = db.users.slice();
    if (kw) list = list.filter(function (x) { return x.u.toLowerCase().indexOf(kw) >= 0; });
    $('#user-count').textContent = '共 ' + db.users.length + ' 个账号' + (kw ? '，筛选出 ' + list.length + ' 个' : '');
    var tb = $('#users-tbody');
    if (!list.length) {
      tb.innerHTML = '<tr class="empty-row"><td colspan="4">暂无账号，请在上方添加或批量导入</td></tr>';
      return;
    }
    tb.innerHTML = list.map(function (x, i) {
      var cid = db.selections[x.u];
      return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(x.u) + '</b></td>' +
        '<td>' + (cid ? '<span class="badge badge-blue">' + esc(courseName(cid) || '?') + '</span>' : '<span class="badge badge-gray">未选课</span>') + '</td>' +
        '<td class="actions">' +
          '<button class="btn btn-sm btn-ghost reset-btn" data-u="' + esc(x.u) + '" type="button">重置密码</button> ' +
          '<button class="btn btn-sm btn-danger del-btn" data-u="' + esc(x.u) + '" type="button">删除</button></td></tr>';
    }).join('');
    $$('.reset-btn', tb).forEach(function (b) {
      b.addEventListener('click', function () { openResetModal(b.getAttribute('data-u')); });
    });
    $$('.del-btn', tb).forEach(function (b) {
      b.addEventListener('click', function () {
        var u = b.getAttribute('data-u');
        if (!confirm('确定删除账号「' + u + '」吗？')) return;
        db.users = db.users.filter(function (x) { return x.u !== u; });
        delete db.selections[u];
        Store.save(db);
        refresh();
        toast('已删除用户「' + u + '」');
      });
    });
  }

  /* ---------- 课程管理 ---------- */
  function onSubmitCourse(e) {
    e.preventDefault();
    var name = $('#c-name').value.trim();
    var teacher = $('#c-teacher').value.trim();
    var location = $('#c-location').value.trim();
    var capacity = parseInt($('#c-capacity').value, 10);
    var desc = $('#c-desc').value.trim();
    if (!name || !teacher || !location) { toast('请完整填写课程名称、教师与地点', 'error'); return; }
    if (!(capacity >= 1)) { toast('人数上限需为不小于 1 的整数', 'error'); return; }
    db.courses.push({ id: 'c' + Date.now(), name: name, teacher: teacher, location: location, capacity: capacity, desc: desc });
    Store.save(db);
    toast('课程「' + name + '」添加成功');
    $('#c-name').value = ''; $('#c-teacher').value = ''; $('#c-location').value = ''; $('#c-desc').value = ''; $('#c-capacity').value = '40';
    refresh();
  }

  function renderCourses() {
    $('#course-count').textContent = '共 ' + db.courses.length + ' 门课程';
    var tb = $('#courses-tbody');
    if (!db.courses.length) { tb.innerHTML = '<tr class="empty-row"><td colspan="5">暂无课程</td></tr>'; return; }
    tb.innerHTML = db.courses.map(function (c, i) {
      var n = enrolled(c.id);
      var pct = c.capacity ? Math.min(100, Math.round(n / c.capacity * 100)) : 0;
      return '<tr><td><b>' + esc(c.name) + '</b>' + (c.desc ? '<div class="text-muted" style="font-size:12px">' + esc(c.desc) + '</div>' : '') + '</td>' +
        '<td>' + esc(c.teacher) + '</td><td>' + esc(c.location) + '</td>' +
        '<td><div class="progress" style="min-width:120px"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="num">' + n + ' / ' + c.capacity + (n >= c.capacity ? '（已满）' : '') + '</div></div></td>' +
        '<td class="actions"><button class="btn btn-sm btn-danger del-course" data-id="' + c.id + '" data-name="' + esc(c.name) + '" type="button">删除</button></td></tr>';
    }).join('');
    $$('.del-course', tb).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('确定删除课程「' + b.getAttribute('data-name') + '」吗？其选课记录将清除。')) return;
        var id = b.getAttribute('data-id');
        db.courses = db.courses.filter(function (x) { return x.id !== id; });
        Object.keys(db.selections).forEach(function (u) { if (db.selections[u] === id) delete db.selections[u]; });
        Store.save(db);
        refresh();
        toast('已删除课程');
      });
    });
  }

  /* ---------- 选课情况 ---------- */
  function renderSelections() {
    var rows = Object.keys(db.selections).length;
    $('#sel-summary').textContent = '共 ' + db.users.length + ' 名学生，' + rows + ' 人已选课，' + Math.max(0, db.users.length - rows) + ' 人未选课。';
    var box = $('#course-groups');
    if (!db.courses.length) { box.innerHTML = '<div class="panel"><div class="panel-body notice">📢 暂无课程</div></div>'; return; }
    box.innerHTML = db.courses.map(function (c) {
      var people = Object.keys(db.selections).filter(function (u) { return db.selections[u] === c.id; });
      var n = people.length;
      var full = n >= c.capacity;
      var pct = c.capacity ? Math.min(100, Math.round(n / c.capacity * 100)) : 0;
      var badge = full
        ? '<span class="badge badge-red">已满 ' + n + ' / ' + c.capacity + ' 人</span>'
        : '<span class="badge badge-green">已报 ' + n + ' / ' + c.capacity + ' 人</span>';
      var detail = people.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th style="width:60px">序号</th><th>账号</th></tr></thead><tbody>' +
          people.map(function (u, i) { return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(u) + '</b></td></tr>'; }).join('') +
          '</tbody></table></div>'
        : '<div class="text-muted" style="padding:14px 18px">该课程暂无学生报名</div>';
      return '<div class="panel course-group mb">' +
        '<div class="group-head" role="button" tabindex="0">' +
          '<button class="caret" type="button" aria-label="展开或收起">▸</button>' +
          '<span class="g-name">' + esc(c.name) + '</span>' +
          '<span class="text-muted">' + esc(c.teacher) + '</span>' +
          '<div class="progress g-progress"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="num">' + n + ' / ' + c.capacity + ' 人</div></div>' +
          '<span class="g-count">' + badge + '</span></div>' +
        '<div class="group-detail">' + detail + '</div></div>';
    }).join('');
    $$('.course-group').forEach(function (g) {
      var caret = g.querySelector('.caret');
      var head = g.querySelector('.group-head');
      function toggle() {
        var open = g.classList.toggle('open');
        if (caret) caret.textContent = open ? '▾' : '▸';
      }
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      if (caret) caret.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    });
  }

  function exportCsv() {
    var lines = ['账号,所选课程'];
    Object.keys(db.selections).forEach(function (u) {
      lines.push(csvCell(u) + ',' + csvCell(courseName(db.selections[u]) || ''));
    });
    if (lines.length === 1) { toast('暂无数据可导出', 'error'); return; }
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

  /* ---------- 设置 / 模态框 ---------- */
  function onSubmitPwd(e) {
    e.preventDefault();
    var oldP = $('#p-old').value;
    var newP = $('#p-new').value;
    var conf = $('#p-confirm').value;
    if (oldP !== db.adminPwd) { toast('原密码不正确', 'error'); return; }
    if (!newP) { toast('请输入新密码', 'error'); return; }
    if (newP !== conf) { toast('两次输入的新密码不一致', 'error'); return; }
    db.adminPwd = newP;
    Store.save(db);
    toast('管理员密码已修改');
    $('#p-old').value = ''; $('#p-new').value = ''; $('#p-confirm').value = '';
  }

  function openModal(title, bodyHtml, onOk) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    modalAction = onOk;
    $('#modal-mask').classList.remove('hidden');
    var input = $('#modal-input');
    if (input) setTimeout(function () { input.focus(); }, 30);
  }
  function closeModal() {
    $('#modal-mask').classList.add('hidden');
    modalAction = null;
    $('#modal-body').innerHTML = '';
  }
  function openResetModal(u) {
    openModal('重置密码 - ' + u,
      '<div class="field"><label>输入新密码</label><input class="input" id="modal-input" type="password" maxlength="64" placeholder="请输入新密码"></div>',
      function () {
        var p = $('#modal-input').value;
        if (!p) { toast('请输入新密码', 'error'); return; }
        db.users.forEach(function (x) { if (x.u === u) x.p = p; });
        Store.save(db);
        toast('密码已重置');
        closeModal();
        refresh();
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
