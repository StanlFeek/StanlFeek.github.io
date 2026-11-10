/**
 * stanl.top 动态能力前端脚本
 * 由 layouts/_partials/extend_footer.html 引入，只在需要的页面激活。
 *
 * 约定：
 *   浏览量  <span data-pageviews>…</span>
 *   留言区  <div data-comments data-path="/guestbook/"></div>
 *   友链表单 <form data-link-form> …
 */
(function () {
  "use strict";

  var API = "/api";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtDate(s) {
    // "2026-11-10 15:42:10"（D1 的 datetime('now') 是 UTC）
    var d = new Date(s.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return s;
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  /* ── 浏览量 ───────────────────────────────────────────── */
  function initPageviews() {
    qsa("[data-pageviews]").forEach(function (node) {
      var path = node.getAttribute("data-path") || location.pathname;

      fetch(API + "/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: path }),
      })
        .then(function (r) {
          return r.ok ? r.json() : Promise.reject(r.status);
        })
        .then(function (d) {
          node.textContent = (d.views || 0).toLocaleString() + " 次浏览";
        })
        .catch(function () {
          node.textContent = "";
        });
    });
  }

  /* ── 留言板 ───────────────────────────────────────────── */
  function initComments() {
    qsa("[data-comments]").forEach(function (root) {
      var path = root.getAttribute("data-path") || location.pathname;
      var listBox = el("div", "c-list");
      var form = el("form", "c-form");

      root.appendChild(listBox);
      root.appendChild(form);

      // 列表
      function load() {
        listBox.textContent = "加载中…";
        fetch(API + "/comments?path=" + encodeURIComponent(path) + "&limit=100")
          .then(function (r) {
            return r.json();
          })
          .then(function (d) {
            listBox.textContent = "";
            if (!d.items || !d.items.length) {
              listBox.appendChild(el("p", "c-empty", "还没有留言，来说点什么吧。"));
              return;
            }
            d.items.forEach(function (item) {
              var card = el("div", "c-item");

              var head = el("div", "c-head");
              var nameEl = item.website ? el("a", "c-name") : el("span", "c-name");
              nameEl.textContent = item.nickname;
              if (item.website) {
                nameEl.setAttribute("href", item.website);
                nameEl.setAttribute("rel", "nofollow noopener ugc");
                nameEl.setAttribute("target", "_blank");
              }
              head.appendChild(nameEl);
              head.appendChild(el("time", "c-time", fmtDate(item.created_at)));
              card.appendChild(head);

              if (item.reply_content) {
                var quote = el("blockquote", "c-reply");
                quote.textContent = item.reply_content;
                card.appendChild(quote);
              }

              var body = el("div", "c-body");
              body.textContent = item.content;
              card.appendChild(body);

              listBox.appendChild(card);
            });
          })
          .catch(function () {
            listBox.textContent = "加载失败，稍后再试。";
          });
      }

      // 表单
      function field(name, label, type, required) {
        var wrap = el("label", "c-field");
        wrap.appendChild(el("span", "c-label", label));
        var input = el(type === "textarea" ? "textarea" : "input", "c-input");
        input.name = name;
        if (type !== "textarea") input.type = type;
        if (type === "textarea") input.rows = 4;
        if (required) input.required = true;
        wrap.appendChild(input);
        return wrap;
      }

      form.appendChild(field("nickname", "昵称 *", "text", true));
      form.appendChild(field("email", "邮箱（可选，不公开）", "email", false));
      form.appendChild(field("website", "网址（可选）", "url", false));
      form.appendChild(field("content", "留言 *", "textarea", true));

      // 蜜罐
      var hp = el("input", "c-hp");
      hp.type = "text";
      hp.name = "hp";
      hp.tabIndex = -1;
      hp.autocomplete = "off";
      form.appendChild(hp);

      var submit = el("button", "c-submit", "发表");
      submit.type = "submit";
      form.appendChild(submit);

      var status = el("p", "c-status");
      form.appendChild(status);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {};
        qsa("input,textarea", form).forEach(function (i) {
          data[i.name] = i.value;
        });
        data.path = path;

        submit.disabled = true;
        status.textContent = "提交中…";

        fetch(API + "/comments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        })
          .then(function (r) {
            return r.json().then(function (d) {
              return { ok: r.ok, d: d };
            });
          })
          .then(function (res) {
            if (!res.ok) throw new Error(res.d.error || "提交失败");
            status.textContent = "已发布 ✓";
            form.reset();
            load();
          })
          .catch(function (err) {
            status.textContent = err.message || "提交失败";
          })
          .finally(function () {
            submit.disabled = false;
          });
      });

      load();
    });
  }

  /* ── 友链申请 ─────────────────────────────────────────── */
  function initLinkForm() {
    qsa("[data-link-form]").forEach(function (form) {
      var status = el("p", "c-status");
      form.appendChild(status);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {};
        qsa("input,textarea", form).forEach(function (i) {
          data[i.name] = i.value;
        });

        fetch(API + "/links", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        })
          .then(function (r) {
            return r.json().then(function (d) {
              return { ok: r.ok, d: d };
            });
          })
          .then(function (res) {
            if (!res.ok) throw new Error(res.d.error || "提交失败");
            status.textContent = "已提交，等待审核 ✓";
            form.reset();
          })
          .catch(function (err) {
            status.textContent = err.message || "提交失败";
          });
      });
    });
  }

  function boot() {
    try {
      initPageviews();
      initComments();
      initLinkForm();
    } catch (e) {
      if (window.console) console.warn("[dynamic]", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
