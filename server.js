'use strict';
/*
 * 淮北市实验高级中学 · 体育课选课系统
 * 零依赖 Node.js 后端：账号管理 / 批量导入 / 选课 / 课程管理
 * 运行: node server.js    (默认端口 3000，可用环境变量 PORT/HOST 覆盖)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const xlsx = require('./xlsx.js');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ADMIN_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'password123456';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 小时

/* ------------------------------ 数据存储 ------------------------------ */

function uid(prefix) {
  return prefix + '_' + crypto.randomBytes(9).toString('hex');
}
function newSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}
function verifyPassword(password, salt, hash) {
  const a = Buffer.from(hashPassword(password, salt), 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function nowIso() { return new Date().toISOString(); }

function buildUser(username, password) {
  const salt = newSalt();
  return {
    id: uid('u'),
    username: username.trim(),
    salt,
    hash: hashPassword(password, salt),
    createdAt: nowIso()
  };
}
function buildAdmin(username, password) {
  const salt = newSalt();
  return {
    username,
    salt,
    hash: hashPassword(password, salt),
    createdAt: nowIso()
  };
}

function seedCourses() {
  const mk = (name, teacher, location, capacity, description) => ({
    id: uid('c'),
    name, teacher, location, capacity, description, createdAt: nowIso()
  });
  return [
    mk('篮球', '王老师', '东区篮球场', 40, '基础运球、投篮与全场对抗练习'),
    mk('足球', '李老师', '田径场', 40, '传接球基本功与小型比赛'),
    mk('羽毛球', '张老师', '体育馆一层', 30, '发球、高远球与双打配合'),
    mk('乒乓球', '刘老师', '体育馆二层', 30, '正反手攻球与实战对练')
  ];
}

function defaultDb() {
  return {
    secret: crypto.randomBytes(32).toString('hex'),
    admin: buildAdmin(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD),
    users: [buildUser('demo', '123456')],
    courses: seedCourses(),
    selections: [],
    createdAt: nowIso()
  };
}

let db = null;
function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      db = defaultDb();
      saveDb();
      return;
    }
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // 兼容老数据：补齐缺失字段
    let changed = false;
    if (!db.secret) { db.secret = crypto.randomBytes(32).toString('hex'); changed = true; }
    if (!db.admin || !db.admin.hash) {
      db.admin = buildAdmin(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD); changed = true;
    }
    if (!Array.isArray(db.users)) db.users = []; 
    if (!Array.isArray(db.courses)) db.courses = [];
    if (!Array.isArray(db.selections)) db.selections = [];
    if (changed) saveDb();
  } catch (e) {
    console.error('读取数据文件失败:', e.message);
    process.exit(1);
  }
}
function saveDb() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

/* ------------------------------ 会话 ------------------------------ */

const sessions = new Map(); // token -> { role, username, userId?, expires }

function createSession(payload) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Object.assign({ expires: Date.now() + SESSION_TTL_MS }, payload));
  return token;
}
function destroySession(token) { if (token) sessions.delete(token); }
function getSession(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) { sessions.delete(token); return null; }
  return s;
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}
function cookieHeader(token) {
  return 'sid=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(SESSION_TTL_MS / 1000);
}
function clearCookieHeader() {
  return 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

/* ------------------------------ 工具函数 ------------------------------ */

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req, 2 * 1024 * 1024);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); }
  catch (e) { throw httpError(400, '请求数据格式错误'); }
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}
function ok(res, obj) { sendJson(res, 200, Object.assign({ ok: true }, obj)); }
function fail(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  sendJson(res, status, { ok: false, error: err.message || '服务器内部错误' });
}

function validUsername(u) {
  return typeof u === 'string' && /^[^\s:：;；]{1,50}$/.test(u.trim());
}
function validPassword(p) {
  return typeof p === 'string' && p.length >= 1 && p.length <= 64;
}
function findUserByName(name) {
  const n = String(name).trim();
  return db.users.find(u => u.username.toLowerCase() === n.toLowerCase());
}
function courseById(id) { return db.courses.find(c => c.id === id); }
function enrolledCount(courseId) {
  return db.selections.filter(s => s.courseId === courseId).length;
}
function selectionOf(userId) { return db.selections.find(s => s.userId === userId); }

function requireRole(role) {
  return (req, res) => {
    const s = getSession(req);
    if (!s || s.role !== role) throw httpError(401, role === 'admin' ? '请先登录管理员后台' : '请先登录');
    return s;
  };
}

/* ------------------------------ 文本批量解析 ------------------------------ */

function decodeText(buf) {
  // 优先 UTF-8，若失败则尝试 GBK/GB18030（Windows 记事本默认 ANSI 编码）
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch (e) { /* fallthrough */ }
  try { return new TextDecoder('gb18030').decode(buf); }
  catch (e) { return buf.toString('latin1'); }
}

/* ------------------------- 账号识别与批量解析（txt / xlsx） ------------------------- */

function idLast6(id) {
  // 去掉空格后取最后 6 位作为密码
  const s = String(id == null ? '' : id).replace(/\s+/g, '');
  return s.slice(-6);
}

function keyTypeOf(key) {
  const k = String(key || '').trim();
  if (/身份证|证件号|证件号码/.test(k)) return 'id';
  if (/用户名|账号/.test(k)) return 'username';
  if (/姓名|名字/.test(k)) return 'name';
  if (/密码|口令/.test(k)) return 'password';
  return null;
}

// 是否含“标签:值”形式的字段
function hasLabels(seg) {
  return /(用户名|账号|用户|姓名|名字|身份证|身份证号|证件号|证件号码|密码|口令|登录密码)\s*:/.test(seg);
}

// 把一段含标签的文本切成若干条 {username,name,id,password}
function labeledSegmentToRecords(seg) {
  const records = [];
  let cur = null;
  seg.split(/[,，]/).map(t => t.trim()).filter(Boolean).forEach(tok => {
    const ci = tok.indexOf(':');
    if (ci <= 0) return;
    const type = keyTypeOf(tok.slice(0, ci));
    const value = tok.slice(ci + 1).trim();
    if (!type) return;
    if (type === 'username' || type === 'name') {
      // 已有一条完整记录(含密码/身份证/用户名)时再出现“用户名/姓名” → 另起一条
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

// 整理成可入库的账号；header=true 表示表头/空行应忽略
function accountFromFields(f) {
  const hasExplicitPwd = f.password !== undefined && String(f.password).trim() !== '';
  const username = (f.username || '').trim() || (f.name || '').trim();
  const password = hasExplicitPwd ? String(f.password).trim()
    : (f.id && String(f.id).trim() !== '' ? idLast6(f.id) : '');
  const usable = !!(f.username || f.name || f.id || hasExplicitPwd);
  return { username, password, header: !usable };
}

// 校验、去重并生成用户
function importCandidates(candidates) {
  const created = [], skipped = [], invalid = [];
  const seen = new Set();
  candidates.forEach(c => {
    if (c.header) return; // 表头/空行忽略
    const text = c.text || c.username || '(空)';
    if (c.noColon) { invalid.push({ text, reason: '缺少“：”或可识别的标签' }); return; }
    if (!validUsername(c.username)) { invalid.push({ text, reason: '用户名格式不正确' }); return; }
    if (!validPassword(c.password)) { invalid.push({ text, reason: c.password ? '密码为空或过长' : '未识别到密码' }); return; }
    const key = c.username.toLowerCase();
    if (seen.has(key)) { skipped.push({ username: c.username, reason: '文件内重复' }); return; }
    if (findUserByName(c.username)) { skipped.push({ username: c.username, reason: '用户名已存在' }); return; }
    seen.add(key);
    created.push(buildUser(c.username, c.password));
  });
  return { created, skipped, invalid };
}

function clip(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// 文本文档解析：支持 用户名:密码 / 用户名:abc,密码:123 / 姓名:张三,身份证:360...，
// 账号间用 ; 或换行隔开；同一行多个“姓名/用户名”也会自动切成多条
function parseAccountText(text) {
  const norm = String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[；;]/g, ';')
    .replace(/[：:]/g, ':')
    .replace(/[，,]/g, ',')
    .replace(/[、]/g, ',');
  const candidates = [];
  norm.split(/[;\n]+/).map(s => s.trim()).filter(Boolean).forEach(seg => {
    if (hasLabels(seg)) {
      labeledSegmentToRecords(seg).forEach(rec => {
        const acc = accountFromFields(rec);
        candidates.push(Object.assign({ text: clip(seg, 40) }, acc));
      });
    } else {
      const i = seg.indexOf(':');
      if (i <= 0) { candidates.push({ username: '', password: '', noColon: true, text: clip(seg, 40) }); return; }
      const acc = accountFromFields({ username: seg.slice(0, i).trim(), password: seg.slice(i + 1).trim() });
      candidates.push(Object.assign({ text: clip(seg, 40) }, acc));
    }
  });
  return importCandidates(candidates);
}

// 表格(.xlsx)解析：rows 为二维字符串数组
function tableHeaderType(cell) {
  const s = String(cell || '').replace(/\s+/g, '');
  if (!s) return null;
  if (/身份证|证件号/.test(s)) return 'id';
  if (/用户名|账号/.test(s)) return 'username';
  if (/密码|口令/.test(s)) return 'password';
  if (/姓名|名字/.test(s)) return 'name';
  return null;
}

function parseTableRows(rows) {
  let headerRow = -1;
  let colType = {};
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const map = {};
    let hits = 0;
    (rows[r] || []).forEach((cell, c) => {
      const t = tableHeaderType(cell);
      if (t) { map[c] = t; hits++; }
    });
    if (hits > 0) { headerRow = r; colType = map; break; }
  }
  function colOf(type) {
    const found = Object.keys(colType).filter(c => colType[c] === type).map(Number).sort((a, b) => a - b);
    return found.length ? found[0] : -1;
  }
  // 无表头时的启发式：找“身份证列”（多数为 ≥15 位数字）
  let idCol = -1;
  if (headerRow < 0) {
    const width = Math.max.apply(null, rows.map(r => r.length).concat([0]));
    for (let c = 0; c < width; c++) {
      let good = 0, total = 0;
      rows.forEach(row => {
        const v = String(row[c] || '').replace(/\s+/g, '');
        if (!v) return;
        total++;
        if (/^\d{15,18}[0-9Xx]?$/.test(v)) good++;
      });
      if (total > 0 && good / total >= 0.5) { idCol = c; break; }
    }
  }
  const uCol = colOf('username') >= 0 ? colOf('username') : colOf('name');
  const pCol = colOf('password');
  const idColH = colOf('id');

  const candidates = [];
  rows.forEach((row, ri) => {
    if (ri === headerRow) return;
    const vals = (row || []).map(v => String(v || '').trim());
    if (vals.every(v => v === '')) return;
    let f;
    if (headerRow >= 0) {
      f = {};
      if (uCol >= 0) f.username = vals[uCol];
      if (pCol >= 0) f.password = vals[pCol];
      if (idColH >= 0) f.id = vals[idColH];
    } else if (idCol >= 0) {
      const nameCol = idCol === 0 ? 1 : 0;
      f = { username: vals[nameCol] || '', id: vals[idCol] };
    } else {
      f = { username: vals[0] || '', password: vals[1] || '' };
    }
    const acc = accountFromFields(f);
    const shown = clip(vals.filter(v => v !== '').join(' / '), 40) || ('第 ' + (ri + 1) + ' 行');
    candidates.push(Object.assign({ text: shown }, acc));
  });
  return importCandidates(candidates);
}

/* ------------------------------ multipart 解析 ------------------------------ */

function parseMultipart(buf, boundary) {
  const marker = Buffer.from('--' + boundary);
  const parts = [];
  let pos = 0;
  while (pos < buf.length) {
    const start = buf.indexOf(marker, pos);
    if (start === -1) break;
    let cursor = start + marker.length;
    if (buf[cursor] === 45 && buf[cursor + 1] === 45) break; // 结束边界 --boundary--
    if (buf[cursor] === 13) cursor += 2;
    else if (buf[cursor] === 10) cursor += 1;
    const hEnd = buf.indexOf('\r\n\r\n', cursor);
    if (hEnd === -1) break;
    const headerText = buf.slice(cursor, hEnd).toString('utf8');
    const bodyStart = hEnd + 4;
    const next = buf.indexOf(Buffer.from('\r\n--' + boundary), bodyStart);
    let bodyEnd = next === -1 ? buf.length : next;
    if (next !== -1 && buf[bodyEnd - 2] === 13 && buf[bodyEnd - 1] === 10) bodyEnd -= 2;
    const headers = {};
    headerText.split('\r\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    parts.push({ headers, body: buf.slice(bodyStart, bodyEnd) });
    pos = next === -1 ? buf.length : next + 1;
  }
  return parts;
}

/* ------------------------------ 业务处理 ------------------------------ */

function handleApi(req, res, url) {
  const method = req.method;
  const pathname = url.pathname;
  req.query = url.searchParams;

  // —— 登录 / 登出 / 会话 ——
  if (method === 'POST' && pathname === '/api/login') return apiStudentLogin(req, res);
  if (method === 'POST' && pathname === '/api/admin/login') return apiAdminLogin(req, res);
  if (method === 'POST' && pathname === '/api/logout') return apiLogout(req, res);
  if (method === 'GET' && pathname === '/api/me') return apiMe(req, res);

  // —— 学生端 ——
  if (method === 'GET' && pathname === '/api/courses') return apiCourses(req, res);
  if (method === 'POST' && pathname === '/api/select') return apiSelect(req, res);
  if (method === 'POST' && pathname === '/api/cancel') return apiCancel(req, res);

  // —— 管理员端 ——
  if (method === 'GET' && pathname === '/api/admin/users') return apiAdminUsers(req, res);
  if (method === 'POST' && pathname === '/api/admin/users') return apiAdminAddUser(req, res);
  if (method === 'POST' && pathname === '/api/admin/users/batch') return apiAdminBatch(req, res);
  if (method === 'POST' && pathname.match(/^\/api\/admin\/users\/[^/]+\/password$/)) {
    const id = decodeURIComponent(pathname.split('/')[4]);
    return apiAdminResetPassword(req, res, id);
  }
  if (method === 'DELETE' && pathname.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const id = decodeURIComponent(pathname.split('/')[4]);
    return apiAdminDeleteUser(req, res, id);
  }
  if (method === 'GET' && pathname === '/api/admin/courses') return apiAdminCourses(req, res);
  if (method === 'POST' && pathname === '/api/admin/courses') return apiAdminAddCourse(req, res);
  if (method === 'DELETE' && pathname.match(/^\/api\/admin\/courses\/[^/]+$/)) {
    const id = decodeURIComponent(pathname.split('/')[4]);
    return apiAdminDeleteCourse(req, res, id);
  }
  if (method === 'GET' && pathname === '/api/admin/selections') return apiAdminSelections(req, res);
  if (method === 'GET' && pathname === '/api/admin/export') return apiAdminExport(req, res);
  if (method === 'POST' && pathname === '/api/admin/password') return apiAdminChangePassword(req, res);

  sendJson(res, 404, { ok: false, error: '接口不存在' });
}

async function apiStudentLogin(req, res) {
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) return fail(res, httpError(400, '请输入用户名和密码'));
  const user = findUserByName(username);
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return fail(res, httpError(401, '用户名或密码错误'));
  }
  const token = createSession({ role: 'student', username: user.username, userId: user.id });
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': cookieHeader(token),
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ ok: true, role: 'student', username: user.username }));
}

async function apiAdminLogin(req, res) {
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) return fail(res, httpError(400, '请输入管理员账号和密码'));
  if (username !== ADMIN_USERNAME || !verifyPassword(password, db.admin.salt, db.admin.hash)) {
    return fail(res, httpError(401, '管理员账号或密码错误'));
  }
  const token = createSession({ role: 'admin', username: ADMIN_USERNAME });
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': cookieHeader(token),
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ ok: true, role: 'admin', username: ADMIN_USERNAME }));
}

function apiLogout(req, res) {
  destroySession(parseCookies(req).sid);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': clearCookieHeader(),
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ ok: true }));
}

function apiMe(req, res) {
  const s = getSession(req);
  if (!s) return sendJson(res, 401, { ok: false, error: '未登录' });
  ok(res, { role: s.role, username: s.username });
}

/* 学生端 */
function apiCourses(req, res) {
  const s = requireRole('student')(req, res);
  const mySel = selectionOf(s.userId);
  const courses = db.courses.map(c => {
    const enrolled = enrolledCount(c.id);
    return {
      id: c.id, name: c.name, teacher: c.teacher, location: c.location,
      capacity: c.capacity, description: c.description || '',
      enrolled, full: enrolled >= c.capacity,
      selected: !!(mySel && mySel.courseId === c.id)
    };
  });
  ok(res, {
    courses,
    mySelection: mySel ? { courseId: mySel.courseId, selectedAt: mySel.selectedAt } : null
  });
}

async function apiSelect(req, res) {
  const s = requireRole('student')(req, res);
  const body = await readJson(req);
  const course = courseById(String(body.courseId || ''));
  if (!course) return fail(res, httpError(404, '课程不存在或已删除'));
  const mySel = selectionOf(s.userId);
  if (mySel && mySel.courseId === course.id) return ok(res, { message: '你已选择该课程' });
  if (enrolledCount(course.id) >= course.capacity) {
    return fail(res, httpError(400, '该课程名额已满'));
  }
  if (mySel) db.selections = db.selections.filter(x => x.userId !== s.userId);
  db.selections.push({ userId: s.userId, courseId: course.id, selectedAt: nowIso() });
  saveDb();
  ok(res, { message: '选课成功：' + course.name });
}

function apiCancel(req, res) {
  const s = requireRole('student')(req, res);
  db.selections = db.selections.filter(x => x.userId !== s.userId);
  saveDb();
  ok(res, { message: '已取消选课' });
}

/* 管理员端 */
function apiAdminUsers(req, res) {
  requireRole('admin')(req, res);
  const search = String(req.query.get('search') || '').trim().toLowerCase();
  const courseNames = new Map(db.courses.map(c => [c.id, c.name]));
  let users = db.users.slice().sort((a, b) => a.username.localeCompare(b.username, 'zh'));
  if (search) users = users.filter(u => u.username.toLowerCase().includes(search));
  const list = users.map(u => {
    const sel = selectionOf(u.id);
    return {
      id: u.id, username: u.username, createdAt: u.createdAt,
      courseName: sel && courseNames.get(sel.courseId) ? courseNames.get(sel.courseId) : null
    };
  });
  ok(res, { users: list, total: db.users.length });
}

async function apiAdminAddUser(req, res) {
  requireRole('admin')(req, res);
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!validUsername(username)) return fail(res, httpError(400, '用户名格式不正确（1-50位，不能包含空格、：或；）'));
  if (!validPassword(password)) return fail(res, httpError(400, '密码不能为空且长度不能超过 64 位'));
  if (findUserByName(username)) return fail(res, httpError(409, '用户名“' + username + '”已存在'));
  const user = buildUser(username, password);
  db.users.push(user);
  saveDb();
  ok(res, { user: { id: user.id, username: user.username, createdAt: user.createdAt } });
}

async function apiAdminBatch(req, res) {
  requireRole('admin')(req, res);
  const ctype = req.headers['content-type'] || '';
  const m = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!m) return fail(res, httpError(400, '上传格式错误'));
  const boundary = m[1] || m[2];
  const buf = await readBody(req, 20 * 1024 * 1024);
  const parts = parseMultipart(buf, boundary);
  const filePart = parts.find(p => {
    const cd = p.headers['content-disposition'] || '';
    return /name="file"/.test(cd);
  });
  if (!filePart) return fail(res, httpError(400, '未收到文件，请选择 .txt 或 .xlsx 文件'));
  const cd = filePart.headers['content-disposition'] || '';
  const fm = cd.match(/filename="?([^"]*)"?/i);
  const filename = fm ? path.basename(fm[1] || '') : '';
  let parsed;
  if (/\.xlsx$/i.test(filename)) {
    try {
      parsed = parseTableRows(xlsx.xlsxToRows(filePart.body));
    } catch (e) {
      return fail(res, httpError(400, '读取 xlsx 失败：' + e.message));
    }
  } else if (/\.txt$/i.test(filename)) {
    parsed = parseAccountText(decodeText(filePart.body));
  } else {
    return fail(res, httpError(400, '请选择 .txt 文本文档或 .xlsx 表格'));
  }
  parsed.created.forEach(u => db.users.push(u));
  saveDb();
  ok(res, {
    created: parsed.created.map(u => u.username),
    skipped: parsed.skipped,
    invalid: parsed.invalid,
    filename
  });
}
function apiAdminDeleteUser(req, res, id) {
  requireRole('admin')(req, res);
  const user = db.users.find(u => u.id === id);
  if (!user) return fail(res, httpError(404, '用户不存在'));
  db.users = db.users.filter(u => u.id !== id);
  db.selections = db.selections.filter(x => x.userId !== id);
  saveDb();
  ok(res, { message: '已删除用户“' + user.username + '”' });
}

async function apiAdminResetPassword(req, res, id) {
  requireRole('admin')(req, res);
  const user = db.users.find(u => u.id === id);
  if (!user) return fail(res, httpError(404, '用户不存在'));
  const body = await readJson(req);
  const password = String(body.password || '');
  if (!validPassword(password)) return fail(res, httpError(400, '密码不能为空且长度不能超过 64 位'));
  user.salt = newSalt();
  user.hash = hashPassword(password, user.salt);
  saveDb();
  ok(res, { message: '已重置用户“' + user.username + '”的密码' });
}

function apiAdminCourses(req, res) {
  requireRole('admin')(req, res);
  const courses = db.courses.map(c => Object.assign({}, c, { enrolled: enrolledCount(c.id) }));
  ok(res, { courses });
}

async function apiAdminAddCourse(req, res) {
  requireRole('admin')(req, res);
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const teacher = String(body.teacher || '').trim();
  const location = String(body.location || '').trim();
  const description = String(body.description || '').trim();
  const capacity = Math.floor(Number(body.capacity));
  if (!name || !teacher || !location) return fail(res, httpError(400, '请填写课程名称、授课教师和上课地点'));
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 2000) {
    return fail(res, httpError(400, '人数上限需为 1-2000 的整数'));
  }
  const course = {
    id: uid('c'), name, teacher, location, capacity, description, createdAt: nowIso()
  };
  db.courses.push(course);
  saveDb();
  ok(res, { course });
}

function apiAdminDeleteCourse(req, res, id) {
  requireRole('admin')(req, res);
  const course = courseById(id);
  if (!course) return fail(res, httpError(404, '课程不存在'));
  db.courses = db.courses.filter(c => c.id !== id);
  db.selections = db.selections.filter(x => x.courseId !== id);
  saveDb();
  ok(res, { message: '已删除课程“' + course.name + '”，该课程选课记录已清除' });
}

function apiAdminSelections(req, res) {
  requireRole('admin')(req, res);
  const courseMap = new Map(db.courses.map(c => [c.id, c]));
  const userMap = new Map(db.users.map(u => [u.id, u]));
  const rows = db.selections.slice().map(s => ({
    userId: s.userId,
    username: userMap.get(s.userId) ? userMap.get(s.userId).username : '(已删除用户)',
    courseId: s.courseId,
    courseName: courseMap.get(s.courseId) ? courseMap.get(s.courseId).name : '(已删除课程)',
    selectedAt: s.selectedAt
  }));
  const stats = db.courses.map(c => ({
    courseId: c.id, courseName: c.name, teacher: c.teacher,
    capacity: c.capacity, enrolled: enrolledCount(c.id)
  }));
  ok(res, { rows, stats });
}

function apiAdminExport(req, res) {
  requireRole('admin')(req, res);
  const body = JSON.stringify(db, null, 2);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="data-backup.json"',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function apiAdminChangePassword(req, res) {
  requireRole('admin')(req, res);
  const body = await readJson(req);
  const oldPassword = String(body.oldPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!verifyPassword(oldPassword, db.admin.salt, db.admin.hash)) {
    return fail(res, httpError(400, '原密码不正确'));
  }
  if (!validPassword(newPassword)) return fail(res, httpError(400, '新密码不能为空且长度不能超过 64 位'));
  if (newPassword === oldPassword) return fail(res, httpError(400, '新密码不能与原密码相同'));
  db.admin.salt = newSalt();
  db.admin.hash = hashPassword(newPassword, db.admin.salt);
  saveDb();
  ok(res, { message: '管理员密码已修改' });
}

/* ------------------------------ 静态资源 ------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: '方法不允许' });
    return;
  }
  const alias = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/admin': 'admin-login.html',
    '/admin/': 'admin-login.html',
    '/admin-login.html': 'admin-login.html',
    '/student': 'student.html',
    '/student/': 'student.html',
    '/student.html': 'student.html',
    '/console': 'admin.html',
    '/console/': 'admin.html',
    '/admin.html': 'admin.html'
  };
  const rel = (alias[pathname] || pathname).replace(/^\/+/, '');
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return sendJson(res, 403, { ok: false, error: '禁止访问' });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendJson(res, 404, { ok: false, error: '页面不存在' });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ------------------------------ 服务器 ------------------------------ */

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: '无效的请求地址' });
  }
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    fail(res, err);
  }
});

function listLanIps() {
  const ips = [];
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(name => {
    (ifs[name] || []).forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    });
  });
  return ips;
}

/* ------------------------------ 命令行工具 ------------------------------ */

if (process.argv[2] === 'reset-admin') {
  loadDb();
  db.admin = buildAdmin(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD);
  saveDb();
  console.log('管理员密码已重置为默认值: ' + ADMIN_DEFAULT_PASSWORD);
  process.exit(0);
}

loadDb();

server.listen(PORT, HOST, () => {
  console.log('==============================================');
  console.log(' 淮北市实验高级中学 · 体育课选课系统');
  console.log('----------------------------------------------');
  console.log(' 学生登录页: http://localhost:' + PORT + '/');
  console.log(' 管理员入口: http://localhost:' + PORT + '/admin');
  console.log(' 管理员账号: ' + ADMIN_USERNAME + '  密码: ' + ADMIN_DEFAULT_PASSWORD);
  console.log(' 演示学生号: demo  密码: 123456');
  listLanIps().forEach(ip => console.log(' 局域网访问: http://' + ip + ':' + PORT + '/'));
  console.log(' 数据文件:   ' + DATA_FILE);
  console.log('----------------------------------------------');
  console.log(' 按 Ctrl+C 停止服务');
  console.log('==============================================');
});

