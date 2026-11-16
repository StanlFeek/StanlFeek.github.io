/**
 * 全站顶部弹幕
 * 数据源：留言板已通过的留言（/api/comments?path=/guestbook/）
 * 出现范围：除首页（首屏）与后台外的所有页面；弹幕条本身占位，不遮正文
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-dm-global]");
  if (!root) return;

  // 后台不做弹幕
  if (document.querySelector("[data-admin]")) {
    root.remove();
    return;
  }

  // 留言板本身有完整弹幕框，这里不重复
  if (/^\/(en\/)?guestbook\/?$/.test(location.pathname)) {
    root.remove();
    return;
  }

  var stage = root.querySelector(".dm-global-stage");
  var toggle = root.querySelector(".dm-global-toggle");
  var STORE = "dm-global-off";
  var CACHE_KEY = "dm-global-cache";
  var CACHE_TTL = 5 * 60 * 1000;

  // 「减少动态效果」不再整层移除：那条分支会把右下角开关一起删掉，
  // 页面上就再无入口能把弹幕打开（留言板走的是独立的 danmaku.js，所以会
  // 表现为「只有留言板还有弹幕」）。现在只把默认状态设为关，开关保持可见。
  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 也不再读 navigator.connection.saveData / 2g：
  // 一个 5 分钟本地缓存的评论请求省不了多少流量，却会让弹幕在弱网下整层消失。

  function readStore() {
    try {
      return localStorage.getItem(STORE);
    } catch (e) {
      return null;
    }
  }

  var stored = readStore();
  var off = stored === "1";
  // 系统要求减少动效、且用户从未表过态时，默认关；用户点过开关则尊重其选择
  if (reduced && stored === null) off = true;

  // 自助开关：?dm=1 强制开、?dm=0 强制关，不必清 localStorage
  try {
    var force = new URLSearchParams(location.search).get("dm");
    if (force === "1") off = false;
    else if (force === "0") off = true;
  } catch (e) {}

  var items = [];
  var lanes = [];
  var laneH = 46; // 每 46px 一条轨道，铺满整页
  var timer = null;
  var cursor = 0;

  var palette = [
    "#49b1f5",
    "#4dd2a0",
    "#f5a65b",
    "#c08af0",
    "#ef7c8e",
    "#5fc9d8",
    "#8fa8f0",
  ];

  function colorFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
    return palette[h % palette.length];
  }

  function measureLanes() {
    var h = stage.clientHeight || window.innerHeight || 800;
    var n = Math.max(3, Math.floor((h - 80) / laneH));
    lanes = [];
    for (var i = 0; i < n; i++) lanes.push(-Infinity);
  }

  function pickLane(now) {
    var free = [];
    for (var i = 0; i < lanes.length; i++) {
      if (lanes[i] <= now) free.push(i);
    }
    if (!free.length) return -1;
    var lane = free[Math.floor(Math.random() * free.length)];
    // 同一条轨道上两条之间留出足够间距，避免叠在一起
    lanes[lane] = now + 3200;
    return lane;
  }

  function spawn() {
    if (!items.length) return;
    var data = items[cursor % items.length];
    cursor++;

    var now = Date.now();
    var lane = pickLane(now);
    if (lane < 0) return;

    var node = document.createElement("span");
    node.className = "dm-item";
    node.style.top = 72 + lane * laneH + "px";

    var name = document.createElement("span");
    name.className = "dm-name";
    name.textContent = data.nickname;
    name.style.color = colorFor(data.nickname);
    node.appendChild(name);
    node.appendChild(document.createTextNode(data.content));

    var width = root.clientWidth || 800;
    node.style.setProperty("--dm-travel", width + 200 + "px");
    node.style.setProperty("--dm-dur", 17 + Math.random() * 6 + "s");

    stage.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 21000);
  }

  function start() {
    // 容器永远不藏：开关住在容器里，藏容器等于把开关一起藏了
    root.hidden = false;
    if (off || !items.length) {
      root.classList.add("is-off");
      return;
    }
    root.classList.remove("is-off");
    measureLanes();
    spawn();
    var loop = function () {
      spawn();
      timer = setTimeout(loop, 1500 + Math.random() * 1300);
    };
    timer = setTimeout(loop, 1200);
  }

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
    stage.textContent = "";
    // 只藏舞台（.dm-global.is-off .dm-global-stage{display:none}），
    // 不设 root.hidden —— 否则右下角开关跟着消失，用户再也打不开弹幕
    root.classList.add("is-off");
  }

  function paintToggle() {
    root.classList.toggle("is-off", off);
    toggle.textContent = off ? "弹幕 关" : "弹幕 开";
    toggle.setAttribute("aria-pressed", off ? "false" : "true");
    toggle.title = off
      ? reduced
        ? "系统开启了「减少动态效果」，点一下仍可强制打开弹幕"
        : "点一下打开全站弹幕"
      : "点一下关闭全站弹幕";
  }

  toggle.addEventListener("click", function () {
    off = !off;
    try {
      localStorage.setItem(STORE, off ? "1" : "0");
    } catch (e) {}
    paintToggle();
    if (off) stop();
    else start();
  });

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.t || Date.now() - obj.t > CACHE_TTL) return null;
      return obj.items;
    } catch (e) {
      return null;
    }
  }

  function writeCache(list) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items: list }));
    } catch (e) {}
  }

  function normalize(list) {
    var out = [];
    (list || []).forEach(function (c) {
      var nickname = (c && c.nickname) || "匿名";
      var content = (c && c.content) || "";
      if (!content) return;
      if (content.length > 42) content = content.slice(0, 42) + "…";
      out.push({ nickname: nickname.slice(0, 12), content: content });
    });
    return out;
  }

  function load() {
    var cached = readCache();
    if (cached && cached.length) {
      items = cached;
      start();
      return;
    }
    fetch("/api/comments?path=%2Fguestbook%2F&limit=40", {
      headers: { accept: "application/json" },
    })
      .then(function (r) {
        return r.text();
      })
      .then(function (text) {
        if (!text || text.charAt(0) === "<") return null; // 站点切换中的兜底
        var data = JSON.parse(text);
        return normalize(data.items);
      })
      .then(function (list) {
        if (!list || !list.length) return;
        items = list;
        writeCache(list);
        start();
      })
      .catch(function () {});
  }

  // 容器一开始就放出来：保证右下角开关始终存在。
  // 之前 off 或弱网时整层被移除/隐藏，开关跟着消失，页面上再无入口。
  root.hidden = false;
  paintToggle();

  // header 高度会随字号/换行变化，量出来喂给 sticky 偏移
  function syncHeaderHeight() {
    var hdr = document.querySelector(".header");
    if (!hdr) return;
    var h = Math.round(hdr.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--hdr-h", h + "px");
  }

  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);

  // 首屏（intro）期间不显示，进入博客后再出现
  function introVisible() {
    var intro = document.getElementById("site-intro");
    if (!intro) return false;
    if (intro.hasAttribute("hidden")) return false;
    return getComputedStyle(intro).display !== "none";
  }

  document.addEventListener("stanl:intro-done", function () {
    syncHeaderHeight();
    if (off) return;
    load();
  });

  if (!introVisible()) load();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (timer) clearTimeout(timer);
      timer = null;
    } else if (!off && items.length) {
      start();
    }
  });
})();
