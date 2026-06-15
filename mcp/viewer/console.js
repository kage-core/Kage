(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  function src(name, fb) { return params.get(name) || fb; }
  var root = "./data/kage/reports/";
  var paths = {
    lifecycle: src("lifecycle", root + "lifecycle.json"),
    trust: src("trust", root + "trust.json"),
    suppressed: src("suppressed", root + "suppressed.json"),
    metrics: src("metrics", "./data/kage/metrics.json"),
    activity: src("activity", root + "activity.json"),
    value: src("value", root + "value.json"),
  };
  var state = { items: [], filter: "all", q: "", metrics: null, graphReady: false, showAll: false };

  // Theme-aware colors: the canvas graph and donut can't use CSS variables directly,
  // so resolve them once (and again when the OS light/dark preference flips).
  var THEME = {};
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function refreshTheme() {
    THEME = {
      gain: cssVar("--gain", "#0c7a4d"),
      warn: cssVar("--warn", "#9a6b08"),
      code: cssVar("--code", "#155e9c"),
      memory: cssVar("--memory", "#6d49b8"),
      ink: cssVar("--ink", "#1c1e1a"),
      muted: cssVar("--muted", "#5d635b"),
      faint: cssVar("--faint", "#8b9088"),
      paper: cssVar("--paper", "#fffdf9"),
      line: cssVar("--line-strong", "#c9c4b4"),
    };
  }
  refreshTheme();
  if (window.matchMedia) {
    var scheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (scheme.addEventListener) scheme.addEventListener("change", function () { refreshTheme(); renderInsights(state.metrics, state.items); });
  }

  function getJSON(p) { return fetch(p).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(n) {
    if (n == null || isNaN(n)) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function base(p) { return String(p).split("/").pop(); }
  // The daemon serves report params as absolute paths (.../<repo>/.agent_memory/...),
  // while project_dir is often "." (reports generated with `--project .`). Pull the
  // real repo name from the path; fall back to project_dir basename, then a default.
  function resolveRepoName(metrics, lifecycle) {
    var cands = [paths.lifecycle, paths.trust, paths.metrics, paths.suppressed];
    for (var i = 0; i < cands.length; i++) {
      var m = /\/([^/]+)\/\.agent_memory\//.exec(cands[i] || "");
      if (m && m[1]) return m[1];
    }
    if (metrics && metrics.repo) return metrics.repo;
    var pd = ((metrics && metrics.project_dir) || (lifecycle && lifecycle.project_dir) || "").replace(/\/+$/, "");
    var bn = pd.split("/").pop();
    if (bn && bn !== "." && bn !== "..") return bn;
    return "repository";
  }

  // ---- nav ----
  var META = {
    gains: ["kage://gains", "What Kage saved you", "Tokens, dollars, and bad memories caught — receipts, not vibes."],
    overview: ["kage://trust", "Memory trust", "Whether this repo's agent memory can be trusted — at a glance."],
    graph: ["kage://memory-map", "Memory ↔ code map", "Each packet anchored to the files it's grounded in. Hover a node to inspect."],
    memory: ["kage://memory", "Memory", "Every packet Kage has stored, with health and grounding."],
    activity: ["kage://activity", "Activity", "What agents actually recalled and captured here, over time."],
    insights: ["kage://insights", "Insights", "Health, composition, and what Kage has mapped in this repo."],
  };
  function show(name) {
    var btns = document.querySelectorAll("#nav button");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-current", btns[i].dataset.section === name ? "true" : "false");
    var secs = document.querySelectorAll(".section");
    for (var j = 0; j < secs.length; j++) secs[j].classList.toggle("active", secs[j].id === "section-" + name);
    var m = META[name] || META.overview;
    document.getElementById("eyebrow").textContent = m[0];
    document.getElementById("title").textContent = m[1];
    document.getElementById("subtitle").textContent = m[2];
    if (name === "graph" && !state.graphReady) { state.graphReady = true; setTimeout(initGraph, 30); }
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  }
  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-section]"); if (b) show(b.dataset.section);
  });

  // ---- load ----
  // Showcase mode: the bundled demo dataset (docs/viewer/data) carries showcase:true.
  // Its timestamps are frozen, so we slide them forward to "now" on load — the daily
  // chart and the feed stay current instead of aging into an empty 14-day window.
  // Real daemon data has no showcase flag and is never touched.
  function rebaseShowcase(activity, value) {
    if (!activity || !activity.showcase) return;
    var allAt = [];
    (activity.events || []).forEach(function (e) { if (e.at) allAt.push(Date.parse(e.at)); });
    if (value && value.events) value.events.forEach(function (e) { if (e.at) allAt.push(Date.parse(e.at)); });
    var latest = allAt.length ? Math.max.apply(null, allAt) : 0;
    if (!latest) return;
    var delta = Date.now() - latest;
    var dayDelta = Math.round(delta / 86400000);
    function shift(e) { if (e && e.at) e.at = new Date(Date.parse(e.at) + delta).toISOString(); }
    (activity.events || []).forEach(shift);
    if (value && value.events) value.events.forEach(shift);
    (activity.daily || []).forEach(function (d) {
      if (d.day) d.day = new Date(Date.parse(d.day + "T00:00:00Z") + dayDelta * 86400000).toISOString().slice(0, 10);
    });
  }

  Promise.all([getJSON(paths.trust), getJSON(paths.suppressed), getJSON(paths.lifecycle), getJSON(paths.metrics), getJSON(paths.activity), getJSON(paths.value)])
    .then(function (r) { rebaseShowcase(r[4], r[5]); render(r[0], r[1], r[2], r[3], r[4], r[5]); })
    .catch(function () { render(null, null, null, null, null, null); });

  function render(trust, suppressed, lifecycle, metrics, activity, value) {
    state.items = (lifecycle && lifecycle.items) || [];
    state.metrics = metrics || {};
    state.activity = activity || {};
    document.getElementById("repo").textContent = resolveRepoName(metrics, lifecycle);
    renderGains(value);
    renderHero(trust);
    renderTiles(metrics, state.items);
    renderAttention(state.items, suppressed);
    renderChips(); renderList();
    renderInsights(metrics, state.items);
    renderActivity(activity);
    var start = (location.hash || "").replace("#", "");
    show(META[start] ? start : "gains");
  }

  // ---- gains (value ledger receipts) ----
  // value.json is the raw ledger written by recall: { totals, events[] }. Windows are
  // recomputed here with the same rules as `kage gains` (today = local midnight,
  // 7d = rolling, all-time = totals so trimmed events never lose history).
  var DOLLARS_PER_MILLION_TOKENS = 15;
  function dollars(tokens) { return (tokens / 1e6) * DOLLARS_PER_MILLION_TOKENS; }
  function fmtDollars(tokens) {
    var d = dollars(tokens);
    return "$" + (d >= 100 ? Math.round(d) : d.toFixed(2));
  }
  function summarizeWindow(events, cutoff) {
    var w = { tokens_saved: 0, stale_withheld: 0, recalls: 0, caller_answers: 0 };
    events.forEach(function (e) {
      var at = Date.parse(e.at);
      if (!at || at < cutoff) return;
      if (e.kind === "recall_served") { w.recalls += 1; w.tokens_saved += Math.max(0, e.tokens_saved || 0); }
      else if (e.kind === "stale_withheld") w.stale_withheld += 1;
      else if (e.kind === "caller_answered") w.caller_answers += 1;
    });
    return w;
  }
  function renderGains(value) {
    var hero = document.getElementById("gainsHero");
    var tiles = document.getElementById("gainsTiles");
    var timeline = document.getElementById("gainsTimeline");
    if (!hero) return;
    var events = (value && value.events) || [];
    var totals = (value && value.totals) || null;
    var midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    var today = summarizeWindow(events, midnight.getTime());
    var week = summarizeWindow(events, Date.now() - 7 * 86400000);
    var all = totals || summarizeWindow(events, 0);

    hero.textContent = "";
    var head = el("div", "r-head");
    head.appendChild(el("span", null, "Kage · savings receipt"));
    head.appendChild(el("span", null, new Date().toISOString().slice(0, 10)));
    hero.appendChild(head);
    var hh = el("div", "r-hero");
    var big = el("div", "big");
    big.appendChild(el("b", null, all.tokens_saved ? "0" : "—"));
    big.appendChild(el("span", "unit", "tokens saved, all time"));
    if (all.tokens_saved) big.appendChild(el("span", "dollars", "≈ " + fmtDollars(all.tokens_saved)));
    hh.appendChild(big);
    hh.appendChild(el("p", "sub", all.tokens_saved
      ? "Context your agents did not have to re-read from source, because Kage served grounded memory instead."
      : "No savings recorded yet. Run kage recall or kage_context against this repo and the receipt fills in."));
    hero.appendChild(hh);
    var wins = el("div", "r-windows");
    [["Today", today], ["Last 7 days", week], ["All time", all]].forEach(function (p) {
      var w = el("div", "r-win");
      w.appendChild(el("div", "k", p[0]));
      w.appendChild(el("div", "v", fmt(p[1].tokens_saved) + " tok"));
      w.appendChild(el("div", "d", "≈ " + fmtDollars(p[1].tokens_saved)));
      wins.appendChild(w);
    });
    hero.appendChild(wins);
    var lines = el("div", "r-lines");
    [
      ["Recalls served from memory", fmt(all.recalls), "gain"],
      ["Stale memories caught & withheld", fmt(all.stale_withheld), all.stale_withheld ? "warn" : ""],
      ["Caller questions answered from the graph", fmt(all.caller_answers), ""],
    ].forEach(function (li) {
      var row = el("div", "r-line");
      row.appendChild(el("span", null, li[0]));
      row.appendChild(el("span", "dots"));
      row.appendChild(el("b", li[2], li[1]));
      lines.appendChild(row);
    });
    hero.appendChild(lines);
    hero.appendChild(el("div", "r-foot", "estimated at $" + DOLLARS_PER_MILLION_TOKENS + " per 1M input tokens · ledger: .agent_memory/reports/value.json · verify: kage gains"));
    if (all.tokens_saved) countUp(big.querySelector("b"), all.tokens_saved, 900);

    if (tiles) {
      tiles.textContent = "";
      [
        { k: "Saved (7 days)", v: fmt(week.tokens_saved), s: "≈ " + fmtDollars(week.tokens_saved) + " of context not re-read", cls: "green" },
        { k: "Recalls served (7d)", v: fmt(week.recalls), s: fmt(all.recalls) + " all-time", cls: "green" },
        { k: "Stale caught", v: fmt(all.stale_withheld), s: all.stale_withheld ? "withheld before they misled an agent" : "nothing withheld yet", cls: all.stale_withheld ? "warn" : "" },
        { k: "Graph answers", v: fmt(all.caller_answers), s: "caller questions answered from the code graph", cls: "code" },
      ].forEach(function (d) { var x = el("div", "tile"); x.appendChild(el("div", "k", d.k)); x.appendChild(el("div", "v " + (d.cls || ""), d.v)); x.appendChild(el("div", "s", d.s)); tiles.appendChild(x); });
    }

    if (timeline) {
      timeline.textContent = ""; timeline.className = "vfeed";
      if (!events.length) { timeline.appendChild(el("div", "empty", "No value events yet. Each recall, withheld stale memory, and graph answer lands here with a timestamp.")); return; }
      var V_ICON = { recall_served: "✓", stale_withheld: "⊘", caller_answered: "◆" };
      events.slice(-30).reverse().forEach(function (e) {
        var row = el("div", "vev " + (e.kind || ""));
        row.appendChild(el("span", "vi", V_ICON[e.kind] || "•"));
        var mid = el("div", "vt");
        if (e.kind === "recall_served") {
          mid.appendChild(document.createTextNode("Recall served — saved "));
          mid.appendChild(el("b", null, "~" + fmt(Math.max(0, e.tokens_saved || 0)) + " tokens"));
          mid.appendChild(document.createTextNode(" vs reading source"));
        } else if (e.kind === "stale_withheld") {
          mid.appendChild(document.createTextNode("Stale memory withheld"));
          if (e.packet_title) { mid.appendChild(document.createTextNode(" — ")); mid.appendChild(el("b", null, e.packet_title)); }
        } else {
          mid.appendChild(document.createTextNode("Caller question answered from the code graph"));
        }
        row.appendChild(mid);
        row.appendChild(el("span", "when", relTime(e.at)));
        timeline.appendChild(row);
      });
    }
  }

  // ---- activity feed (real recorded recalls + captures) ----
  function relTime(iso) {
    var t = Date.parse(iso); if (!t) return "";
    var s = (Date.now() - t) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
    return String(iso).slice(0, 10);
  }
  var EV_ICON = { recall: "↺", capture: "＋", supersede: "⇄", deprecate: "✕", update: "✎", promote: "▲", feedback: "✦", other: "•" };
  function renderActivity(activity) {
    var t = (activity && activity.totals) || { events: 0, recalls: 0, captures: 0, recalls_7d: 0 };
    var tiles = document.getElementById("activityTiles");
    if (tiles) {
      tiles.textContent = "";
      [
        { k: "Recalls (7 days)", v: fmt(t.recalls_7d), s: "agent memory pulls", cls: "green" },
        { k: "Total recalls", v: fmt(t.recalls), s: "all time, this machine", cls: "green" },
        { k: "Captures", v: fmt(t.captures), s: "memories written", cls: "memory" },
        { k: "Events", v: fmt(t.events), s: "in the activity log", cls: "" },
      ].forEach(function (d) { var x = el("div", "tile"); x.appendChild(el("div", "k", d.k)); x.appendChild(el("div", "v " + (d.cls || ""), d.v)); x.appendChild(el("div", "s", d.s)); tiles.appendChild(x); });
    }
    // recalls-per-day bars
    var daily = (activity && activity.daily) || [];
    var db = document.getElementById("activityDaily");
    if (db) {
      db.textContent = "";
      if (!daily.length) { db.appendChild(el("div", "empty", "No recalls recorded yet. Run kage recall / kage_context and they'll appear here.")); }
      var dmax = daily.reduce(function (a, b) { return Math.max(a, b.recalls); }, 1);
      daily.forEach(function (d) {
        var col = el("div", "col");
        col.appendChild(el("span", "v", String(d.recalls)));
        var bar = el("span", "bar" + (d.recalls ? "" : " empty")); col.appendChild(bar);
        col.appendChild(el("span", "d", d.day.slice(5)));
        db.appendChild(col);
        setTimeout(function () { bar.style.height = Math.max(3, d.recalls / dmax * 96) + "px"; }, 60);
      });
    }
    // feed
    var feed = document.getElementById("activityFeed");
    if (feed) {
      feed.textContent = ""; feed.className = "feed";
      var events = (activity && activity.events) || [];
      if (!events.length) { feed.appendChild(el("div", "empty", "Nothing recorded yet. As agents recall and capture memory, it streams in here.")); return; }
      events.forEach(function (e) {
        var row = el("div", "ev " + (e.kind || "other"));
        row.appendChild(el("span", "ei", EV_ICON[e.kind] || "•"));
        var mid = el("div");
        mid.appendChild(el("span", "et", e.title || e.kind));
        mid.appendChild(document.createTextNode(" "));
        mid.appendChild(el("span", "ek", e.kind === "recall" ? "recall" : (e.detail || e.kind)));
        row.appendChild(mid);
        row.appendChild(el("span", "when", relTime(e.at)));
        feed.appendChild(row);
      });
    }
  }

  // ---- hero ----
  function renderHero(trust) {
    var hero = document.getElementById("hero");
    var score = trust && typeof trust.trust_score === "number" ? trust.trust_score : null;
    var m = (trust && trust.metrics) || {};
    var status = score == null ? "idle" : (score >= 90 ? "ok" : score >= 70 ? "warn" : "alert");
    hero.setAttribute("data-status", status);
    var bars = [
      ["Hallucinated citations rejected", m.hallucinated_citation_rejection_rate],
      ["Stale memory excluded from recall", m.stale_memory_exclusion_rate],
      ["Live memory grounded to code", m.live_grounding_rate],
    ];
    var verdict = score == null ? "Run kage benchmark --trust to score this repo's memory." :
      status === "ok" ? "Agents recall only memory that is grounded in current code." :
      "Some memory needs review before agents should trust it.";
    var left = el("div");
    left.appendChild(el("span", "eyebrow", "Memory Trust"));
    var s = el("div", "score"); s.appendChild(el("b", null, score == null ? "—" : "0")); s.appendChild(el("span", null, "/100"));
    left.appendChild(s); left.appendChild(el("p", "verdict", verdict));
    var right = el("div", "bars");
    bars.forEach(function (b) {
      var has = !(b[1] == null || isNaN(b[1])); var v = has ? Math.max(0, Math.min(100, b[1])) : 0;
      var bar = el("div", "bar");
      bar.appendChild(el("span", "lbl", b[0])); bar.appendChild(el("b", "val", has ? v + "%" : "—"));
      var t = el("span", "track"), f = el("i"); t.appendChild(f); bar.appendChild(t);
      right.appendChild(bar); setTimeout(function () { f.style.width = v + "%"; }, 60);
    });
    hero.textContent = ""; hero.appendChild(left); hero.appendChild(right);
    if (score != null) countUp(s.querySelector("b"), score, 900);
  }
  function countUp(node, to, dur) {
    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / dur); var e = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(e * to); if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- overview tiles ----
  function counts(items) {
    var c = {}; items.forEach(function (i) { c[i.health] = (c[i.health] || 0) + 1; }); return c;
  }
  function renderTiles(metrics, items) {
    var cg = (metrics && metrics.code_graph) || {};
    var act = (state.activity && state.activity.totals) || {};
    var c = counts(items);
    var review = (c.stale || 0) + (c.disputed || 0) + (c.ungrounded || 0);
    var r7 = act.recalls_7d || 0;
    var data = [
      { k: "Memory packets", v: fmt(items.length), s: (c.hot || 0) + " hot · " + (c.healthy || 0) + " healthy", cls: "memory" },
      { k: "Needs review", v: fmt(review), s: review ? "stale or ungrounded" : "all current", cls: review ? "warn" : "green" },
      { k: "Files mapped", v: fmt(cg.files), s: fmt(cg.symbols) + " symbols indexed", cls: "code" },
      { k: "Recalls (7 days)", v: fmt(r7), s: r7 ? fmt(act.recalls || 0) + " all-time" : "no recalls yet", cls: r7 ? "green" : "" },
    ];
    var box = document.getElementById("tiles"); box.textContent = "";
    data.forEach(function (d) {
      var t = el("div", "tile"); t.appendChild(el("div", "k", d.k));
      t.appendChild(el("div", "v " + (d.cls || ""), d.v)); t.appendChild(el("div", "s", d.s)); box.appendChild(t);
    });
  }

  // ---- attention ----
  function renderAttention(items, suppressed) {
    var att = [];
    items.forEach(function (i) {
      if (["stale", "disputed", "ungrounded"].indexOf(i.health) !== -1 || i.severity === "blocker")
        att.push({ title: i.title, why: i.reason || (i.stale_reasons && i.stale_reasons[0]) || i.recommended_action, tag: i.health });
    });
    ((suppressed && suppressed.items) || []).forEach(function (s) {
      if (!att.some(function (a) { return a.title === s.title; })) att.push({ title: s.title, why: s.reason, tag: "withheld" });
    });
    var mount = document.getElementById("attentionMount"); mount.textContent = "";
    if (!att.length) {
      var ok = el("div", "panel"); ok.appendChild(el("h2", null, "Nothing needs your attention"));
      ok.appendChild(el("div", "empty", "No stale, disputed, or withheld memory. Agents can trust everything in here right now.")); mount.appendChild(ok); return;
    }
    var card = el("div", "alert-card");
    var ah = el("div", "ah"); ah.appendChild(el("h2", null, "Needs your attention")); ah.appendChild(el("span", "c", att.length + " to review")); card.appendChild(ah);
    att.slice(0, 12).forEach(function (a) {
      var row = el("div", "att"); row.appendChild(el("span", "t", a.title)); row.appendChild(el("span", "tag", a.tag));
      row.appendChild(el("span", "why", a.why || "needs review")); card.appendChild(row);
    });
    mount.appendChild(card);
  }

  // ---- memory list ----
  function renderChips() {
    var c = counts(state.items); c.all = state.items.length;
    var order = ["all", "hot", "healthy", "cold", "stale", "disputed", "ungrounded"];
    var box = document.getElementById("chips"); box.textContent = "";
    order.forEach(function (k) {
      if (k !== "all" && !c[k]) return;
      var b = el("button", "chip"); b.setAttribute("aria-pressed", state.filter === k ? "true" : "false");
      b.innerHTML = (k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)) + " <b>" + (c[k] || 0) + "</b>";
      b.onclick = function () { state.filter = k; state.showAll = false; renderChips(); renderList(); };
      box.appendChild(b);
    });
  }
  var LIST_CAP = 50;
  var HEALTH_LABEL = { hot: "Hot", healthy: "Healthy", cold: "Cold", stale: "Stale", disputed: "Disputed", ungrounded: "Ungrounded", generated: "Generated" };
  function fileSummary(paths) {
    var seen = {}, bases = [];
    (paths || []).forEach(function (p) { var b = base(p); if (!seen[b]) { seen[b] = 1; bases.push(b); } });
    if (!bases.length) return null;
    if (bases.length === 1) return bases[0];
    return bases[0] + "  +" + (bases.length - 1);
  }
  function memoryRow(i) {
    var row = el("div", "row"); row.appendChild(el("span", "dot " + (i.health || "")));
    var body = el("div"); body.appendChild(el("div", "title", i.title));
    var meta = el("div", "meta"); meta.appendChild(el("span", "type", i.type || "memory"));
    var fs = fileSummary(i.paths); if (fs) meta.appendChild(el("span", "paths", fs));
    body.appendChild(meta); row.appendChild(body);
    var right = el("div", "right");
    right.appendChild(el("span", "pill " + (i.health || ""), HEALTH_LABEL[i.health] || i.health || "memory"));
    if (i.total_uses) right.appendChild(el("span", "uses", "used " + i.total_uses + "×"));
    row.appendChild(right);
    row.onclick = function () { openDetail(i); };
    return row;
  }
  // packet detail drawer — read a memory's full content, grounding, and status.
  var drawer = document.getElementById("detail"), drawerBg = document.getElementById("detailBackdrop");
  function closeDetail() { if (drawer) drawer.classList.remove("open"); if (drawerBg) drawerBg.classList.remove("open"); }
  function openDetail(it) {
    if (!drawer) return;
    var h = "";
    h += '<button class="dr-x" id="drClose" aria-label="Close">×</button>';
    h += '<div class="dr-tags"><span class="type">' + escapeHtml(it.type || "memory") + '</span>';
    h += '<span class="pill ' + (it.health || "") + '">' + escapeHtml(HEALTH_LABEL[it.health] || it.health || "") + '</span>';
    if (it.status && it.status !== "approved") h += '<span class="pill">' + escapeHtml(it.status) + '</span>';
    h += "</div>";
    h += '<h3 class="dr-title">' + escapeHtml(it.title) + "</h3>";
    if (it.summary) h += '<p class="dr-summary">' + escapeHtml(it.summary) + "</p>";
    if (it.body) h += '<div class="dr-body">' + escapeHtml(it.body) + "</div>";
    var files = (it.paths || []).filter(Boolean);
    if (files.length) h += '<div class="dr-sec"><div class="dr-h">Grounded in</div>' + files.map(function (f) { return '<div class="dr-file">' + escapeHtml(f) + "</div>"; }).join("") + "</div>";
    if (it.tags && it.tags.length) h += '<div class="dr-sec"><div class="dr-h">Tags</div><div class="dr-tagrow">' + it.tags.map(function (t) { return '<span class="tg">' + escapeHtml(t) + "</span>"; }).join("") + "</div></div>";
    var meta = '<div class="dr-row">Used <b>' + (it.total_uses || 0) + "×</b>" + (it.uses_30d ? " (" + it.uses_30d + " in last 30 days)" : "") + "</div>";
    if (it.last_accessed_at) meta += '<div class="dr-row">Last recalled <b>' + escapeHtml(String(it.last_accessed_at).slice(0, 10)) + "</b></div>";
    if (it.stale_reasons && it.stale_reasons.length) meta += '<div class="dr-row warn">' + escapeHtml(it.stale_reasons[0]) + "</div>";
    if (it.action) meta += '<div class="dr-row">' + escapeHtml(it.action) + "</div>";
    h += '<div class="dr-sec"><div class="dr-h">Status</div>' + meta + "</div>";
    drawer.innerHTML = h; drawer.scrollTop = 0; drawer.classList.add("open"); if (drawerBg) drawerBg.classList.add("open");
    var x = document.getElementById("drClose"); if (x) x.onclick = closeDetail;
  }
  if (drawerBg) drawerBg.onclick = closeDetail;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDetail(); });
  function renderList() {
    var list = document.getElementById("list"); list.textContent = "";
    var q = state.q.trim().toLowerCase();
    var rows = state.items.filter(function (i) {
      if (state.filter !== "all" && i.health !== state.filter) return false;
      if (!q) return true;
      return (i.title || "").toLowerCase().indexOf(q) !== -1 || (i.type || "").toLowerCase().indexOf(q) !== -1 ||
        (i.paths || []).join(" ").toLowerCase().indexOf(q) !== -1;
    });
    var rank = { hot: 0, healthy: 1, stale: 2, disputed: 2, ungrounded: 2, cold: 3, generated: 4 };
    rows.sort(function (a, b) {
      var ra = rank[a.health]; if (ra == null) ra = 5; var rb = rank[b.health]; if (rb == null) rb = 5;
      return ra - rb || (b.total_uses || 0) - (a.total_uses || 0);
    });
    var countEl = document.getElementById("memcount");
    if (countEl) countEl.textContent = rows.length === state.items.length ? rows.length + " packets" : rows.length + " of " + state.items.length + " packets";
    if (!rows.length) { list.appendChild(el("div", "empty", "No memory matches.")); return; }

    var grouped = state.filter === "all" && !q;
    var cap = state.showAll ? Infinity : LIST_CAP, shown = 0;
    if (grouped) {
      var buckets = [["Needs review", ["stale", "disputed", "ungrounded"]], ["Hot", ["hot"]], ["Healthy", ["healthy"]], ["Cold", ["cold"]], ["Other", ["generated"]]];
      buckets.forEach(function (bk) {
        var brows = rows.filter(function (r) { return bk[1].indexOf(r.health) !== -1; });
        if (!brows.length || shown >= cap) return;
        var head = el("div", "grouphead");
        head.appendChild(el("span", "gl", bk[0])); head.appendChild(el("span", "gc", String(brows.length))); head.appendChild(el("span", "gline"));
        list.appendChild(head);
        brows.forEach(function (r) { if (shown < cap) { list.appendChild(memoryRow(r)); shown++; } });
      });
    } else {
      rows.forEach(function (r) { if (shown < cap) { list.appendChild(memoryRow(r)); shown++; } });
    }
    if (!state.showAll && rows.length > shown) {
      var more = el("button", "showmore", "Show all " + rows.length + " packets");
      more.onclick = function () { state.showAll = true; renderList(); };
      list.appendChild(more);
    }
  }
  var searchEl = document.getElementById("search");
  if (searchEl) searchEl.addEventListener("input", function (e) { state.q = e.target.value; state.showAll = false; renderList(); });

  // ---- insights ----
  function renderInsights(metrics, items) {
    var cg = (metrics && metrics.code_graph) || {}, mg = (metrics && metrics.memory_graph) || {}, sv = (metrics && metrics.savings) || {};
    var c = counts(items);
    // Health donut = trustworthiness, not recall frequency. "Cold" (not yet recalled)
    // is grounded & current, so it counts as healthy — coloring it grey made a perfectly
    // trustworthy store look dead. Segments: grounded & current vs needs review.
    var needsReview = (c.stale || 0) + (c.disputed || 0) + (c.ungrounded || 0);
    var generated = c.generated || 0;
    var groundedCurrent = items.length - needsReview - generated;
    var seg = [
      { k: "Grounded & current", v: groundedCurrent, col: THEME.gain },
      { k: "Needs review", v: needsReview, col: THEME.warn },
      { k: "Generated", v: generated, col: THEME.code },
    ].filter(function (s) { return s.v > 0; });
    var total = items.length || 1;
    var stops = [], acc = 0;
    seg.forEach(function (s) { var from = acc / total * 360, to = (acc + s.v) / total * 360; stops.push(s.col + " " + from + "deg " + to + "deg"); acc += s.v; });
    var donut = document.getElementById("donut");
    donut.style.background = "conic-gradient(" + (stops.join(", ") || THEME.gain + " 0deg 360deg") + ")";
    var pct = Math.round(groundedCurrent / total * 100);
    // The big % is the health readout, so color it by how healthy it is — a high
    // grounded share is green, not a warning. (Amber/red only when it's actually low.)
    var pctClass = pct >= 85 ? "" : pct >= 60 ? "warn" : "danger";
    var dc = document.getElementById("donutCenter"); dc.textContent = "";
    dc.appendChild(el("b", pctClass, pct + "%"));
    var leg = document.getElementById("healthLegend"); leg.textContent = "";
    seg.forEach(function (s) {
      var li = el("div", "li"); var i = el("i"); i.style.background = s.col; li.appendChild(i);
      li.appendChild(document.createTextNode(s.k)); li.appendChild(el("b", null, s.v + " · " + Math.round(s.v / total * 100) + "%")); leg.appendChild(li);
    });
    var cap = document.getElementById("healthCap");
    if (cap) {
      var recalled = items.filter(function (i) { return (i.total_uses || 0) > 0; }).length;
      cap.innerHTML = "<b>" + total + "</b> packets · <b>" + recalled + "</b> recalled by agents so far" +
        (needsReview ? " · <b>" + needsReview + "</b> need review" : " · all current");
    }
    // type bars
    var types = {}; items.forEach(function (i) { var t = i.type || "memory"; types[t] = (types[t] || 0) + 1; });
    var arr = Object.keys(types).map(function (k) { return [k, types[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 7);
    var max = arr.length ? arr[0][1] : 1;
    var tb = document.getElementById("typeBars"); tb.textContent = "";
    arr.forEach(function (p) {
      var row = el("div", "hbar"); row.appendChild(el("span", "n", p[0]));
      var t = el("span", "t"), f = el("i"); t.appendChild(f); row.appendChild(t); row.appendChild(el("span", "c", String(p[1])));
      tb.appendChild(row); setTimeout(function () { f.style.width = (p[1] / max * 100) + "%"; }, 80);
    });
    // most-grounded files: which code carries the most institutional memory
    var fileCounts = {};
    items.forEach(function (i) { (i.paths || []).forEach(function (p) { fileCounts[p] = (fileCounts[p] || 0) + 1; }); });
    var gf = Object.keys(fileCounts).map(function (k) { return [k, fileCounts[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var gmax = gf.length ? gf[0][1] : 1;
    var gfb = document.getElementById("groundedFiles"); if (gfb) {
      gfb.textContent = "";
      if (!gf.length) { gfb.appendChild(el("div", "empty", "No memory is grounded to code yet.")); }
      var baseSeen = {}; gf.forEach(function (p) { var b = base(p[0]); baseSeen[b] = (baseSeen[b] || 0) + 1; });
      gf.forEach(function (p) {
        var b = base(p[0]), label = baseSeen[b] > 1 ? p[0].split("/").slice(-2).join("/") : b;
        var row = el("div", "hbar code"); var n = el("span", "n", label); n.title = p[0]; row.appendChild(n);
        var t = el("span", "t"), f = el("i"); t.appendChild(f); row.appendChild(t); row.appendChild(el("span", "c", String(p[1])));
        gfb.appendChild(row); setTimeout(function () { f.style.width = (p[1] / gmax * 100) + "%"; }, 80);
      });
    }
    // code tiles
    var langs = Object.keys(cg.languages || {}).length;
    var ct = [
      ["Files", fmt(cg.files)], ["Symbols", fmt(cg.symbols)], ["Routes", fmt(cg.routes)], ["Tests", fmt(cg.tests)],
      ["Imports", fmt(cg.imports)], ["Call edges", fmt(cg.calls)], ["Index coverage", (cg.indexer_coverage_percent != null ? cg.indexer_coverage_percent + "%" : "—")], ["Languages", fmt(langs)],
    ];
    var ctb = document.getElementById("codeTiles"); ctb.textContent = "";
    ct.forEach(function (d) { var t = el("div", "tile"); t.appendChild(el("div", "k", d[0])); t.appendChild(el("div", "v", d[1])); ctb.appendChild(t); });
    // facts
    var hot = items.filter(function (i) { return i.health === "hot"; }).sort(function (a, b) { return (b.total_uses || 0) - (a.total_uses || 0); })[0];
    var cold = c.cold || 0;
    var facts = [];
    facts.push(["💾", "Every recall pulls grounded memory instead of re-reading source — saving about <b>" + fmt(sv.estimated_tokens_saved_per_recall) + " tokens</b> each time."]);
    if (mg.evidence_coverage_percent != null) facts.push(["🔗", "<b>" + mg.evidence_coverage_percent + "%</b> of " + fmt(mg.edges) + " memory edges are backed by evidence — nothing in the graph is a guess."]);
    if (hot) facts.push(["🔥", "Most-recalled memory: <b>" + escapeHtml(hot.title) + "</b>" + (hot.total_uses ? " (used " + hot.total_uses + "×)." : ".")]);
    if (cold) facts.push(["🧊", "<b>" + cold + "</b> packets haven't been recalled recently — run <code>kage refresh</code> to keep them grounded, or let them age out."]);
    if (mg.average_quality_score != null) facts.push(["⭐", "Average packet quality score is <b>" + mg.average_quality_score + "/100</b> across the repo."]);
    var fb = document.getElementById("facts"); fb.textContent = "";
    facts.forEach(function (f) { var row = el("div", "fact"); row.appendChild(el("span", "em", f[0])); var s = el("span"); s.innerHTML = f[1]; row.appendChild(s); fb.appendChild(row); });
  }
  function escapeHtml(s) { var d = el("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  // ---- memory <-> code graph (interactive canvas) ----
  var G = { nodes: [], edges: [], hover: -1, focus: -1, raf: 0, alpha: 1, filter: "all", view: { s: 1, tx: 0, ty: 0 }, drag: null, pan: null, tween: null };
  // Canvas needs concrete colors; turn a resolved theme hex into rgba at a given alpha.
  function rgba(hex, a) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return hex;
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function seeded(n) { var x = Math.sin(n * 999.137) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function nodeR(nd) { return Math.min(13, 4.5 + nd.deg * 1.1); }
  function buildGraph() {
    var items = state.items.filter(function (i) { return i.paths && i.paths.length; });
    var rank = { hot: 0, healthy: 1, stale: 2, disputed: 2, ungrounded: 2, cold: 3 };
    items.sort(function (a, b) { var ra = rank[a.health] == null ? 4 : rank[a.health], rb = rank[b.health] == null ? 4 : rank[b.health]; return ra - rb || (b.total_uses || 0) - (a.total_uses || 0); });
    items = items.slice(0, 60);
    var nodes = [], edges = [], fileIdx = {};
    items.forEach(function (it, mi) {
      var review = ["stale", "disputed", "ungrounded"].indexOf(it.health) !== -1;
      var label = (it.title || "memory"); if (label.length > 26) label = label.slice(0, 25) + "…";
      nodes.push({ id: "m" + mi, label: label, kind: "memory", review: review, health: it.health, deg: 0, tip: it.title, sub: it.type || "memory", uses: it.total_uses || 0, files: (it.paths || []).map(base) });
      var mIndex = nodes.length - 1;
      it.paths.slice(0, 3).forEach(function (p) {
        var key = "f:" + p, fi = fileIdx[key];
        if (fi == null) { nodes.push({ id: key, label: base(p), kind: "file", deg: 0, tip: p, sub: "code file" }); fi = nodes.length - 1; fileIdx[key] = fi; }
        edges.push([mIndex, fi]); nodes[mIndex].deg++; nodes[fi].deg++;
      });
    });
    G.nodes = nodes; G.edges = edges; G.alpha = 1;
  }
  function initGraph() {
    var canvas = document.getElementById("graph"); if (!canvas) return;
    buildGraph();
    var ctx = canvas.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0;
    var tip = document.getElementById("gtip");
    function resize() { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
    resize();
    G.nodes.forEach(function (n, i) { n.x = W / 2 + (seeded(i + 1) - 0.5) * W * 0.7; n.y = H / 2 + (seeded(i + 7) - 0.5) * H * 0.7; n.vx = 0; n.vy = 0; n.fixed = false; });

    function fitView() {
      if (!G.nodes.length) return;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      G.nodes.forEach(function (n) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); });
      var pad = 60, gw = (maxX - minX) || 1, gh = (maxY - minY) || 1;
      var s = clamp(Math.min((W - 2 * pad) / gw, (H - 2 * pad) / gh), 0.35, 1.8);
      G.view.s = s; G.view.tx = (W - (minX + maxX) * s) / 2; G.view.ty = (H - (minY + maxY) * s) / 2;
    }
    function s2w(sx, sy) { return { x: (sx - G.view.tx) / G.view.s, y: (sy - G.view.ty) / G.view.s }; }
    function neighbors(idx) { var s = {}; if (idx < 0) return null; s[idx] = 1; G.edges.forEach(function (e) { if (e[0] === idx) s[e[1]] = 1; if (e[1] === idx) s[e[0]] = 1; }); return s; }
    function categorySet() {
      if (G.filter === "all") return null;
      // Seed = the matching memory nodes only. Expand to the files they touch, but
      // gate on the immutable seed — never pull in other memories that merely share a
      // hub file (that cascade made "Needs review" highlight ~everything).
      var seed = {};
      G.nodes.forEach(function (n, i) { if (n.kind === "memory" && (G.filter === "review" ? n.review : n.health === G.filter)) seed[i] = 1; });
      var set = {};
      Object.keys(seed).forEach(function (k) { set[k] = 1; });
      G.edges.forEach(function (e) { if (seed[e[0]]) set[e[1]] = 1; if (seed[e[1]]) set[e[0]] = 1; });
      return set;
    }
    function color(nd) { return nd.kind === "file" ? THEME.code : (nd.review ? THEME.warn : THEME.memory); }
    function bodyColor(nd) { return rgba(THEME.paper, 0.94); }
    var DIAMOND = { decision: 1, bug_fix: 1, test: 1, gotcha: 1 };
    function shapePath(x, y, r, nd) {
      if (nd.kind === "file") { roundRect(x - r * 1.3, y - r * 0.78, r * 2.6, r * 1.56, 3); return; }
      if (DIAMOND[nd.sub]) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); return; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
    }

    function tick() {
      var n = G.nodes, e = G.edges, a = G.alpha;
      if (G.tween) {
        var tw = G.tween, v = G.view;
        v.s += (tw.s - v.s) * 0.2; v.tx += (tw.tx - v.tx) * 0.2; v.ty += (tw.ty - v.ty) * 0.2;
        if (Math.abs(tw.s - v.s) < 0.01 && Math.abs(tw.tx - v.tx) < 0.6 && Math.abs(tw.ty - v.ty) < 0.6) { v.s = tw.s; v.tx = tw.tx; v.ty = tw.ty; G.tween = null; }
      }
      if (a > 0.03) {
        for (var i = 0; i < n.length; i++) for (var j = i + 1; j < n.length; j++) {
          var dx = n[i].x - n[j].x, dy = n[i].y - n[j].y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2);
          var rep = 2900 / d2, fx = dx / d * rep, fy = dy / d * rep;
          n[i].vx += fx; n[i].vy += fy; n[j].vx -= fx; n[j].vy -= fy;
        }
        for (var k = 0; k < e.length; k++) {
          var s = n[e[k][0]], t = n[e[k][1]], dx2 = t.x - s.x, dy2 = t.y - s.y, dd = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.01;
          var f = (dd - 94) * 0.013, ux = dx2 / dd * f, uy = dy2 / dd * f;
          s.vx += ux; s.vy += uy; t.vx -= ux; t.vy -= uy;
        }
        var cx = W / 2, cy = H / 2;
        for (var m = 0; m < n.length; m++) {
          if (n[m].fixed) { n[m].vx = n[m].vy = 0; continue; }
          n[m].vx += (cx - n[m].x) * 0.0016; n[m].vy += (cy - n[m].y) * 0.0016;
          n[m].vx *= 0.86; n[m].vy *= 0.86;
          n[m].x += n[m].vx * a; n[m].y += n[m].vy * a;
        }
        G.alpha *= 0.992;
      }
      draw();
      G.raf = requestAnimationFrame(tick);
    }
    function draw() {
      var n = G.nodes, v = G.view;
      var hl = G.hover >= 0 ? neighbors(G.hover) : (G.focus >= 0 ? neighbors(G.focus) : null);
      var emph = hl || categorySet(), active = !!emph;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.tx, dpr * v.ty);
      ctx.lineWidth = 1 / v.s;
      G.edges.forEach(function (e) {
        var on = active && emph[e[0]] && emph[e[1]];
        ctx.strokeStyle = on ? rgba(THEME.code, 0.7) : (active ? rgba(THEME.faint, 0.08) : rgba(THEME.faint, 0.25));
        ctx.beginPath(); ctx.moveTo(n[e[0]].x, n[e[0]].y); ctx.lineTo(n[e[1]].x, n[e[1]].y); ctx.stroke();
      });
      n.forEach(function (nd, i) {
        var r = nodeR(nd), dim = active && !emph[i], col = color(nd), strong = i === G.hover || i === G.focus;
        ctx.save();
        ctx.globalAlpha = dim ? 0.14 : 1;
        // glowing rim over a dark body
        if (!dim) { ctx.shadowColor = col; ctx.shadowBlur = (strong ? 16 : (nd.kind === "memory" ? 9 : 10)); }
        shapePath(nd.x, nd.y, r, nd); ctx.fillStyle = bodyColor(nd); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = (strong ? 2.4 : 1.3) / v.s; ctx.strokeStyle = col; ctx.stroke();
        // inner dot for memory nodes
        if (nd.kind === "memory") { ctx.globalAlpha = (dim ? 0.14 : 1) * 0.9; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(nd.x, nd.y, Math.max(2.2, r * 0.2), 0, 6.2832); ctx.fill(); }
        ctx.restore();
        // halo on hover/focus
        if (!dim && strong) { ctx.save(); shapePath(nd.x, nd.y, r + 5, nd); ctx.strokeStyle = i === G.focus ? THEME.ink : col; ctx.lineWidth = 1.8 / v.s; ctx.shadowColor = col; ctx.shadowBlur = 9; ctx.stroke(); ctx.restore(); }
      });
      // labels in screen space (mono pill, centered below) so they stay crisp at any zoom
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      n.forEach(function (nd, i) {
        if (active && !emph[i]) return;
        var strong = i === G.hover || i === G.focus;
        // Labels are detail-on-demand only: shown for the hovered/focused node and its
        // highlighted neighbourhood. No always-on labels — they cluttered the graph.
        if (!active) return;
        var sx = nd.x * v.s + v.tx, sy = nd.y * v.s + v.ty, r = nodeR(nd) * v.s;
        if (sx < -60 || sx > W + 60 || sy < -20 || sy > H + 20) return;
        ctx.font = (strong ? "700 " : "600 ") + "11px ui-monospace, Menlo, monospace";
        var w = ctx.measureText(nd.label).width, pw = w + 14, ph = 18, lx = sx - pw / 2, ly = sy + r + 7;
        ctx.globalAlpha = 0.94; ctx.fillStyle = rgba(THEME.paper, 0.94); roundRect(lx, ly, pw, ph, 4); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = strong ? rgba(THEME.gain, 0.6) : rgba(THEME.line, 0.8); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = strong ? THEME.ink : THEME.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(nd.label, sx, ly + ph / 2);
      });
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function pick(p) {
      var best = -1, bd = Infinity;
      for (var i = 0; i < G.nodes.length; i++) {
        var nd = G.nodes[i], sx = nd.x * G.view.s + G.view.tx, sy = nd.y * G.view.s + G.view.ty;
        var dx = sx - p.x, dy = sy - p.y, d = dx * dx + dy * dy, tol = nodeR(nd) * G.view.s + 8;
        if (d < tol * tol && d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function xy(ev) { var r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
    function showTip(nd, p) {
      tip.style.display = "block"; tip.style.left = Math.min(W - 250, p.x + 14) + "px"; tip.style.top = (p.y + 14) + "px";
      tip.innerHTML = "<b>" + escapeHtml(nd.tip) + "</b><div class='p'>" + escapeHtml(nd.sub) + " · " + nd.deg + " link" + (nd.deg === 1 ? "" : "s") + "</div>";
    }
    function zoomAt(p, factor) {
      G.tween = null;
      var ns = clamp(G.view.s * factor, 0.3, 4), w = s2w(p.x, p.y);
      G.view.s = ns; G.view.tx = p.x - w.x * ns; G.view.ty = p.y - w.y * ns;
    }
    var detail = document.getElementById("gdetail");
    function updateDetail() {
      if (!detail) return;
      if (G.focus < 0) { detail.style.display = "none"; return; }
      var nd = G.nodes[G.focus], html;
      if (nd.kind === "file") {
        html = "<div class='gd-k k-file'>code file</div><b class='gd-t'>" + escapeHtml(nd.tip) + "</b>" +
          "<div class='gd-row'>cited by <b>" + nd.deg + "</b> memor" + (nd.deg === 1 ? "y" : "ies") + "</div>";
      } else {
        html = "<div class='gd-k k-memory'>" + escapeHtml(nd.sub) + "</div><b class='gd-t'>" + escapeHtml(nd.tip) + "</b>" +
          "<div class='gd-row'>health <b class='" + (nd.health || "") + "'>" + (nd.health || "—") + "</b>" + (nd.uses ? " · used " + nd.uses + "×" : "") + " · " + nd.deg + " file" + (nd.deg === 1 ? "" : "s") + "</div>" +
          (nd.files && nd.files.length ? "<div class='gd-files'>" + nd.files.map(escapeHtml).join(" · ") + "</div>" : "");
      }
      detail.innerHTML = "<button class='gd-x' id='gdClose'>×</button>" + html; detail.style.display = "block";
      var x = document.getElementById("gdClose"); if (x) x.onclick = function () { G.focus = -1; updateDetail(); };
    }
    function focusNode(idx) { G.focus = idx; updateDetail(); }

    canvas.addEventListener("mousedown", function (ev) {
      G.tween = null;
      var p = xy(ev), idx = pick(p);
      if (idx >= 0) { G.drag = { idx: idx, moved: false }; G.nodes[idx].fixed = true; canvas.style.cursor = "grabbing"; }
      else { G.pan = { x: p.x, y: p.y, tx: G.view.tx, ty: G.view.ty, moved: false }; canvas.style.cursor = "grabbing"; }
    });
    canvas.addEventListener("dblclick", function (ev) {
      var p = xy(ev), idx = pick(p); if (idx < 0) return;
      var nd = G.nodes[idx], ns = clamp(Math.max(G.view.s, 1.6), 0.3, 4);
      G.tween = { s: ns, tx: W / 2 - nd.x * ns, ty: H / 2 - nd.y * ns }; focusNode(idx);
    });
    window.addEventListener("mousemove", function (ev) {
      if (G.drag) { var p = xy(ev), w = s2w(p.x, p.y), nd = G.nodes[G.drag.idx]; nd.x = w.x; nd.y = w.y; nd.vx = nd.vy = 0; G.drag.moved = true; G.hover = G.drag.idx; G.alpha = Math.max(G.alpha, 0.3); showTip(nd, p); return; }
      if (G.pan) { var q = xy(ev); G.view.tx = G.pan.tx + (q.x - G.pan.x); G.view.ty = G.pan.ty + (q.y - G.pan.y); G.pan.moved = true; tip.style.display = "none"; return; }
      if (!canvas.matches(":hover")) return;
      var pp = xy(ev), id = pick(pp); G.hover = id; canvas.style.cursor = id >= 0 ? "pointer" : "grab";
      if (id >= 0) showTip(G.nodes[id], pp); else tip.style.display = "none";
    });
    window.addEventListener("mouseup", function () {
      if (G.drag) { if (!G.drag.moved) { var i = G.drag.idx; focusNode(G.focus === i ? -1 : i); G.nodes[i].fixed = false; } G.drag = null; }
      else if (G.pan) { if (!G.pan.moved) focusNode(-1); G.pan = null; }
      canvas.style.cursor = "grab";
    });
    canvas.addEventListener("mouseleave", function () { if (!G.drag && !G.pan) { G.hover = -1; tip.style.display = "none"; } });
    canvas.addEventListener("wheel", function (ev) { ev.preventDefault(); zoomAt(xy(ev), ev.deltaY < 0 ? 1.12 : 0.892); }, { passive: false });

    var zin = document.getElementById("zoomIn"), zout = document.getElementById("zoomOut"), zr = document.getElementById("resetView");
    if (zin) zin.onclick = function () { zoomAt({ x: W / 2, y: H / 2 }, 1.25); };
    if (zout) zout.onclick = function () { zoomAt({ x: W / 2, y: H / 2 }, 0.8); };
    if (zr) zr.onclick = function () { G.tween = null; focusNode(-1); G.nodes.forEach(function (n) { n.fixed = false; }); G.alpha = 0.5; fitView(); };
    var fbar = document.getElementById("gfilters");
    if (fbar) fbar.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-gfilter]"); if (!b) return;
      G.filter = b.dataset.gfilter;
      fbar.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
    window.addEventListener("resize", function () { if (document.getElementById("section-graph").classList.contains("active")) { resize(); fitView(); } });

    canvas.style.cursor = "grab";
    fitView();
    cancelAnimationFrame(G.raf); tick();
  }

  // ---- live feed (SSE from the local viewer daemon) ----
  // Connects to /kage/events when this page is served by `kage viewer`. The
  // hosted demo on GitHub Pages has no daemon: the stream never opens, so the
  // panel stays hidden and the dashboard is otherwise unchanged.
  var LIVE_CAP = 30;
  var LIVE_LABEL = {
    packet_written: ["＋", "Memory written"],
    packet_updated: ["✎", "Memory updated"],
    recall_served: ["✓", "Recall served"],
    stale_withheld: ["⊘", "Stale memory withheld"],
    caller_answered: ["◆", "Graph answer served"],
    stale_caught: ["⊘", "Stale memory caught"],
  };
  function liveRow(e) {
    var kind = e.type === "value_event" ? ((e.event && e.event.kind) || "value_event") : e.type;
    var meta = LIVE_LABEL[kind] || ["•", String(kind).replace(/_/g, " ")];
    var row = el("div", "vev fresh " + kind);
    row.appendChild(el("span", "vi", meta[0]));
    var mid = el("div", "vt");
    mid.appendChild(document.createTextNode(meta[1]));
    if (kind === "recall_served" && e.event && e.event.tokens_saved > 0) {
      mid.appendChild(document.createTextNode(" — saved "));
      mid.appendChild(el("b", null, "~" + fmt(e.event.tokens_saved) + " tokens"));
    } else if (e.title) {
      mid.appendChild(document.createTextNode(" — "));
      mid.appendChild(el("b", null, e.title));
    }
    row.appendChild(mid);
    row.appendChild(el("span", "when", relTime(e.ts) || "just now"));
    return row;
  }
  function initLive() {
    if (typeof window.EventSource === "undefined") return;
    var panel = document.getElementById("livePanel"), feed = document.getElementById("liveFeed");
    if (!panel || !feed) return;
    var es;
    try { es = new EventSource("/kage/events"); } catch (err) { return; }
    var opened = false;
    es.onopen = function () {
      opened = true;
      panel.hidden = false;
      if (!feed.childNodes.length) feed.appendChild(el("div", "empty", "Connected. New memories and value events stream in here live."));
    };
    es.onerror = function () {
      // Never connected (no daemon behind this page): close and hide quietly.
      // After a successful open, EventSource reconnects on its own — keep the panel.
      if (!opened) { es.close(); panel.hidden = true; }
    };
    es.onmessage = function (msg) {
      var e;
      try { e = JSON.parse(msg.data); } catch (err) { return; }
      if (!e || !e.type) return;
      var placeholder = feed.querySelector(".empty");
      if (placeholder) feed.removeChild(placeholder);
      feed.className = "vfeed";
      feed.insertBefore(liveRow(e), feed.firstChild);
      while (feed.childNodes.length > LIVE_CAP) feed.removeChild(feed.lastChild);
    };
  }
  initLive();
})();
