/* 静态演示版登录：账号来自 localStorage */
(function () {
  var form = $('#login-form');
  var usernameInput = $('#username');
  var passwordInput = $('#password');
  var errorBox = $('#auth-error');
  var submitBtn = $('#submit-btn');
  var eyeBtn = $('#eye-btn');

  function showError(msg) { errorBox.textContent = msg; errorBox.classList.add('show'); }
  function clearError() { errorBox.classList.remove('show'); }

  if (eyeBtn) eyeBtn.addEventListener('click', function () {
    var isPwd = passwordInput.type === 'password';
    passwordInput.type = isPwd ? 'text' : 'password';
    eyeBtn.textContent = isPwd ? '🙈' : '👁';
  });
  var adminEntry = $('#admin-entry');
  if (adminEntry) adminEntry.addEventListener('click', function () { location.href = 'admin.html'; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    var u = usernameInput.value.trim();
    var p = passwordInput.value;
    if (!u) { showError('请输入用户名'); usernameInput.focus(); return; }
    if (!p) { showError('请输入密码'); passwordInput.focus(); return; }
    var db = Store.load();
    var found = db.users.some(function (x) { return x.u === u && x.p === p; });
    if (!found) {
      showError('用户名或密码错误（演示账号 demo / 123456）');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }
    try { sessionStorage.setItem('pe_student', u); } catch (err) { /* ignore */ }
    location.href = 'student.html';
  });
})();
