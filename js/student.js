/* 静态演示版学生选课页 */
(function () {
  var me = '';
  var db = Store.load();
  function currentCourse() { return db.selections[me] || null; }
  function enrolled(courseId) {
    var n = 0;
    Object.keys(db.selections).forEach(function (u) { if (db.selections[u] === courseId) n++; });
    return n;
  }

  function init() {
    try { me = sessionStorage.getItem('pe_student') || ''; } catch (e) { me = ''; }
    if (!me) { location.href = 'index.html'; return; }
    $('#uname').textContent = me;
    $('#hello-title').textContent = me + '，欢迎使用选课系统';
    $('#logout-btn').addEventListener('click', function () {
      try { sessionStorage.removeItem('pe_student'); } catch (e) { /* ignore */ }
      location.href = 'index.html';
    });
    render();
  }

  function iconOf(name) {
    if (/篮/.test(name)) return '🏀';
    if (/足/.test(name)) return '⚽';
    if (/羽毛/.test(name)) return '🏸';
    if (/乒乓/.test(name)) return '🏓';
    if (/排/.test(name)) return '🏐';
    if (/跑|田径/.test(name)) return '🏃';
    return '🏅';
  }

  function render() {
    var sel = currentCourse();
    var my = db.courses.filter(function (c) { return c.id === sel; })[0];
    var box = $('#my-card');
    if (my) {
      box.innerHTML = '<div class="panel-head"><h3>🏆 我的选课</h3><span class="badge badge-green">已选课</span></div>' +
        '<div class="panel-body my-line">' +
          '<div class="my-info"><div style="font-size:34px">' + iconOf(my.name) + '</div>' +
            '<div><div class="cname">' + esc(my.name) + '</div>' +
            '<div class="detail">授课教师：' + esc(my.teacher) + ' ｜ 地点：' + esc(my.location) + '</div></div></div>' +
          '<button class="btn btn-danger" id="cancel-btn" type="button">取消选课</button></div>';
      $('#cancel-btn').addEventListener('click', function () {
        if (!confirm('确定取消当前选课吗？')) return;
        delete db.selections[me];
        Store.save(db);
        render();
        toast('已取消选课');
      });
    } else {
      box.innerHTML = '<div class="panel-body notice">📢 你还没有选择体育课项目，请从下方课程中任选 1 项。</div>';
    }
    var grid = $('#course-grid');
    if (!db.courses.length) {
      grid.innerHTML = '<div class="panel" style="padding:40px;text-align:center;color:var(--gray-400)">暂无课程（管理员可到后台添加）</div>';
      return;
    }
    grid.innerHTML = db.courses.map(function (c) {
      var n = enrolled(c.id);
      var full = n >= c.capacity;
      var pct = c.capacity ? Math.min(100, Math.round(n / c.capacity * 100)) : 0;
      var isMy = my && my.id === c.id;
      var badge = isMy ? '<span class="badge badge-green">已选</span>'
        : (full ? '<span class="badge badge-red">已满</span>' : '<span class="badge badge-blue">可选</span>');
      var btn = isMy
        ? '<button class="btn btn-sm btn-ghost" disabled>✔ 已选择</button>'
        : (full ? '<button class="btn btn-sm btn-ghost" disabled>名额已满</button>'
          : '<button class="btn btn-sm btn-primary pick" data-id="' + c.id + '" type="button">选择此课程</button>');
      return '<div class="course-card' + (isMy ? ' selected' : '') + '">' +
        '<div class="head"><span style="font-size:26px">' + iconOf(c.name) + '</span>' + badge + '</div>' +
        '<div class="cname">' + esc(c.name) + '</div>' +
        '<div class="meta"><span><i>👨‍🏫</i>授课教师：' + esc(c.teacher) + '</span>' +
          '<span><i>📍</i>上课地点：' + esc(c.location) + '</span></div>' +
        (c.desc ? '<div class="desc">' + esc(c.desc) + '</div>' : '') +
        '<div class="foot"><div class="progress"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="num">已选 ' + n + ' / ' + c.capacity + ' 人</div></div>' + btn + '</div></div>';
    }).join('');
    $$('.pick', grid).forEach(function (b) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-id')); });
    });
  }

  function choose(courseId) {
    var c = db.courses.filter(function (x) { return x.id === courseId; })[0];
    if (!c) return;
    var my = currentCourse();
    var msg = my && my !== courseId ? '你已选其他课程，确定改选为「' + c.name + '」吗？' : '确定选择「' + c.name + '」吗？';
    if (!confirm(msg)) return;
    db.selections[me] = c.id;
    Store.save(db);
    render();
    toast('选课成功：' + c.name);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
