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
  };
  var state = { items: [], filter: "all", q: "", metrics: null, graphReady: false };

  function getJSON(p) { return fetch(p).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(n) {
    if (n == null || isNaN(n)) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function base(p) { return String(p).split("/").pop(); }

  // ---- nav ----
  var META = {
    overview: ["kage://overview", "Repository overview", "Whether this repo's agent memory can be trusted — at a glance."],
    graph: ["kage://memory-map", "Memory ↔ code map", "Each packet anchored to the files it's grounded in. Hover a node to inspect."],
    memory: ["kage://memory", "Memory", "Every packet Kage has stored, with health and grounding."],
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
  Promise.all([getJSON(paths.trust), getJSON(paths.suppressed), getJSON(paths.lifecycle), getJSON(paths.metrics)])
    .then(function (r) { render(r[0], r[1], r[2], r[3]); })
    .catch(function () { render(null, null, null, null); });

  function render(trust, suppressed, lifecycle, metrics) {
    state.items = (lifecycle && lifecycle.items) || [];
    state.metrics = metrics || {};
    var repoName = (metrics && metrics.repo) || ((metrics && metrics.project_dir) || (lifecycle && lifecycle.project_dir) || "").split("/").pop() || "repository";
    document.getElementById("repo").textContent = repoName;
    renderHero(trust);
    renderTiles(metrics, state.items);
    renderAttention(state.items, suppressed);
    renderChips(); renderList();
    renderInsights(metrics, state.items);
    var start = (location.hash || "").replace("#", "");
    show(META[start] ? start : "overview");
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
    var mg = (metrics && metrics.memory_graph) || {}, cg = (metrics && metrics.code_graph) || {}, sv = (metrics && metrics.savings) || {};
    var c = counts(items);
    var review = (c.stale || 0) + (c.disputed || 0) + (c.ungrounded || 0);
    var data = [
      { k: "Memory packets", v: fmt(mg.approved_packets || items.length), s: (c.hot || 0) + " hot · " + (c.healthy || 0) + " healthy", cls: "memory" },
      { k: "Needs review", v: fmt(review), s: review ? "stale or ungrounded" : "all current", cls: review ? "warn" : "green" },
      { k: "Files mapped", v: fmt(cg.files), s: fmt(cg.symbols) + " symbols indexed", cls: "code" },
      { k: "Saved per recall", v: fmt(sv.estimated_tokens_saved_per_recall), s: "tokens vs. re-reading source", cls: "green" },
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
      b.onclick = function () { state.filter = k; renderChips(); renderList(); };
      box.appendChild(b);
    });
  }
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
    if (!rows.length) { list.appendChild(el("div", "empty", "No memory matches.")); return; }
    rows.forEach(function (i) {
      var row = el("div", "row"); row.appendChild(el("span", "dot " + (i.health || "")));
      var body = el("div"); body.appendChild(el("div", "title", i.title));
      var meta = el("div", "meta"); meta.appendChild(el("span", "type", i.type || "memory"));
      if (i.paths && i.paths.length) meta.appendChild(el("span", "paths", i.paths.slice(0, 3).map(base).join("  ·  ")));
      body.appendChild(meta); row.appendChild(body);
      var right = el("div", "right"); var h = el("span", "health " + (i.health || ""), i.health || ""); right.appendChild(h);
      if (i.total_uses) { right.appendChild(document.createElement("br")); right.appendChild(document.createTextNode("used " + i.total_uses + "×")); }
      row.appendChild(right); list.appendChild(row);
    });
  }
  var searchEl = document.getElementById("search");
  if (searchEl) searchEl.addEventListener("input", function (e) { state.q = e.target.value; renderList(); });

  // ---- insights ----
  function renderInsights(metrics, items) {
    var cg = (metrics && metrics.code_graph) || {}, mg = (metrics && metrics.memory_graph) || {}, sv = (metrics && metrics.savings) || {};
    var c = counts(items);
    // health donut
    var seg = [
      { k: "Hot", v: c.hot || 0, col: "#87f7b5" }, { k: "Healthy", v: c.healthy || 0, col: "#41ff8f" },
      { k: "Cold", v: c.cold || 0, col: "#2f4a3a" }, { k: "Needs review", v: (c.stale || 0) + (c.disputed || 0) + (c.ungrounded || 0), col: "#ffd166" },
    ].filter(function (s) { return s.v > 0; });
    var total = seg.reduce(function (a, b) { return a + b.v; }, 0) || 1;
    var stops = [], acc = 0;
    seg.forEach(function (s) { var from = acc / total * 360, to = (acc + s.v) / total * 360; stops.push(s.col + " " + from + "deg " + to + "deg"); acc += s.v; });
    var donut = document.getElementById("donut");
    donut.style.background = "conic-gradient(" + (stops.join(", ") || "#2f4a3a 0deg 360deg") + ")";
    var dc = document.getElementById("donutCenter"); dc.textContent = ""; dc.appendChild(el("b", null, fmt(total))); dc.appendChild(el("span", null, "packets"));
    var leg = document.getElementById("healthLegend"); leg.textContent = "";
    seg.forEach(function (s) {
      var li = el("div", "li"); var i = el("i"); i.style.background = s.col; li.appendChild(i);
      li.appendChild(document.createTextNode(s.k)); li.appendChild(el("b", null, s.v + " · " + Math.round(s.v / total * 100) + "%")); leg.appendChild(li);
    });
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

  // ---- memory <-> code graph (canvas force layout) ----
  var G = { nodes: [], edges: [], hover: -1, raf: 0, alpha: 1 };
  function seeded(n) { var x = Math.sin(n * 999.137) * 43758.5453; return x - Math.floor(x); }
  function buildGraph() {
    var items = state.items.filter(function (i) { return i.paths && i.paths.length; });
    var rank = { hot: 0, healthy: 1, stale: 2, disputed: 2, ungrounded: 2, cold: 3 };
    items.sort(function (a, b) { var ra = rank[a.health] == null ? 4 : rank[a.health], rb = rank[b.health] == null ? 4 : rank[b.health]; return ra - rb || (b.total_uses || 0) - (a.total_uses || 0); });
    items = items.slice(0, 38);
    var nodes = [], edges = [], fileIdx = {};
    items.forEach(function (it, mi) {
      var review = ["stale", "disputed", "ungrounded"].indexOf(it.health) !== -1;
      var label = (it.title || "memory"); if (label.length > 24) label = label.slice(0, 23) + "…";
      var mn = { id: "m" + mi, label: label, kind: "memory", review: review, deg: 0, tip: it.title, sub: it.type || "memory" };
      nodes.push(mn); var mIndex = nodes.length - 1;
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
    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    G.nodes.forEach(function (n, i) { n.x = W / 2 + (seeded(i + 1) - 0.5) * W * 0.6; n.y = H / 2 + (seeded(i + 7) - 0.5) * H * 0.6; n.vx = 0; n.vy = 0; });
    var tip = document.getElementById("gtip");
    function tick() {
      var n = G.nodes, e = G.edges, a = G.alpha;
      for (var i = 0; i < n.length; i++) for (var j = i + 1; j < n.length; j++) {
        var dx = n[i].x - n[j].x, dy = n[i].y - n[j].y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2);
        var rep = 2800 / d2; var fx = dx / d * rep, fy = dy / d * rep;
        n[i].vx += fx; n[i].vy += fy; n[j].vx -= fx; n[j].vy -= fy;
      }
      for (var k = 0; k < e.length; k++) {
        var s = n[e[k][0]], t = n[e[k][1]], dx2 = t.x - s.x, dy2 = t.y - s.y, dd = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.01;
        var f = (dd - 92) * 0.013; var ux = dx2 / dd * f, uy = dy2 / dd * f;
        s.vx += ux; s.vy += uy; t.vx -= ux; t.vy -= uy;
      }
      for (var m = 0; m < n.length; m++) {
        n[m].vx += (W / 2 - n[m].x) * 0.002; n[m].vy += (H / 2 - n[m].y) * 0.002;
        n[m].vx *= 0.86; n[m].vy *= 0.86;
        n[m].x += n[m].vx * a; n[m].y += n[m].vy * a;
        n[m].x = Math.max(16, Math.min(W - 16, n[m].x)); n[m].y = Math.max(16, Math.min(H - 16, n[m].y));
      }
      if (G.alpha > 0.05) G.alpha *= 0.992;
      draw();
      G.raf = requestAnimationFrame(tick);
    }
    function neighbors(idx) { var s = {}; if (idx < 0) return s; s[idx] = 1; G.edges.forEach(function (e) { if (e[0] === idx) s[e[1]] = 1; if (e[1] === idx) s[e[0]] = 1; }); return s; }
    function color(nd) { return nd.kind === "file" ? "#6ad7ff" : (nd.review ? "#ffd166" : "#c49cff"); }
    function draw() {
      var n = G.nodes, hl = neighbors(G.hover), active = G.hover >= 0;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      G.edges.forEach(function (e) {
        var on = active && hl[e[0]] && hl[e[1]];
        ctx.strokeStyle = on ? "rgba(106,215,255,0.6)" : (active ? "rgba(147,175,160,0.05)" : "rgba(147,175,160,0.14)");
        ctx.beginPath(); ctx.moveTo(n[e[0]].x, n[e[0]].y); ctx.lineTo(n[e[1]].x, n[e[1]].y); ctx.stroke();
      });
      // nodes
      n.forEach(function (nd, i) {
        var r = Math.min(12, 4.5 + nd.deg * 1.1), dim = active && !hl[i], col = color(nd);
        ctx.globalAlpha = dim ? 0.16 : 1;
        if (!dim && (i === G.hover || nd.deg >= 4)) { ctx.beginPath(); ctx.arc(nd.x, nd.y, r + 5, 0, 6.2832); ctx.fillStyle = col + "22"; ctx.fill(); }
        ctx.beginPath(); ctx.arc(nd.x, nd.y, r, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(5,8,6,0.85)"; ctx.stroke(); ctx.lineWidth = 1;
      });
      // labels on top, only where they won't clutter
      ctx.font = "600 11px Inter, ui-sans-serif, system-ui";
      n.forEach(function (nd, i) {
        if (active && !hl[i]) return;
        var labelIt = active ? true : nd.deg >= 3;
        if (!labelIt) return;
        var r = Math.min(12, 4.5 + nd.deg * 1.1), tx = nd.x + r + 5, ty = nd.y + 3.5;
        var w = ctx.measureText(nd.label).width;
        ctx.globalAlpha = 0.85; ctx.fillStyle = "rgba(5,8,6,0.72)";
        roundRect(tx - 4, ty - 11, w + 8, 16, 3); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = nd.kind === "file" ? "#9cd9f0" : "#d7c7f5";
        ctx.fillText(nd.label, tx, ty);
      });
      ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function pick(mx, my) {
      var best = -1, bd = 18 * 18;
      for (var i = 0; i < G.nodes.length; i++) { var dx = G.nodes[i].x - mx, dy = G.nodes[i].y - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
      return best;
    }
    canvas.onmousemove = function (ev) {
      var rect = canvas.getBoundingClientRect(), mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      var idx = pick(mx, my); G.hover = idx; canvas.style.cursor = idx >= 0 ? "pointer" : "default";
      if (idx >= 0) {
        var nd = G.nodes[idx]; tip.style.display = "block";
        tip.style.left = Math.min(rect.width - 240, mx + 14) + "px"; tip.style.top = (my + 14) + "px";
        tip.innerHTML = "<b>" + escapeHtml(nd.tip) + "</b><div class='p'>" + escapeHtml(nd.sub) + " · " + nd.deg + " link" + (nd.deg === 1 ? "" : "s") + "</div>";
      } else tip.style.display = "none";
    };
    canvas.onmouseleave = function () { G.hover = -1; tip.style.display = "none"; };
    window.addEventListener("resize", function () { if (document.getElementById("section-graph").classList.contains("active")) { resize(); } });
    cancelAnimationFrame(G.raf); tick();
  }
})();
