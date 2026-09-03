/* GitHub Pages 静态演示版数据层：所有数据保存在浏览器 localStorage（仅本机演示用） */
window.Store = (function () {
  var KEY = 'hbsyzx_pe_demo_v1';
  function defaults() {
    return {
      adminPwd: 'password123456',
      users: [
        { u: 'demo', p: '123456' },
        { u: '张老师测试号', p: 'abc123' }
      ],
      courses: [
        { id: 'c1', name: '篮球', teacher: '王老师', location: '东区篮球场', capacity: 40, desc: '基础运球、投篮与全场对抗练习' },
        { id: 'c2', name: '足球', teacher: '李老师', location: '田径场', capacity: 40, desc: '传接球基本功与小型比赛' },
        { id: 'c3', name: '羽毛球', teacher: '张老师', location: '体育馆一层', capacity: 30, desc: '发球、高远球与双打配合' },
        { id: 'c4', name: '乒乓球', teacher: '刘老师', location: '体育馆二层', capacity: 30, desc: '正反手攻球与实战对练' }
      ],
      selections: {} // username -> courseId
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.users) && Array.isArray(d.courses)) return d;
      }
    } catch (e) { /* ignore */ }
    var def = defaults();
    save(def);
    return def;
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  }
  function reset() {
    var def = defaults();
    save(def);
    return def;
  }
  return { load: load, save: save, defaults: defaults, reset: reset, KEY: KEY };
})();

/* 身份证后 6 位 */
function idLast6(id) {
  var s = String(id == null ? '' : id).replace(/\s+/g, '');
  return s.slice(-6);
}
/* 判断文本是否含标签 */
function hasLabels(seg) {
  return /(用户名|账号|用户|姓名|名字|身份证|身份证号|证件号|证件号码|密码|口令|登录密码)\s*[:：]/.test(seg);
}
function keyTypeOf(key) {
  var k = String(key || '').trim();
  if (/身份证|证件号|证件号码/.test(k)) return 'id';
  if (/用户名|账号/.test(k)) return 'username';
  if (/姓名|名字/.test(k)) return 'name';
  if (/密码|口令/.test(k)) return 'password';
  return null;
}
/* 解析一段带标签的文本为若干记录 */
function labeledToRecords(seg) {
  var records = [];
  var cur = null;
  seg.split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (tok) {
    var ci = tok.search(/[:：]/);
    if (ci <= 0) return;
    var type = keyTypeOf(tok.slice(0, ci));
    var value = tok.slice(ci + 1).trim();
    if (!type) return;
    if (type === 'username' || type === 'name') {
      if (cur && (cur.hasId || cur.hasPassword || cur.hasUsername)) { records.push(cur); cur = null; }
      if (!cur) cur = {};
      if (type === 'username') { if (!cur.hasUsername) { cur.username = value; cur.hasUsername = !!value; } }
      else if (!cur.hasName) { cur.name = value; cur.hasName = !!value; }
    } else {
      if (!cur) cur = {};
      if (type === 'password') { cur.password = value; cur.hasPassword = !!value; }
      else if (type === 'id') { cur.id = value; cur.hasId = !!value; }
    }
  });
  if (cur) records.push(cur);
  return records;
}
function validUser(u) { return typeof u === 'string' && /^[^\s:：;；]{1,50}$/.test(u.trim()); }
function validPwd(p) { return typeof p === 'string' && p.length >= 1 && p.length <= 64; }

/* 演示版批量解析：支持 用户名:密码、用户名:abc,密码:123、姓名:张三,身份证:360... */
function parseAccountsText(text) {
  var norm = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[；;]/g, ';')
    .replace(/[：:]/g, ':')
    .replace(/[，,]/g, ',')
    .replace(/[、]/g, ',');
  var accounts = []; // {u,p,src}
  norm.split(/[;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (seg) {
    if (hasLabels(seg)) {
      labeledToRecords(seg).forEach(function (rec) {
        var u = ((rec.username || '').trim()) || ((rec.name || '').trim());
        var hasP = rec.password !== undefined && String(rec.password).trim() !== '';
        var p = hasP ? String(rec.password).trim() : (rec.id ? idLast6(rec.id) : '');
        var usable = !!(rec.username || rec.name || rec.id || hasP);
        if (usable && u && p) accounts.push({ u: u, p: p, src: seg });
      });
    } else {
      var i = seg.indexOf(':');
      if (i > 0) {
        var u = seg.slice(0, i).trim();
        var p = seg.slice(i + 1).trim();
        if (u && p) accounts.push({ u: u, p: p, src: seg });
      }
    }
  });
  return accounts;
}
