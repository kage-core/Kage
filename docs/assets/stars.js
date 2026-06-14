// Live GitHub star count for the nav button. Unauthenticated public API
// (60 req/hr/IP); falls back silently to the static label on any failure.
(function () {
  var el = document.getElementById("gh-stars");
  if (!el) return;
  fetch("https://api.github.com/repos/kage-core/Kage")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || typeof d.stargazers_count !== "number") return;
      var n = d.stargazers_count;
      el.textContent = n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
    })
    .catch(function () {});
})();
