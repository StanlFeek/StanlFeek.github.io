/**
 * 账号前端：顶栏账号态 / 登录注册页 / 管理后台
 *
 * 约定：
 *   顶栏自动接管          本文件扫 #menu 里指向 /login/ 的链接
 *   登录注册页            <div data-auth></div>
 *   管理后台              <div data-admin></div>
 *
 * 全局：window.STANL_USER（未登录为 null）、window.STANL_AUTH_READY（Promise）
 */
(function () {
  "use strict";

  var API = "/api";
  var user = null;

  function qs(s, r) {
    return (r || document).querySelector(s);
  }
  function qsa(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    opts.headers = opts.headers || {};
    if (opts.body && typeof opts.body !== "string") {
      opts.headers["content-type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(API + path, opts).then(function (r) {
      return r.text().then(function (t) {
        var s = (t || "").trim();
        var d = {};
        if (!s) {
          d = {};
        } else if (s.charAt(0) === "<") {
          var bad = new Error("站点正在切换，接口暂时连不上。请按 Ctrl+F5 强制刷新，或过几分钟再试。");
          bad.code = "BAD_ORIGIN";
          throw bad;
        } else {
          try {
            d = JSON.parse(s);
          } catch (e) {
            var bad2 = new Error("站点正在切换，接口暂时连不上。请按 Ctrl+F5 强制刷新，或过几分钟再试。");
            bad2.code = "BAD_ORIGIN";
            throw bad2;
          }
        }
        if (!r.ok) {
          var err = new Error(d.message || d.error || "请求失败");
          err.data = d;
          throw err;
        }
        return d;
      });
    });
  }
  function fmt(s) {
    if (!s) return "";
    var d = new Date(String(s).replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return s;
    var p = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    return (
      d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " +
      p(d.getHours()) + ":" + p(d.getMinutes())
    );
  }

  /* ── 顶栏账号态 ─────────────────────────────────────── */
  function paintHeader() {
    var link = qs('#menu a[href$="/login/"]');
    if (!link) return;
    if (!link.getAttribute("data-label")) {
      link.setAttribute("data-label", link.textContent.trim());
    }
    if (user) {
      link.textContent = user.nickname;
      link.setAttribute("title", user.email);
    } else {
      link.textContent = link.getAttribute("data-label") || "登录";
      link.removeAttribute("title");
    }
  }

  /**
   * 账号面板：改密码 + 注销账号。登录页（已登录状态）和后台「账号」页共用。
   * host 是要塞进去的容器，opts.onDeleted 在注销成功后调用。
   */
  function accountBlocks(host, opts) {
    opts = opts || {};

    var pwCard = el("div", "auth-card");
    pwCard.appendChild(el("p", "admin-note", "修改密码后，其他设备上的登录会立即失效。"));

    function pwField(label, autocomplete) {
      var wrap = el("label", "auth-field");
      wrap.appendChild(el("span", "auth-label", label));
      var input = el("input", "auth-input");
      input.type = "password";
      input.autocomplete = autocomplete;
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    var f1 = pwField("当前密码", "current-password");
    var f2 = pwField("新密码（至少 8 位）", "new-password");
    var f3 = pwField("再输一次", "new-password");

    var pwBtn = el("button", "auth-btn", "更新密码");
    pwBtn.type = "button";
    var pwMsg = el("p", "auth-status");

    pwBtn.addEventListener("click", function () {
      pwMsg.className = "auth-status";
      pwMsg.textContent = "";
      if (f2.input.value.length < 8) {
        pwMsg.className = "auth-status bad";
        pwMsg.textContent = "新密码至少 8 位";
        return;
      }
      if (f2.input.value !== f3.input.value) {
        pwMsg.className = "auth-status bad";
        pwMsg.textContent = "两次输入的新密码不一样";
        return;
      }
      pwBtn.disabled = true;
      api("/auth/password", {
        method: "POST",
        body: { current: f1.input.value, next: f2.input.value },
      })
        .then(function (d) {
          pwMsg.className = "auth-status ok";
          pwMsg.textContent = d.message || "密码已更新";
          f1.input.value = "";
          f2.input.value = "";
          f3.input.value = "";
        })
        .catch(function (e) {
          pwMsg.className = "auth-status bad";
          pwMsg.textContent = e.message;
        })
        .then(function () {
          pwBtn.disabled = false;
        });
    });

    pwCard.appendChild(f1.wrap);
    pwCard.appendChild(f2.wrap);
    pwCard.appendChild(f3.wrap);
    pwCard.appendChild(pwBtn);
    pwCard.appendChild(pwMsg);
    host.appendChild(pwCard);

    /* 注销账号 */
    var delCard = el("div", "auth-card danger-zone");
    delCard.appendChild(el("h3", "danger-title", "注销账号"));
    delCard.appendChild(
      el(
        "p",
        "admin-note",
        "账号会被永久删除，无法恢复。你发过的留言会保留，但不再显示「已验证」标记。"
      )
    );

    var d1 = pwField("输入当前密码确认", "current-password");
    delCard.appendChild(d1.wrap);

    var delBtn = el("button", "auth-btn danger", "永久注销账号");
    delBtn.type = "button";
    var delMsg = el("p", "auth-status");

    var armed = false;
    delBtn.addEventListener("click", function () {
      delMsg.className = "auth-status";
      delMsg.textContent = "";
      if (!d1.input.value) {
        delMsg.className = "auth-status bad";
        delMsg.textContent = "请输入当前密码";
        return;
      }
      if (!armed) {
        armed = true;
        delBtn.textContent = "再点一次确认注销";
        delBtn.classList.add("armed");
        return;
      }
      delBtn.disabled = true;
      api("/auth/delete", { method: "POST", body: { password: d1.input.value } })
        .then(function (d) {
          window.STANL_USER = null;
          delMsg.className = "auth-status ok";
          delMsg.textContent = d.message || "账号已注销";
          if (opts.onDeleted) {
            opts.onDeleted();
          } else {
            setTimeout(function () {
              location.href = "/";
            }, 1200);
          }
        })
        .catch(function (e) {
          armed = false;
          delBtn.textContent = "永久注销账号";
          delBtn.classList.remove("armed");
          delBtn.disabled = false;
          delMsg.className = "auth-status bad";
          delMsg.textContent = e.message;
        });
    });

    delCard.appendChild(delBtn);
    delCard.appendChild(delMsg);
    host.appendChild(delCard);

    return pwMsg;
  }

  /* ── 登录 / 注册 ────────────────────────────────────── */
  function authPage(root) {
    root.textContent = "";

    if (user) {
      var card = el("div", "auth-card");
      card.appendChild(el("h2", "auth-h2", "已登录"));
      var dl = el("div", "auth-info");
      dl.appendChild(el("div", null, "昵称：" + user.nickname));
      dl.appendChild(el("div", null, "邮箱：" + user.email));
      dl.appendChild(el("div", null, "身份：" + (user.role === "admin" ? "管理员" : "普通用户")));
      card.appendChild(dl);

      var row = el("div", "auth-actions");
      if (user.role === "admin") {
        var adminLink = el("a", "auth-btn", "进入后台");
        adminLink.href = "/admin/";
        row.appendChild(adminLink);
      }
      var out = el("button", "auth-btn ghost", "退出登录");
      out.addEventListener("click", function () {
        api("/auth/logout", { method: "POST" }).then(function () {
          location.reload();
        });
      });
      row.appendChild(out);
      card.appendChild(row);
      root.appendChild(card);
      accountBlocks(root);
      return;
    }

    var tabs = el("div", "auth-tabs");
    var body = el("div", "auth-body");
    var status = el("p", "auth-status");

    var tabLogin = el("button", "auth-tab active", "登录");
    var tabReg = el("button", "auth-tab", "注册");
    tabs.appendChild(tabLogin);
    tabs.appendChild(tabReg);

    function field(name, label, type, extra) {
      var wrap = el("label", "auth-field");
      wrap.appendChild(el("span", "auth-label", label));
      var input = el("input", "auth-input");
      input.name = name;
      input.type = type || "text";
      if (extra) for (var k in extra) input.setAttribute(k, extra[k]);
      wrap.appendChild(input);
      return wrap;
    }

    function codeRow() {
      var wrap = el("label", "auth-field");
      wrap.appendChild(el("span", "auth-label", "邮箱验证码"));
      var row = el("div", "auth-code-row");
      var input = el("input", "auth-input");
      input.name = "code";
      input.type = "text";
      input.inputMode = "numeric";
      input.maxLength = 6;
      input.placeholder = "6 位数字";
      var btn = el("button", "auth-btn small", "获取验证码");
      btn.type = "button";
      btn.addEventListener("click", function () {
        var emailInput = qs('input[name="email"]', body);
        var email = emailInput ? emailInput.value.trim() : "";
        if (!email) {
          status.textContent = "先填邮箱";
          return;
        }
        btn.disabled = true;
        btn.textContent = "发送中…";
        api("/auth/send-code", { method: "POST", body: { email: email } })
          .then(function (d) {
            if (d.codeRequired) {
              status.textContent = "验证码已发送，请查收邮件";
              var left = 60;
              var t = setInterval(function () {
                left--;
                btn.textContent = left + "s";
                if (left <= 0) {
                  clearInterval(t);
                  btn.disabled = false;
                  btn.textContent = "重新获取";
                }
              }, 1000);
            } else {
              btn.disabled = false;
              btn.textContent = "获取验证码";
              status.textContent = "邮件服务未配置，直接注册即可（无需验证码）";
            }
          })
          .catch(function (e) {
            btn.disabled = false;
            btn.textContent = "获取验证码";
            status.textContent = e.message;
          });
      });
      row.appendChild(input);
      row.appendChild(btn);
      wrap.appendChild(row);
      return wrap;
    }

    var needCode = true;

    function renderLogin() {
      tabLogin.classList.add("active");
      tabReg.classList.remove("active");
      body.textContent = "";
      body.appendChild(field("email", "邮箱", "email", { autocomplete: "username" }));
      body.appendChild(field("password", "密码", "password", { autocomplete: "current-password" }));
      var btn = el("button", "auth-btn", "登录");
      btn.type = "submit";
      body.appendChild(btn);
      status.textContent = "";
    }

    function renderRegister() {
      tabReg.classList.add("active");
      tabLogin.classList.remove("active");
      body.textContent = "";
      body.appendChild(field("nickname", "昵称", "text", { maxlength: "24", placeholder: "显示在留言里" }));
      body.appendChild(field("email", "邮箱", "email", { autocomplete: "username" }));
      body.appendChild(field("password", "密码（至少 8 位）", "password", { autocomplete: "new-password" }));
      if (needCode) body.appendChild(codeRow());
      var btn = el("button", "auth-btn", "注册并登录");
      btn.type = "submit";
      body.appendChild(btn);
      status.textContent = "";
    }

    var mode = "login";
    tabLogin.addEventListener("click", function () {
      mode = "login";
      renderLogin();
    });
    tabReg.addEventListener("click", function () {
      mode = "register";
      renderRegister();
    });

    var form = el("form", "auth-form");
    form.appendChild(body);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      qsa("input", form).forEach(function (i) {
        data[i.name] = i.value;
      });
      status.textContent = "处理中…";
      var req =
        mode === "login"
          ? api("/auth/login", { method: "POST", body: data })
          : api("/auth/register", { method: "POST", body: data });
      req
        .then(function (d) {
          user = d.user;
          window.STANL_USER = user;
          status.textContent = "成功，正在跳转…";
          location.href = user.role === "admin" && mode === "login" ? "/admin/" : "/guestbook/";
        })
        .catch(function (e2) {
          status.textContent = e2.message;
        });
    });

    var card = el("div", "auth-card");
    card.appendChild(tabs);
    card.appendChild(form);
    card.appendChild(status);
    root.appendChild(card);

    renderLogin();

    // 注册是否需要验证码，问一次配置
    api("/auth/config")
      .then(function (d) {
        needCode = Boolean(d.codeRequired);
        if (mode === "register") renderRegister();
      })
      .catch(function () {});
  }

  /* ── 管理后台 ───────────────────────────────────────── */
  function adminPage(root) {
    root.textContent = "";
    if (!user || user.role !== "admin") {
      var p = el("p", "admin-note");
      p.innerHTML = '需要管理员身份，请先 <a href="/login/">登录</a>。';
      root.appendChild(p);
      return;
    }

    var stats = el("div", "admin-stats");
    var tabs = el("div", "auth-tabs");
    var panel = el("div", "admin-panel");
    var status = el("p", "auth-status");

    var views = {
      comments: { label: "留言审核", render: renderComments },
      links: { label: "友链审核", render: renderLinks },
      users: { label: "用户管理", render: renderUsers },
      account: { label: "账号", render: renderAccount },
    };
    var current = "comments";

    Object.keys(views).forEach(function (k) {
      var b = el("button", "auth-tab" + (k === current ? " active" : ""), views[k].label);
      b.addEventListener("click", function () {
        current = k;
        qsa(".auth-tab", tabs).forEach(function (x) {
          x.classList.remove("active");
        });
        b.classList.add("active");
        status.textContent = "";
        views[k].render();
      });
      tabs.appendChild(b);
    });

    root.appendChild(stats);
    root.appendChild(tabs);
    root.appendChild(panel);
    root.appendChild(status);

    function loadStats() {
      api("/admin/overview").then(function (d) {
        stats.textContent = "";
        [
          ["留言", d.comments],
          ["待审留言", d.pendingComments],
          ["友链申请", d.links],
          ["待审友链", d.pendingLinks],
          ["用户", d.users],
          ["总浏览", d.totalViews],
        ].forEach(function (pair) {
          var box = el("div", "admin-stat");
          box.appendChild(el("strong", null, String(pair[1])));
          box.appendChild(el("span", null, pair[0]));
          stats.appendChild(box);
        });
      }).catch(function () {});
    }

    function table(headers, rows, buildRow) {
      var t = el("table", "admin-table");
      var thead = el("thead");
      var tr = el("tr");
      headers.forEach(function (h) {
        tr.appendChild(el("th", null, h));
      });
      thead.appendChild(tr);
      t.appendChild(thead);
      var tbody = el("tbody");
      if (!rows.length) {
        var empty = el("tr");
        var td = el("td", "admin-empty", "暂无数据");
        td.colSpan = headers.length;
        empty.appendChild(td);
        tbody.appendChild(empty);
      }
      rows.forEach(function (row) {
        tbody.appendChild(buildRow(row));
      });
      t.appendChild(tbody);
      return t;
    }

    function btn(text, cls, onClick) {
      var b = el("button", "auth-btn tiny" + (cls ? " " + cls : ""), text);
      b.type = "button";
      b.addEventListener("click", onClick);
      return b;
    }

    function renderComments() {
      panel.textContent = "加载中…";
      api("/admin/comments?status=all&limit=200")
        .then(function (d) {
          panel.textContent = "";
          panel.appendChild(
            table(["ID", "页面", "昵称", "内容", "状态", "时间", "操作"], d.items, function (row) {
              var tr = el("tr");
              tr.appendChild(el("td", null, String(row.id)));
              tr.appendChild(el("td", "admin-dim", row.path));
              tr.appendChild(el("td", null, row.nickname + (row.user_id ? " ✔" : "")));
              var content = el("td", "admin-content", row.content);
              tr.appendChild(content);
              tr.appendChild(el("td", "admin-status " + row.status, row.status));
              tr.appendChild(el("td", "admin-dim", fmt(row.created_at).slice(0, 10)));
              var ops = el("td", "admin-ops");
              if (row.status !== "approved")
                ops.appendChild(btn("通过", "ok", function () { setComment(row.id, "approved"); }));
              if (row.status !== "spam")
                ops.appendChild(btn("垃圾", "", function () { setComment(row.id, "spam"); }));
              ops.appendChild(btn("删除", "danger", function () { delComment(row.id); }));
              tr.appendChild(ops);
              return tr;
            })
          );
        })
        .catch(function (e) {
          panel.textContent = e.message;
        });
    }

    function setComment(id, st) {
      api("/admin/comments", { method: "PATCH", body: { id: id, status: st } })
        .then(function () {
          status.textContent = "已更新 #" + id + " → " + st;
          renderComments();
          loadStats();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function delComment(id) {
      if (!confirm("删除留言 #" + id + "？")) return;
      api("/admin/comments?id=" + id, { method: "DELETE" })
        .then(function () {
          status.textContent = "已删除 #" + id;
          renderComments();
          loadStats();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function renderLinks() {
      panel.textContent = "加载中…";
      api("/admin/links?status=all&limit=200")
        .then(function (d) {
          panel.textContent = "";
          panel.appendChild(
            table(["ID", "名称", "地址", "介绍", "状态", "时间", "操作"], d.items, function (row) {
              var tr = el("tr");
              tr.appendChild(el("td", null, String(row.id)));
              tr.appendChild(el("td", null, row.name));
              var a = el("a", null, row.url);
              a.href = row.url;
              a.target = "_blank";
              a.rel = "noopener";
              var td = el("td");
              td.appendChild(a);
              tr.appendChild(td);
              tr.appendChild(el("td", "admin-dim", row.desc || ""));
              tr.appendChild(el("td", "admin-status " + row.status, row.status));
              tr.appendChild(el("td", "admin-dim", fmt(row.created_at).slice(0, 10)));
              var ops = el("td", "admin-ops");
              if (row.status !== "approved")
                ops.appendChild(btn("通过", "ok", function () { setLink(row.id, "approved"); }));
              if (row.status !== "rejected")
                ops.appendChild(btn("拒绝", "", function () { setLink(row.id, "rejected"); }));
              ops.appendChild(btn("删除", "danger", function () { delLink(row.id); }));
              tr.appendChild(ops);
              return tr;
            })
          );
          panel.appendChild(
            el("p", "admin-note", "通过后请把这条加到 data/links.yaml 才会出现在友链页。")
          );
        })
        .catch(function (e) {
          panel.textContent = e.message;
        });
    }

    function setLink(id, st) {
      api("/admin/links", { method: "PATCH", body: { id: id, status: st } })
        .then(function () {
          status.textContent = "已更新 #" + id + " → " + st;
          renderLinks();
          loadStats();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function delLink(id) {
      if (!confirm("删除友链申请 #" + id + "？")) return;
      api("/admin/links?id=" + id, { method: "DELETE" })
        .then(function () {
          renderLinks();
          loadStats();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function renderAccount() {
      panel.textContent = "";
      accountBlocks(panel, {
        onDeleted: function () {
          setTimeout(function () {
            location.href = "/";
          }, 1200);
        },
      });

      // 顺手给个退出登录的入口，改完密码不用再翻导航
      var out = el("button", "auth-btn ghost small", "退出登录");
      out.type = "button";
      out.addEventListener("click", function () {
        api("/auth/logout", { method: "POST" }).then(function () {
          location.href = "/";
        });
      });
      panel.appendChild(out);
    }

    function renderUsers() {
      panel.textContent = "加载中…";
      api("/admin/users")
        .then(function (d) {
          panel.textContent = "";
          panel.appendChild(
            table(["ID", "昵称", "邮箱", "身份", "状态", "留言", "注册时间", "操作"], d.items, function (row) {
              var tr = el("tr");
              tr.appendChild(el("td", null, String(row.id)));
              tr.appendChild(el("td", null, row.nickname));
              tr.appendChild(el("td", "admin-dim", row.email));
              tr.appendChild(el("td", null, row.role === "admin" ? "管理员" : "用户"));
              tr.appendChild(el("td", "admin-status " + row.status, row.status));
              tr.appendChild(el("td", null, String(row.comments)));
              tr.appendChild(el("td", "admin-dim", fmt(row.created_at).slice(0, 10)));
              var ops = el("td", "admin-ops");
              if (row.id === user.id) {
                ops.appendChild(el("span", "admin-dim", "（自己）"));
              } else {
                if (row.status === "active")
                  ops.appendChild(btn("停用", "danger", function () { setUser(row.id, { status: "banned" }); }));
                else
                  ops.appendChild(btn("恢复", "ok", function () { setUser(row.id, { status: "active" }); }));
                if (row.role === "user")
                  ops.appendChild(btn("设为管理员", "", function () { setUser(row.id, { role: "admin" }); }));
                else
                  ops.appendChild(btn("降为普通", "", function () { setUser(row.id, { role: "user" }); }));
                ops.appendChild(btn("重置密码", "", function () { resetPassword(row); }));
                ops.appendChild(btn("注销", "danger", function () { deleteUser(row); }));
              }
              tr.appendChild(ops);
              return tr;
            })
          );
        })
        .catch(function (e) {
          panel.textContent = e.message;
        });
    }

    function resetPassword(row) {
      var next = window.prompt("给 " + row.nickname + "（" + row.email + "）设置新密码，至少 8 位：");
      if (next === null) return;
      if (next.length < 8) {
        status.textContent = "新密码至少 8 位";
        return;
      }
      api("/admin/users", { method: "PATCH", body: { id: row.id, password: next } })
        .then(function () {
          status.textContent = "已重置 " + row.nickname + " 的密码，对方需要重新登录";
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function deleteUser(row) {
      if (
        !window.confirm(
          "永久删除 " + row.nickname + "（" + row.email + "）的账号？\n" +
            "账号无法恢复，其留言会保留但不再带「已验证」标记。"
        )
      )
        return;
      api("/admin/users?id=" + row.id, { method: "DELETE" })
        .then(function () {
          status.textContent = "已删除 " + row.nickname;
          renderUsers();
          loadStats();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    function setUser(id, patch) {
      patch.id = id;
      api("/admin/users", { method: "PATCH", body: patch })
        .then(function () {
          status.textContent = "已更新 #" + id;
          renderUsers();
        })
        .catch(function (e) {
          status.textContent = e.message;
        });
    }

    loadStats();
    renderComments();
  }

  /* ── 启动 ───────────────────────────────────────────── */
  function boot() {
    window.STANL_AUTH_READY = api("/auth/me")
      .then(function (d) {
        user = d.user || null;
      })
      .catch(function () {
        user = null;
      })
      .then(function () {
        window.STANL_USER = user;
        paintHeader();
        var a = qs("[data-auth]");
        if (a) authPage(a);
        var g = qs("[data-admin]");
        if (g) adminPage(g);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
