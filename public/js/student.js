/* 学生选课页面逻辑 */
(function () {
  var me = null;
  var mySel = null; // { courseId, selectedAt }
  var courses = [];

  async function init() {
    try {
      me = await apiFetch('/api/me');
    } catch (e) {
      location.href = '/';
      return;
    }
    if (me.role !== 'student') {
      location.href = me.role === 'admin' ? '/console' : '/';
      return;
    }
    $('#uname').textContent = me.username;
    $('#hello-title').textContent = me.username + '，欢迎使用选课系统';
    $('#logout-btn').addEventListener('click', doLogout);
    await loadData();
  }

  async function loadData() {
    try {
      var data = await apiFetch('/api/courses');
      courses = data.courses || [];
      mySel = data.mySelection;
      renderMyCard();
      renderCourses();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function renderMyCard() {
    var box = $('#my-card');
    if (mySel) {
      var c = courses.find(function (x) { return x.id === mySel.courseId; });
      if (!c) { box.innerHTML = ''; return; }
      box.innerHTML =
        '<div class="panel-head"><h3>🏆 我的选课</h3><span class="badge badge-green">已选课</span></div>' +
        '<div class="panel-body my-line">' +
          '<div class="my-info">' +
            '<div style="font-size:34px">⚽</div>' +
            '<div>' +
              '<div class="cname">' + esc(c.name) + '</div>' +
              '<div class="detail">授课教师：' + esc(c.teacher) + ' ｜ 地点：' + esc(c.location) +
              (mySel.selectedAt ? ' ｜ 选课时间：' + fmtTime(mySel.selectedAt) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-danger" id="cancel-btn" type="button">取消选课</button>' +
        '</div>';
      $('#cancel-btn').addEventListener('click', async function () {
        if (!confirm('确定取消当前选课吗？')) return;
        try {
          var r = await apiFetch('/api/cancel');
          toast(r.message || '已取消选课');
          await loadData();
        } catch (e) { toast(e.message, 'error'); }
      });
    } else {
      box.innerHTML =
        '<div class="panel-body notice">📢 你还没有选择体育课项目，请从下方课程中任选 1 项；如所选课程已满，请改选其他课程。</div>';
    }
  }

  function courseIcon(name) {
    if (/篮/.test(name)) return '🏀';
    if (/足/.test(name)) return '⚽';
    if (/羽毛/.test(name)) return '🏸';
    if (/乒乓/.test(name)) return '🏓';
    if (/排/.test(name)) return '🏐';
    if (/网球/.test(name)) return '🎾';
    if (/田径|跑/.test(name)) return '🏃';
    if (/游泳/.test(name)) return '🏊';
    if (/武术|太极/.test(name)) return '🥋';
    if (/健美操|舞蹈|韵律/.test(name)) return '💃';
    return '🏅';
  }

  function renderCourses() {
    var grid = $('#course-grid');
    if (!courses.length) {
      grid.innerHTML = '<div class="panel" style="padding:40px;text-align:center;color:var(--gray-400)">暂无课程，请联系管理员添加课程</div>';
      return;
    }
    grid.innerHTML = courses.map(function (c) {
      var pct = c.capacity ? Math.min(100, Math.round(c.enrolled / c.capacity * 100)) : 0;
      var badge, btn;
      if (c.selected) {
        badge = '<span class="badge badge-green">已选</span>';
        btn = '<button class="btn btn-sm btn-ghost" disabled>✔ 已选择</button>';
      } else if (c.full) {
        badge = '<span class="badge badge-red">已满</span>';
        btn = '<button class="btn btn-sm btn-ghost" disabled>名额已满</button>';
      } else {
        badge = '<span class="badge badge-blue">可选</span>';
        btn = '<button class="btn btn-sm btn-primary select-btn" data-id="' + c.id + '" type="button">选择此课程</button>';
      }
      return '<div class="course-card' + (c.selected ? ' selected' : '') + '">' +
        '<div class="head"><span style="font-size:26px">' + courseIcon(c.name) + '</span>' + badge + '</div>' +
        '<div class="cname">' + esc(c.name) + '</div>' +
        '<div class="meta">' +
          '<span><i>👨‍🏫</i>授课教师：' + esc(c.teacher) + '</span>' +
          '<span><i>📍</i>上课地点：' + esc(c.location) + '</span>' +
        '</div>' +
        (c.description ? '<div class="desc">' + esc(c.description) + '</div>' : '') +
        '<div class="foot">' +
          '<div class="progress"><div class="bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="num">已选 ' + c.enrolled + ' / ' + c.capacity + ' 人</div></div>' +
          btn +
        '</div>' +
      '</div>';
    }).join('');
    $$('.select-btn', grid).forEach(function (b) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-id')); });
    });
  }

  async function choose(courseId) {
    var c = courses.find(function (x) { return x.id === courseId; });
    if (!c) return;
    var msg = '确定选择「' + c.name + '」吗？';
    if (mySel && mySel.courseId !== courseId) {
      var old = courses.find(function (x) { return x.id === mySel.courseId; });
      msg = '你当前已选「' + (old ? old.name : '其他课程') + '」，确定改选为「' + c.name + '」吗？';
    }
    if (!confirm(msg)) return;
    try {
      var r = await apiFetch('/api/select', { body: { courseId: courseId } });
      toast(r.message || '选课成功');
      await loadData();
    } catch (e) { toast(e.message, 'error'); }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
