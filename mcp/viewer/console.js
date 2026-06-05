(function () {
  var params = new URLSearchParams(location.search);
  function src(name, fallback) { return params.get(name) || fallback; }
  var root = "./data/kage/reports/";
  var paths = {
    lifecycle: src("lifecycle", root + "lifecycle.json"),
    trust: src("trust", root + "trust.json"),
    suppressed: src("suppressed", root + "suppressed.json"),
    metrics: src("metrics", "./data/kage/metrics.json"),
  };
  var state = { items: [], filter: "all", q: "" };

  function getJSON(p) { return fetch(p).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  Promise.all([getJSON(paths.trust), getJSON(paths.suppressed), getJSON(paths.lifecycle), getJSON(paths.metrics)])
    .then(function (r) { render(r[0], r[1], r[2], r[3]); })
    .catch(function () { render(null, null, null, null); });

  function render(trust, suppressed, lifecycle, metrics) {
    renderHero(trust);
    var items = (lifecycle && lifecycle.items) || [];
    state.items = items;
    renderAttention(items, suppressed);
    renderChips(items);
    renderList();
    var repoName = (metrics && metrics.repo) || ((lifecycle && lifecycle.project_dir) || "").split("/").pop() || "repository";
    document.getElementById("repo").textContent = repoName;
  }

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
    var verdict = score == null ? "Run kage benchmark --trust." :
      status === "ok" ? "Agents recall only memory that is grounded and current." :
      "Some memory needs review before agents should trust it.";
    var left = el("div");
    var eyebrow = el("span", "eyebrow", "Memory Trust");
    var scoreEl = el("div", "score");
    scoreEl.appendChild(el("b", null, score == null ? "—" : String(score)));
    scoreEl.appendChild(el("span", null, "/100"));
    left.appendChild(eyebrow); left.appendChild(scoreEl); left.appendChild(el("p", "verdict", verdict));
    var right = el("div", "bars");
    bars.forEach(function (b) {
      var has = !(b[1] == null || isNaN(b[1]));
      var v = has ? Math.max(0, Math.min(100, b[1])) : 0;
      var bar = el("div", "bar");
      bar.appendChild(el("span", "lbl", b[0]));
      bar.appendChild(el("b", "val", has ? v + "%" : "—"));
      var track = el("span", "track"); var fill = el("i"); fill.style.width = v + "%"; track.appendChild(fill);
      bar.appendChild(track);
      right.appendChild(bar);
    });
    hero.textContent = ""; hero.appendChild(left); hero.appendChild(right);
  }

  function attentionItems(items, suppressed) {
    var att = [];
    (items || []).forEach(function (i) {
      if (["stale", "disputed", "ungrounded"].indexOf(i.health) !== -1 || i.severity === "blocker") {
        att.push({ title: i.title, why: i.reason || (i.stale_reasons && i.stale_reasons[0]) || i.recommended_action, tag: i.health });
      }
    });
    ((suppressed && suppressed.items) || []).forEach(function (s) {
      if (!att.some(function (a) { return a.title === s.title; })) att.push({ title: s.title, why: s.reason, tag: "withheld" });
    });
    return att;
  }

  function renderAttention(items, suppressed) {
    var att = attentionItems(items, suppressed);
    var sec = document.getElementById("attentionSec");
    var box = document.getElementById("attention");
    document.getElementById("attentionCount").textContent = att.length ? att.length + " to review" : "";
    if (!att.length) { sec.hidden = true; return; }
    sec.hidden = false; box.textContent = "";
    att.slice(0, 12).forEach(function (a) {
      var row = el("div", "att");
      row.appendChild(el("span", "t", a.title));
      row.appendChild(el("span", "tag", a.tag));
      row.appendChild(el("span", "why", a.why || "needs review"));
      box.appendChild(row);
    });
  }

  function renderChips(items) {
    var counts = { all: items.length };
    items.forEach(function (i) { counts[i.health] = (counts[i.health] || 0) + 1; });
    var order = ["all", "hot", "healthy", "cold", "stale"];
    var chips = document.getElementById("chips"); chips.textContent = "";
    order.forEach(function (k) {
      if (k !== "all" && !counts[k]) return;
      var c = el("button", "chip");
      c.setAttribute("aria-pressed", state.filter === k ? "true" : "false");
      c.innerHTML = (k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)) + ' <b>' + (counts[k] || 0) + "</b>";
      c.onclick = function () { state.filter = k; renderChips(items); renderList(); };
      chips.appendChild(c);
    });
  }

  function renderList() {
    var list = document.getElementById("list"); list.textContent = "";
    var q = state.q.trim().toLowerCase();
    var rows = state.items.filter(function (i) {
      if (state.filter !== "all" && i.health !== state.filter) return false;
      if (!q) return true;
      return (i.title || "").toLowerCase().indexOf(q) !== -1 ||
        (i.type || "").toLowerCase().indexOf(q) !== -1 ||
        (i.paths || []).join(" ").toLowerCase().indexOf(q) !== -1;
    });
    var rank = { hot: 0, healthy: 1, stale: 2, disputed: 2, ungrounded: 2, cold: 3, generated: 4 };
    rows.sort(function (a, b) {
      var ra = rank[a.health]; if (ra == null) ra = 5;
      var rb = rank[b.health]; if (rb == null) rb = 5;
      return ra - rb || (b.total_uses || 0) - (a.total_uses || 0);
    });
    document.getElementById("memCount").textContent = rows.length + " of " + state.items.length;
    if (!rows.length) { list.appendChild(el("div", "empty", "No memory matches.")); return; }
    rows.forEach(function (i) {
      var row = el("div", "row");
      row.appendChild(el("span", "dot " + (i.health || "")));
      var body = el("div", "body");
      body.appendChild(el("div", "title", i.title));
      var meta = el("div", "meta");
      meta.appendChild(el("span", "type", i.type || "memory"));
      if (i.paths && i.paths.length) meta.appendChild(el("span", "paths", i.paths.slice(0, 3).join("  ·  ")));
      body.appendChild(meta);
      row.appendChild(body);
      var right = el("div", "right");
      var h = el("span", "health " + (i.health || "")); h.textContent = i.health || "";
      right.appendChild(h);
      if (i.total_uses) { right.appendChild(document.createElement("br")); right.appendChild(document.createTextNode("used " + i.total_uses + "×")); }
      row.appendChild(right);
      list.appendChild(row);
    });
  }

  var searchEl = document.getElementById("search");
  if (searchEl) searchEl.addEventListener("input", function (e) { state.q = e.target.value; renderList(); });
})();
