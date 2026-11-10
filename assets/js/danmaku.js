/**
 * 留言板弹幕
 *
 * 约定：<div data-danmaku data-path="/guestbook/"></div>
 * 数据来自 /api/comments（只取 approved），新留言通过 stanl:comment 事件即时飞入。
 */
(function () {
  "use strict";

  var API = "/api";
  var LANE_H = 34;
  var GAP_MS = 1500;
  var COLORS = ["#49b1f5", "#f2789f", "#f8b26a", "#7bd39a", "#9d8df1", "#f56c6c", "#3ec6c6"];

  function qsa(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }

  function colorFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
    return COLORS[h % COLORS.length];
  }

  function init(root) {
    var path = root.getAttribute("data-path") || location.pathname;
    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var stage = document.createElement("div");
    stage.className = "dm-stage";
    root.appendChild(stage);

    var bar = document.createElement("div");
    bar.className = "dm-bar";
    var title = document.createElement("span");
    title.className = "dm-bar-title";
    title.textContent = "留言弹幕";
    var count = document.createElement("span");
    count.className = "dm-bar-count";
    count.textContent = "";
    bar.appendChild(title);
    bar.appendChild(count);
    root.insertBefore(bar, stage);

    var empty = document.createElement("p");
    empty.className = "dm-empty";
    empty.textContent = "还没有弹幕，发一条试试。";
    root.appendChild(empty);

    var queue = [];
    var cursor = 0;
    var pending = [];
    var laneFree = [];
    var timer = null;

    function laneCount() {
      var h = stage.clientHeight || 260;
      return Math.max(3, Math.floor(h / LANE_H));
    }

    function pickLane() {
      var n = laneCount();
      if (laneFree.length !== n) {
        laneFree = new Array(n).fill(0);
      }
      var now = Date.now();
      var best = 0;
      var bestTime = Infinity;
      for (var i = 0; i < n; i++) {
        if (laneFree[i] <= now) return i;
        if (laneFree[i] < bestTime) {
          bestTime = laneFree[i];
          best = i;
        }
      }
      return best;
    }

    function fire(item) {
      if (!item || !item.content) return;
      empty.style.display = "none";

      var node = document.createElement("div");
      node.className = "dm-item";

      var name = document.createElement("span");
      name.className = "dm-name";
      name.textContent = item.nickname || "匿名";
      name.style.color = colorFor(String(item.nickname || ""));

      var text = document.createElement("span");
      text.className = "dm-text";
      text.textContent = item.content.length > 120 ? item.content.slice(0, 120) + "…" : item.content;

      node.appendChild(name);
      node.appendChild(text);

      var lane = pickLane();
      node.style.top = lane * LANE_H + 6 + "px";

      var width = stage.clientWidth || 800;
      var duration = Math.min(20, Math.max(8, 8 + text.textContent.length * 0.18));
      laneFree[lane] = Date.now() + duration * 1000 * 0.42;

      node.style.setProperty("--dm-from", width + "px");
      node.style.setProperty("--dm-dur", duration + "s");

      stage.appendChild(node);
      node.addEventListener("animationend", function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }

    function tick() {
      if (!queue.length) return;
      if (cursor >= queue.length) {
        // 一轮放完，重新洗牌
        queue = shuffle(queue);
        cursor = 0;
      }
      fire(queue[cursor++]);
    }

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }

    fetch(API + "/comments?path=" + encodeURIComponent(path) + "&limit=100")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        pending = (d.items || []).filter(function (x) {
          return x.content;
        });
        if (!pending.length) return;
        empty.style.display = "none";
        count.textContent = pending.length + " 条";
        if (reduced) {
          // 尊重「减少动态效果」：不做飘屏，直接列出来
          stage.classList.add("dm-static");
          pending.slice(0, 12).forEach(function (item) {
            var row = document.createElement("div");
            row.className = "dm-static-item";
            row.textContent = (item.nickname || "匿名") + "：" + item.content;
            stage.appendChild(row);
          });
          return;
        }
        queue = shuffle(pending);
        cursor = 0;
        timer = setInterval(tick, GAP_MS);
        tick();
      })
      .catch(function () {
        empty.textContent = "弹幕加载失败，稍后再试。";
      });

    // 新留言即时飞入
    document.addEventListener("stanl:comment", function (e) {
      var item = e.detail;
      if (!item) return;
      if (reduced) return;
      if (!timer) {
        timer = setInterval(tick, GAP_MS);
      }
      fire(item);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      } else if (!timer && queue.length && !reduced) {
        timer = setInterval(tick, GAP_MS);
      }
    });
  }

  function boot() {
    qsa("[data-danmaku]").forEach(function (root) {
      try {
        init(root);
      } catch (e) {
        if (window.console) console.warn("[danmaku]", e);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
