/* 登录页通用逻辑：读取 body 上的 data-login-api / data-redirect */
(function () {
  var api = document.body.getAttribute('data-login-api') || '/api/login';
  var redirect = document.body.getAttribute('data-redirect') || '/';

  var form = $('#login-form');
  var usernameInput = $('#username');
  var passwordInput = $('#password');
  var errorBox = $('#auth-error');
  var submitBtn = $('#submit-btn');
  var eyeBtn = $('#eye-btn');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function clearError() { errorBox.classList.remove('show'); }

  if (eyeBtn) {
    eyeBtn.addEventListener('click', function () {
      var isPwd = passwordInput.type === 'password';
      passwordInput.type = isPwd ? 'text' : 'password';
      eyeBtn.textContent = isPwd ? '🙈' : '👁';
    });
  }

  var adminEntry = $('#admin-entry');
  if (adminEntry) {
    adminEntry.addEventListener('click', function () { location.href = '/admin'; });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();
    var username = usernameInput.value.trim();
    var password = passwordInput.value;
    if (!username) { showError('请输入用户名'); usernameInput.focus(); return; }
    if (!password) { showError('请输入密码'); passwordInput.focus(); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中…';
    try {
      await apiFetch(api, { body: { username: username, password: password } });
      location.href = redirect;
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '登 录';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
})();
