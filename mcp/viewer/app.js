(function () {
  "use strict";

  var state = {
    graph: null,
    entities: [],
    edges: [],
    episodesById: new Map(),
    entityById: new Map(),
    edgeById: new Map(),
    degreeById: new Map(),
    positions: new Map(),
    visibleEntityIds: new Set(),
    visibleEdgeIds: new Set(),
    selected: null,
    viewerPage: "overview",
    viewerSection: "overview",
    viewerAction: null,
    graphActionFilter: "",
    pathHighlight: {
      nodes: new Set(),
      edges: new Set(),
      direction: "",
      steps: []
    },
    metrics: null,
    inbox: null,
    reports: {
      quality: null,
      benchmark: null,
      contributors: null,
      decisions: null,
      risk: null,
      moduleHealth: null,
      graphInsights: null,
      workspace: null
    },
    pendingPackets: [],
    reviewText: "",
    viewBox: { x: 0, y: 0, width: 1000, height: 660 },
    lastVisibleSignature: "",
    sim: {
      nodes: [],
      edges: [],
      nodeById: new Map(),
      panX: 0,
      panY: 0,
      zoom: 1,
      dragNode: null,
      panning: null,
      hoverNode: null,
      raf: null,
      drawRaf: null,
      running: false,
      lastSignature: "",
      tick: 0,
      idleFrames: 0,
      adjacency: new Map()
    },
    three: {
      THREE: null,
      loading: null,
      failed: false,
      renderer: null,
      scene: null,
      camera: null,
      root: null,
      nodeGroup: null,
      edgeGroup: null,
      nodeById: new Map(),
      edgeRefs: [],
      nodeTextureCache: new Map(),
      physicsTick: 0,
      physicsIdle: 0,
      hoverNode: null,
      pointer: null,
      drag: null,
      raycaster: null,
      raf: null,
      distance: 850,
      target: { x: 0, y: 0, z: 0 },
      rotationX: -0.20,
      rotationY: 0.24,
      lastPointerEvent: null
    },
    pan: null
  };

  var palette = {
    repo: "#41ff8f",
    memory: "#41ff8f",
    path: "#ff6b6b",
    tag: "#ffd166",
    package: "#6ad7ff",
    command: "#9be7c0",
    memory_type: "#41ff8f",
    file: "#6ad7ff",
    symbol: "#9be7c0",
    route: "#6ad7ff",
    test: "#ffd166",
    external: "#62776b",
    script: "#6ad7ff",
    default: "#9be7c0"
  };

  var graphPalette = {
    background: "#020503",
    grid: "rgba(65,255,143,0.040)",
    gridStrong: "rgba(65,255,143,0.070)",
    text: "#d7f9df",
    muted: "#6ea77d",
    memory: "#41ff8f",
    code: "#6ad7ff",
    amber: "#ffd166",
    danger: "#ff6b6b",
    bridge: "#d8ff5f",
    dependency: "#62776b",
    body: "rgba(4,12,8,0.88)",
    bodyCode: "rgba(5,16,18,0.88)",
    bodyMemory: "rgba(5,18,10,0.90)"
  };

  var els = {
    graphFile: document.getElementById("graphFile"),
    graphSummary: document.getElementById("graphSummary"),
    statusStrip: document.getElementById("statusStrip"),
    autoLoadStatus: document.getElementById("autoLoadStatus"),
    workspaceMode: document.getElementById("workspaceMode"),
    graphSubhead: document.getElementById("graphSubhead"),
    selectionStatus: document.getElementById("selectionStatus"),
    searchInput: document.getElementById("searchInput"),
    pathFromInput: document.getElementById("pathFromInput"),
    pathToInput: document.getElementById("pathToInput"),
    pathNodeOptions: document.getElementById("pathNodeOptions"),
    findPath: document.getElementById("findPath"),
    clearPath: document.getElementById("clearPath"),
    pathStatus: document.getElementById("pathStatus"),
    pathResult: document.getElementById("pathResult"),
    viewMode: document.getElementById("viewMode"),
    renderMode: document.getElementById("renderMode"),
    typeFilter: document.getElementById("typeFilter"),
    relationFilter: document.getElementById("relationFilter"),
    showUntrusted: document.getElementById("showUntrusted"),
    showUncovered: document.getElementById("showUncovered"),
    showMemoryCode: document.getElementById("showMemoryCode"),
    scopeFilter: document.getElementById("scopeFilter"),
    maxNodes: document.getElementById("maxNodes"),
    showDependencies: document.getElementById("showDependencies"),
    resetView: document.getElementById("resetView"),
    zoomOut: document.getElementById("zoomOut"),
    zoomIn: document.getElementById("zoomIn"),
    fitView: document.getElementById("fitView"),
    interactionHint: document.getElementById("interactionHint"),
    graphWrap: document.getElementById("graphCanvasWrap"),
    canvas: document.getElementById("graphCanvas"),
    threeGraph: document.getElementById("threeGraph"),
    tooltip: document.getElementById("graphTooltip"),
    svg: document.getElementById("graphSvg"),
    nodeLayer: document.getElementById("nodeLayer"),
    edgeLayer: document.getElementById("edgeLayer"),
    emptyState: document.getElementById("emptyState"),
    selectionDetails: document.getElementById("selectionDetails"),
    entityList: document.getElementById("entityList"),
    edgeList: document.getElementById("edgeList"),
    metricsSummary: document.getElementById("metricsSummary"),
    graphInsightStatus: document.getElementById("graphInsightStatus"),
    graphInsights: document.getElementById("graphInsights"),
    entityCount: document.getElementById("entityCount"),
    edgeCount: document.getElementById("edgeCount"),
    reviewCount: document.getElementById("reviewCount"),
    dashboardStats: document.getElementById("dashboardStats"),
    dashboardCharts: document.getElementById("dashboardCharts"),
    memoryStatus: document.getElementById("memoryStatus"),
    memoryStats: document.getElementById("memoryStats"),
    memoryOverview: document.getElementById("memoryOverview"),
    memorySearch: document.getElementById("memorySearch"),
    memoryFilter: document.getElementById("memoryFilter"),
    memoryList: document.getElementById("memoryList"),
    ownersStatus: document.getElementById("ownersStatus"),
    ownersSummary: document.getElementById("ownersSummary"),
    ownersList: document.getElementById("ownersList"),
    reviewOverview: document.getElementById("reviewOverview"),
    reviewList: document.getElementById("reviewList"),
    proofOverview: document.getElementById("proofOverview"),
    proofStatus: document.getElementById("proofStatus"),
    proofList: document.getElementById("proofList"),
    intelligenceStatus: document.getElementById("intelligenceStatus"),
    intelligenceList: document.getElementById("intelligenceList"),
    debugOverview: document.getElementById("debugOverview"),
    pageEyebrow: document.getElementById("pageEyebrow"),
    pageTitle: document.getElementById("pageTitle"),
    viewerPageLinks: typeof document.querySelectorAll === "function" ? Array.from(document.querySelectorAll("[data-viewer-page]")) : [],
  };

  var PAGE_META = {
    overview: {
      eyebrow: "kage://overview",
      title: "Repo dashboard",
      summary: "What is safe to change next, what needs attention, and what is ready to hand off."
    },
    graph: {
      eyebrow: "kage://graph",
      title: "Dependency graph",
      summary: "Search a file or symbol, then follow connected memory, routes, and tests before editing."
    },
    memory: {
      eyebrow: "kage://memory",
      title: "Memory library",
      summary: "Find repo lore by file, feature, bug, command, or decision. Pick a packet to see linked code."
    },
    intel: {
      eyebrow: "kage://risks",
      title: "Risks",
      summary: "Files, owners, and modules to inspect before changes. Each card links into the graph."
    },
    review: {
      eyebrow: "kage://review",
      title: "Review & handoff",
      summary: "Blockers that must clear before another agent or teammate picks up this branch."
    },
    owners: {
      eyebrow: "kage://owners",
      title: "Owners & reviewers",
      summary: "Local git ownership signal. Use it for reviewer routing and bus-factor checks."
    },
    data: {
      eyebrow: "kage://artifacts",
      title: "Artifacts & diagnostics",
      summary: "Raw nodes, relations, and indexing health. Use only when graph or recall looks wrong."
    }
  };

  var MEMORY_CODE_RELATIONS = new Set(["explains_symbol", "informs_symbol", "fixes_symbol", "applies_to_route", "verified_by_test", "affects_code_path"]);
  var MEMORY_PACKET_TYPES = new Set(["memory", "command", "repo_map", "runbook", "bug_fix", "decision", "rationale", "convention", "workflow", "gotcha", "reference", "policy", "issue_context", "code_explanation", "negative_result", "constraint"]);
  var INSPECTOR_CONNECTION_LIMIT = 8;
  var PATH_BRIDGE_EDGE_LIMIT_PER_PATH = 8;
  var PATH_BRIDGE_EDGE_LIMIT_TOTAL = 160;
  var VISIBLE_EDGE_MULTIPLIER = 4;
  var VISIBLE_EDGE_MIN = 160;
  var VISIBLE_EDGE_MAX = 560;

  state.viewerPage = initialViewerPage();
  applyViewerPage(state.viewerPage);
  els.viewerPageLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var page = link.getAttribute("data-viewer-page") || "overview";
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      navigateViewerPage(page);
    });
  });
  els.graphFile.addEventListener("change", handleFile);
  els.searchInput.addEventListener("input", scheduleRender);
  els.findPath.addEventListener("click", findDependencyPath);
  els.clearPath.addEventListener("click", clearDependencyPath);
  els.pathFromInput.addEventListener("keydown", function (event) { if (event.key === "Enter") findDependencyPath(); });
  els.pathToInput.addEventListener("keydown", function (event) { if (event.key === "Enter") findDependencyPath(); });
  els.viewMode.addEventListener("change", function () { clearGraphActionFilter(); render(); });
  els.renderMode.addEventListener("change", function () {
    state.lastVisibleSignature = "";
    render();
  });
  els.typeFilter.addEventListener("change", function () { clearGraphActionFilter(); render(); });
  els.relationFilter.addEventListener("change", function () { clearGraphActionFilter(); render(); });
  els.scopeFilter.addEventListener("change", render);
  els.maxNodes.addEventListener("change", render);
  els.showDependencies.addEventListener("change", render);
  if (els.showUntrusted) els.showUntrusted.addEventListener("click", function () { applyGraphActionFilter("untrusted"); });
  if (els.showUncovered) els.showUncovered.addEventListener("click", function () { applyGraphActionFilter("uncovered"); });
  if (els.showMemoryCode) els.showMemoryCode.addEventListener("click", function () { applyGraphActionFilter("memory-code"); });
  els.zoomOut.addEventListener("click", function () { zoomGraph(0.82); });
  els.zoomIn.addEventListener("click", function () { zoomGraph(1.22); });
  els.fitView.addEventListener("click", fitActiveGraph);
  if (els.memorySearch) els.memorySearch.addEventListener("input", renderMemoryLibrary);
  if (els.memoryFilter) els.memoryFilter.addEventListener("change", renderMemoryLibrary);
  els.canvas.addEventListener("mousedown", startCanvasPointer);
  els.canvas.addEventListener("mousemove", moveCanvasPointer);
  els.canvas.addEventListener("mouseup", endCanvasPointer);
  els.canvas.addEventListener("mouseleave", leaveCanvasPointer);
  els.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  els.canvas.addEventListener("dblclick", handleCanvasDoubleClick);
  els.threeGraph.addEventListener("mousedown", startThreePointer);
  els.threeGraph.addEventListener("mousemove", moveThreePointer);
  els.threeGraph.addEventListener("mouseup", endThreePointer);
  els.threeGraph.addEventListener("mouseleave", leaveThreePointer);
  els.threeGraph.addEventListener("wheel", handleThreeWheel, { passive: false });
  els.threeGraph.addEventListener("dblclick", handleThreeDoubleClick);
  els.svg.addEventListener("mousedown", startPan);
  els.svg.addEventListener("click", handleSvgClick);
  els.svg.addEventListener("wheel", handleWheelZoom, { passive: false });
  window.addEventListener("mousemove", continuePan);
  window.addEventListener("mouseup", endPan);
  window.addEventListener("resize", function () {
    resizeActiveGraph();
  });
  els.resetView.addEventListener("click", resetGraphView);

  function resetGraphView() {
    els.searchInput.value = "";
    els.viewMode.value = "combined";
    els.renderMode.value = "2d";
    els.typeFilter.value = "";
    els.relationFilter.value = "";
    els.scopeFilter.value = "signal";
    els.maxNodes.value = "90";
    els.showDependencies.checked = false;
    state.selected = null;
    state.graphActionFilter = "";
    clearDependencyPath(false);
    state.lastVisibleSignature = "";
    render();
  }
  loadFromUrlParams();

  function initialViewerPage() {
    var fileName = "";
    try {
      fileName = String(window.location.pathname || "").split("/").pop() || "index.html";
    } catch (_error) {
      fileName = "index.html";
    }
    var pageByFile = {
      "index.html": "overview",
      "": "overview",
      "graph.html": "graph",
      "memory.html": "memory",
      "owners.html": "owners",
      "intel.html": "intel",
      "review.html": "review",
      "data.html": "data"
    };
    return pageByFile[fileName] || "overview";
  }

  function applyViewerPage(page, updateLinks) {
    var normalized = normalizeViewerPage(page);
    state.viewerPage = normalized;
    if (normalized === "overview") {
      setViewerSection("overview");
    } else if (normalized === "graph") {
      setViewerSection("graph");
    } else {
      setViewerSection("graph", pageToAction(normalized));
    }
    state.viewerPage = normalized;
    applyPageHeader(normalized);
    if (updateLinks !== false) syncViewerPageLinks();
    syncViewerPageClass();
  }

  function applyPageHeader(page) {
    var meta = PAGE_META[page] || PAGE_META.overview;
    if (els.pageEyebrow) els.pageEyebrow.textContent = meta.eyebrow;
    if (els.pageTitle) els.pageTitle.textContent = meta.title;
    if (els.graphSummary && !state.graph) els.graphSummary.textContent = meta.summary;
    try {
      if (typeof document !== "undefined" && document.title !== undefined) {
        document.title = "Kage " + meta.title.toLowerCase() + " viewer";
      }
    } catch (_error) {
      // ignore
    }
  }

  function normalizeViewerPage(page) {
    var normalized = String(page || "overview").toLowerCase();
    if (normalized === "intelligence") normalized = "intel";
    if (["overview", "graph", "memory", "owners", "intel", "review", "data"].indexOf(normalized) === -1) return "overview";
    return normalized;
  }

  function pageToAction(page) {
    if (page === "intel") return "intelligence";
    if (page === "owners") return "intelligence";
    if (page === "memory") return "memory";
    if (page === "review") return "review";
    if (page === "data") return "data";
    return null;
  }

  function pageFromSection(section, action) {
    if (section === "overview") return "overview";
    if (action === "intelligence") return "intel";
    if (action === "memory") return "memory";
    if (action === "review") return "review";
    if (action === "data") return "data";
    return "graph";
  }

  function viewerPageHref(page) {
    var fileByPage = {
      overview: "./",
      graph: "./graph.html",
      memory: "./memory.html",
      owners: "./owners.html",
      intel: "./intel.html",
      review: "./review.html",
      data: "./data.html"
    };
    var search = "";
    try {
      search = window.location.search || "";
    } catch (_error) {
      search = "";
    }
    return (fileByPage[normalizeViewerPage(page)] || "./") + search;
  }

  function navigateViewerPage(page) {
    window.location.href = viewerPageHref(page);
  }

  function showViewerPageInPlace(page) {
    applyViewerPage(page);
    try {
      window.history.pushState({}, "", viewerPageHref(page));
    } catch (_error) {
      // Static/file viewers can ignore history failures; visual state is enough.
    }
  }

  function syncViewerPageLinks() {
    els.viewerPageLinks.forEach(function (link) {
      var page = normalizeViewerPage(link.getAttribute("data-viewer-page"));
      link.setAttribute("href", viewerPageHref(page));
      var active = page === state.viewerPage;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function syncViewerPageClass() {
    if (!document.body || !document.body.classList) return;
    document.body.classList.remove(
      "viewer-page-overview",
      "viewer-page-graph",
      "viewer-page-memory",
      "viewer-page-owners",
      "viewer-page-intel",
      "viewer-page-review",
      "viewer-page-data"
    );
    document.body.classList.add("viewer-page-" + normalizeViewerPage(state.viewerPage));
  }

  function setViewerSection(section, action) {
    state.viewerSection = section === "graph" ? "graph" : "overview";
    state.viewerAction = action || null;
    state.viewerPage = pageFromSection(state.viewerSection, state.viewerAction);
    if (state.viewerSection === "overview") closeWorkspace();
    if (document.body && document.body.classList) {
      document.body.classList.remove("viewer-section-overview", "viewer-section-graph");
      document.body.classList.add("viewer-section-" + state.viewerSection);
    }
    syncViewerPageLinks();
    syncViewerPageClass();
    if (state.viewerSection === "graph") resizeActiveGraph();
  }

  function closeWorkspace() {
    if (document.body && document.body.classList) {
      document.body.classList.remove("viewer-workspace-open");
    }
  }

  function selectEntity(id, openInspector) {
    state.selected = { kind: "entity", id: id };
  }

  function selectEdge(id, openInspector) {
    state.selected = { kind: "edge", id: id };
  }

  function handleFile(event) {
    var files = Array.from(event.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(readJsonFile)).then(function (items) {
      state.metrics = items.map(function (item) { return item.graph; }).find(isMetricsGraph) || null;
      var graphItems = items.filter(function (item) { return !isMetricsGraph(item.graph); });
      if (!graphItems.length && state.metrics) {
        state.graph = { entities: [], edges: [], episodes: [] };
        state.entities = [];
        state.edges = [];
        state.entityById = new Map();
        state.episodesById = new Map();
        els.emptyState.classList.add("hidden");
        var pageMeta = PAGE_META[state.viewerPage] || PAGE_META.overview;
        els.graphSummary.textContent = state.viewerPage === "graph" ? "Metrics loaded." : pageMeta.summary;
        renderMetrics();
        return;
      }
      var merged = mergeNormalizedGraphs(graphItems.map(function (item) { return normalizeGraph(item.graph); }));
      loadNormalizedGraph(merged, graphItems.map(function (item) { return item.fileName; }).join(", "));
    }).catch(function (error) {
      showError("Could not load JSON: " + error.message);
    });
  }

  function loadGraph(graph, fileName) {
    loadNormalizedGraph(normalizeGraph(graph), fileName);
  }

  function loadNormalizedGraph(normalized, fileName) {
    var entities = normalized.entities;
    var edges = normalized.edges;
    var episodes = normalized.episodes;

    state.graph = normalized;
    state.entities = entities;
    state.edges = edges;
    state.entityById = new Map(entities.map(function (entity) {
      return [entity.id, entity];
    }));
    state.edgeById = new Map(edges.map(function (edge) {
      return [edge.id, edge];
    }));
    state.degreeById = buildDegreeMap(edges);
    state.episodesById = new Map(episodes.map(function (episode) {
      return [episode.id, episode];
    }));
    state.selected = null;
    closeWorkspace();
    clearDependencyPath(false);
    state.lastVisibleSignature = "";

    populateFilters();
    populatePathOptions();
    els.emptyState.classList.add("hidden");
    var meta = PAGE_META[state.viewerPage] || PAGE_META.overview;
    els.graphSummary.textContent = state.viewerPage === "graph"
      ? fileName + " loaded: " + entities.length + " nodes, " + edges.length + " relations."
      : meta.summary;
    render();
  }

  function buildDegreeMap(edges) {
    var degrees = new Map();
    edges.forEach(function (edge) {
      degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
      degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
    });
    return degrees;
  }

  function loadFromUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var requestedSection = String(params.get("section") || "").toLowerCase();
    if (requestedSection === "graph" || requestedSection === "overview") setViewerSection(requestedSection);
    applyRequestedView(params.get("view") || params.get("mode"));
    applyRequestedRenderMode(params.get("render") || params.get("graphMode"));
    var memoryGraphPaths = splitParamValues(params.getAll("graph"));
    var codeGraphPaths = splitParamValues(params.getAll("code"));
    var graphPaths = memoryGraphPaths.concat(codeGraphPaths);
    var graphLabels = new Map();
    memoryGraphPaths.forEach(function (path) { graphLabels.set(path, "memory knowledge graph"); });
    codeGraphPaths.forEach(function (path) { graphLabels.set(path, "structural code graph"); });
    var metricsPath = params.get("metrics");
    var inboxPath = params.get("inbox");
    var reviewPath = params.get("review");
    var pendingPath = params.get("pending");
    var qualityPath = params.get("quality");
    var benchmarkPath = params.get("benchmark");
    var contributorsPath = params.get("contributors");
    var decisionsPath = params.get("decisions");
    var riskPath = params.get("risk");
    var moduleHealthPath = params.get("moduleHealth") || params.get("module-health");
    var graphInsightsPath = params.get("graphInsights") || params.get("graph-insights");
    var workspacePath = params.get("workspace");
    var inferredRoot = inferMemoryRoot(graphPaths[0] || "");
    if (!inboxPath && inferredRoot) inboxPath = inferredRoot + "/inbox.json";
    if (!reviewPath && inferredRoot) reviewPath = inferredRoot + "/review/memory-review.md";
    if (!pendingPath && inferredRoot) pendingPath = inferredRoot + "/pending";
    if (inferredRoot) {
      if (!qualityPath) qualityPath = inferredRoot + "/reports/quality.json";
      if (!benchmarkPath) benchmarkPath = inferredRoot + "/reports/benchmark.json";
      if (!contributorsPath) contributorsPath = inferredRoot + "/reports/contributors.json";
      if (!decisionsPath) decisionsPath = inferredRoot + "/reports/decisions.json";
      if (!riskPath) riskPath = inferredRoot + "/reports/risk.json";
      if (!moduleHealthPath) moduleHealthPath = inferredRoot + "/reports/module-health.json";
      if (!graphInsightsPath) graphInsightsPath = inferredRoot + "/reports/graph-insights.json";
      if (!workspacePath) workspacePath = inferredRoot + "/reports/workspace.json";
    }
    var jobs = [];
    if (metricsPath) jobs.push(fetchJson(metricsPath).then(function (metrics) { state.metrics = metrics; }));
    if (inboxPath) jobs.push(fetchJson(inboxPath).then(function (inbox) { state.inbox = inbox; }).catch(function () { state.inbox = null; }));
    if (reviewPath) jobs.push(fetchText(reviewPath).then(function (text) { state.reviewText = text; }).catch(function () { state.reviewText = ""; }));
    if (pendingPath) jobs.push(loadPending(pendingPath).then(function (packets) { state.pendingPackets = packets; }));
    if (qualityPath) jobs.push(fetchJson(qualityPath).then(function (report) { state.reports.quality = report; }).catch(function () { state.reports.quality = null; }));
    if (benchmarkPath) jobs.push(fetchJson(benchmarkPath).then(function (report) { state.reports.benchmark = report; }).catch(function () { state.reports.benchmark = null; }));
    if (contributorsPath) jobs.push(fetchJson(contributorsPath).then(function (report) { state.reports.contributors = report; }).catch(function () { state.reports.contributors = null; }));
    if (decisionsPath) jobs.push(fetchJson(decisionsPath).then(function (report) { state.reports.decisions = report; }).catch(function () { state.reports.decisions = null; }));
    if (riskPath) jobs.push(fetchJson(riskPath).then(function (report) { state.reports.risk = report; }).catch(function () { state.reports.risk = null; }));
    if (moduleHealthPath) jobs.push(fetchJson(moduleHealthPath).then(function (report) { state.reports.moduleHealth = report; }).catch(function () { state.reports.moduleHealth = null; }));
    if (graphInsightsPath) jobs.push(fetchJson(graphInsightsPath).then(function (report) { state.reports.graphInsights = report; }).catch(function () { state.reports.graphInsights = null; }));
    if (workspacePath) jobs.push(fetchJson(workspacePath).then(function (report) { state.reports.workspace = report; }).catch(function () { state.reports.workspace = null; }));
    if (!graphPaths.length && !jobs.length) {
      loadHostedDefault();
      return;
    }
    setAutoLoad("loading project graph", false);
    Promise.all(graphPaths.map(function (path) {
      return loadGraphPath(path).then(function (graph) { return { fileName: graphLabels.get(path) || path.split("/").pop() || path, graph: graph }; });
    }).concat(jobs)).then(function (items) {
      var graphItems = items.filter(Boolean);
      if (!graphItems.length) {
        loadNormalizedGraph({ entities: [], edges: [], episodes: [] }, "project metrics");
        setAutoLoad("project console loaded", true);
        return;
      }
      var merged = mergeNormalizedGraphs(graphItems.map(function (item) { return normalizeGraph(item.graph); }));
      loadNormalizedGraph(merged, graphItems.map(function (item) { return item.fileName; }).join(", ") || "metrics");
      setAutoLoad("project console loaded", true);
    }).catch(function (error) {
      setAutoLoad("auto-load failed", false);
      showError("Could not auto-load graph: " + error.message);
    });
  }

  function loadHostedDefault() {
    setAutoLoad("loading hosted repo graph", false);
    Promise.all([
      loadGraphPath("./data/kage/graph.json"),
      loadGraphPath("./data/kage/code_graph/graph.json"),
      fetchJson("./data/kage/metrics.json").catch(function () { return null; }),
      fetchJson("./data/kage/inbox.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/risk.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/contributors.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/decisions.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/module-health.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/graph-insights.json").catch(function () { return null; }),
      fetchJson("./data/kage/reports/workspace.json").catch(function () { return null; })
    ]).then(function (items) {
      var merged = mergeNormalizedGraphs([normalizeGraph(items[0]), normalizeGraph(items[1])]);
      state.metrics = items[2];
      state.inbox = items[3];
      state.reports.risk = items[4];
      state.reports.contributors = items[5];
      state.reports.decisions = items[6];
      state.reports.moduleHealth = items[7];
      state.reports.graphInsights = items[8];
      state.reports.workspace = items[9];
      loadNormalizedGraph(merged, "Kage repo graph");
      setAutoLoad("Kage repo graph loaded", true);
    }).catch(function () {
      loadHostedDemo();
    });
  }

  function loadHostedDemo() {
    setAutoLoad("loading bundled demo graph", false);
    Promise.all([
      fetchJson("./demo/graph.json"),
      fetchJson("./demo/metrics.json").catch(function () { return null; })
    ]).then(function (items) {
      var graph = items[0];
      state.metrics = items[1];
      loadNormalizedGraph(normalizeGraph(graph), "bundled demo graph");
      setAutoLoad("bundled demo graph loaded", true);
    }).catch(function () {
      setAutoLoad("manual mode", false);
    });
  }

  function inferMemoryRoot(path) {
    var marker = "/.agent_memory/";
    var index = path.indexOf(marker);
    if (index === -1) return "";
    return path.slice(0, index + marker.length - 1);
  }

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error(response.status + " " + path);
      return response.json();
    });
  }

  function loadGraphPath(path) {
    return fetchJson(path).then(function (graph) {
      return hydrateCompactCodeGraph(graph, path);
    });
  }

  function resolveGraphRef(basePath, ref) {
    if (!ref) return ref;
    try {
      return new URL(ref, new URL(basePath, window.location.href)).href;
    } catch (_error) {
      var base = String(basePath || "");
      return base.replace(/\/[^/]*$/, "/" + ref);
    }
  }

  function hydrateCompactCodeGraph(graph, basePath) {
    if (!graph || graph.compact !== true || !graph.refs) return Promise.resolve(graph);
    if (graph.refs.entities && graph.refs.edges) {
      return Promise.all([
        fetchJson(resolveGraphRef(basePath, graph.refs.entities)),
        fetchJson(resolveGraphRef(basePath, graph.refs.edges)),
        graph.refs.episodes ? fetchJson(resolveGraphRef(basePath, graph.refs.episodes)) : Promise.resolve([])
      ]).then(function (items) {
        return Object.assign({}, graph, {
          compact: false,
          entities: items[0],
          edges: items[1],
          episodes: items[2]
        });
      });
    }
    return Promise.all([
      fetchJson(resolveGraphRef(basePath, graph.refs.files)),
      fetchJson(resolveGraphRef(basePath, graph.refs.symbols)),
      fetchJson(resolveGraphRef(basePath, graph.refs.imports))
    ]).then(function (items) {
      var fileOverrides = new Map(graph.file_parser_overrides || []);
      var symbolOverrides = new Map(graph.symbol_parser_overrides || []);
      return Object.assign({}, graph, {
        compact: false,
        files: (items[0] || []).map(function (file) {
          return fileOverrides.has(file.path) ? Object.assign({}, file, { parser: fileOverrides.get(file.path) }) : file;
        }),
        symbols: (items[1] || []).map(function (symbol) {
          return symbolOverrides.has(symbol.id) ? Object.assign({}, symbol, { parser: symbolOverrides.get(symbol.id) }) : symbol;
        }).concat(graph.extra_symbols || []),
        imports: (items[2] || []).concat(graph.extra_imports || [])
      });
    });
  }

  function fetchText(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error(response.status + " " + path);
      return response.text();
    });
  }

  function loadPending(path) {
    return fetchJson(path).then(function (listing) {
      var files = listing && Array.isArray(listing.files) ? listing.files : [];
      return Promise.all(files.map(function (file) { return fetchJson(file.path); }));
    }).catch(function () { return []; });
  }

  function setAutoLoad(text, ok) {
    if (!els.autoLoadStatus) return;
    els.autoLoadStatus.textContent = "auto-load: " + text;
    els.autoLoadStatus.className = "autoload-status " + (ok ? "ok" : "");
  }

  function readJsonFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve({ fileName: file.name, graph: JSON.parse(String(reader.result || "{}")) });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () { reject(new Error("Could not read " + file.name + ".")); };
      reader.readAsText(file);
    });
  }

  function isMetricsGraph(graph) {
    return graph && graph.code_graph && graph.memory_graph && graph.harness;
  }

  function mergeNormalizedGraphs(graphs) {
    var entities = new Map();
    var edges = new Map();
    var episodes = new Map();
    var aliasToCodeId = new Map();
    graphs.forEach(function (graph) {
      graph.entities.forEach(function (entity) {
        if (entity.graph_kind !== "code") return;
        aliasToCodeId.set(entity.id, entity.id);
        (entity.aliases || []).forEach(function (alias) { aliasToCodeId.set(alias, entity.id); });
      });
    });
    var remappedIds = new Map();
    graphs.forEach(function (graph) {
      graph.entities.forEach(function (entity) {
        var id = canonicalEntityId(entity, aliasToCodeId);
        remappedIds.set(entity.id, id);
        entities.set(id, mergeViewerEntity(entities.get(id), Object.assign({}, entity, {
          id: id,
          aliases: unique([entity.id].concat(entity.aliases || []))
        })));
      });
    });
    graphs.forEach(function (graph) {
      graph.edges.forEach(function (edge) {
        var from = remappedIds.get(edge.from) || edge.from;
        var to = remappedIds.get(edge.to) || edge.to;
        var crossesBoundary = crossesMemoryCodeBoundary(entities.get(from), entities.get(to));
        var memoryCodeLink = Boolean(crossesBoundary && (edge.memory_code_link || isMemoryCodeRelation(edge.relation) || edge.relation === "affects_path"));
        var id = edge.id + ":" + from + ":" + to;
        edges.set(id, Object.assign({}, edge, {
          id: id,
          from: from,
          to: to,
          memory_code_link: memoryCodeLink
        }));
      });
      graph.episodes.forEach(function (episode) { episodes.set(episode.id, episode); });
    });
    addPathPrefixBridgeEdges(entities, edges);
    return { entities: Array.from(entities.values()), edges: Array.from(edges.values()), episodes: Array.from(episodes.values()) };
  }

  function crossesMemoryCodeBoundary(from, to) {
    if (!from || !to) return false;
    return (from.graph_kind === "memory" && to.graph_kind === "code") ||
      (from.graph_kind === "code" && to.graph_kind === "memory");
  }

  function addPathPrefixBridgeEdges(entities, edges) {
    var codeFiles = Array.from(entities.values()).filter(function (entity) {
      return entity.graph_kind === "code" && entity.type === "file" && entity.path;
    });
    if (!codeFiles.length) return;

    var codeDegree = new Map();
    edges.forEach(function (edge) {
      var from = entities.get(edge.from);
      var to = entities.get(edge.to);
      if (from && from.graph_kind === "code") codeDegree.set(from.id, (codeDegree.get(from.id) || 0) + 1);
      if (to && to.graph_kind === "code") codeDegree.set(to.id, (codeDegree.get(to.id) || 0) + 1);
    });

    var total = 0;
    Array.from(edges.values()).filter(function (edge) {
      return edge.relation === "affects_path";
    }).forEach(function (edge) {
      if (total >= PATH_BRIDGE_EDGE_LIMIT_TOTAL) return;
      var memoryEntity = entities.get(edge.from);
      var pathEntity = entities.get(edge.to);
      if (!memoryEntity || !pathEntity || memoryEntity.graph_kind !== "memory") return;
      if (pathEntity.graph_kind === "code") return;

      var memoryPath = entityPathValue(pathEntity);
      var matches = codeFiles.filter(function (file) {
        return fileMatchesMemoryPath(file.path, memoryPath);
      }).sort(function (a, b) {
        return pathBridgeFileScore(b, memoryPath, codeDegree) - pathBridgeFileScore(a, memoryPath, codeDegree) ||
          String(a.path || "").localeCompare(String(b.path || ""));
      }).slice(0, PATH_BRIDGE_EDGE_LIMIT_PER_PATH);

      matches.forEach(function (file) {
        if (total >= PATH_BRIDGE_EDGE_LIMIT_TOTAL) return;
        var id = "path_bridge:" + edge.id + ":" + file.id;
        if (edges.has(id)) return;
        edges.set(id, {
          id: id,
          from: edge.from,
          to: file.id,
          relation: "affects_code_path",
          fact: (memoryEntity.name || "Memory") + " applies to code under " + (memoryPath || "repo root") + ": " + file.path + ".",
          confidence: Math.min(Number(edge.confidence || 0.7), 0.75),
          evidence: edge.evidence || [],
          commit: edge.commit,
          source: "viewer_path_bridge",
          graph_kind: "memory",
          memory_code_link: true
        });
        total += 1;
      });
    });
  }

  function entityPathValue(entity) {
    var candidates = [entity.path, entity.name].concat(entity.aliases || [], entity.id || []);
    for (var index = 0; index < candidates.length; index += 1) {
      var normalized = normalizeRepoPath(candidates[index]);
      if (normalized || normalized === "") return normalized;
    }
    return null;
  }

  function normalizeRepoPath(value) {
    if (value === null || value === undefined) return null;
    var text = String(value).trim();
    if (!text) return null;
    text = text.replace(/^path:/, "").replace(/^file:/, "").replace(/\\/g, "/");
    text = text.replace(/^\.\//, "").replace(/\/+/g, "/").replace(/\/$/, "");
    if ([".", "/", "root"].indexOf(text.toLowerCase()) !== -1) return "";
    return text;
  }

  function fileMatchesMemoryPath(filePath, memoryPath) {
    var file = normalizeRepoPath(filePath);
    if (file === null || memoryPath === null) return false;
    if (memoryPath === "") return true;
    return file === memoryPath || file.indexOf(memoryPath + "/") === 0;
  }

  function pathBridgeFileScore(file, memoryPath, codeDegree) {
    var path = String(file.path || "");
    var lower = path.toLowerCase();
    var score = (codeDegree.get(file.id) || 0) * 6;
    if (normalizeRepoPath(path) === memoryPath) score += 90;
    if (/^(readme|package|agents|claude)\./i.test(path.split("/").pop() || "")) score += 28;
    if (["source", "test"].indexOf(file.kind) !== -1) score += 14;
    if (lower.indexOf(".agent_memory/") !== -1 || lower.indexOf("node_modules/") !== -1 || lower.indexOf("dist/") !== -1 || lower.indexOf("build/") !== -1) score -= 80;
    score -= path.split("/").length * 2;
    score -= Math.min(20, path.length / 60);
    return score;
  }

  function canonicalEntityId(entity, aliasToCodeId) {
    if (!entity) return "";
    if (entity.graph_kind === "memory" && ["symbol", "test", "route", "file", "path"].indexOf(entity.type) !== -1) {
      var candidates = [entity.id, entity.name].concat(entity.aliases || []).filter(function (value) {
        return canonicalAliasMatchesEntityType(value, entity.type);
      });
      var alias = candidates.find(function (value) { return aliasToCodeId.has(value); });
      if (alias) return aliasToCodeId.get(alias);
    }
    return aliasToCodeId.get(entity.id) || entity.id;
  }

  function canonicalAliasMatchesEntityType(value, type) {
    if (!value) return false;
    var text = String(value);
    if (type === "file" || type === "path") return true;
    if (type === "route") return text.indexOf("route:") === 0;
    if (type === "test") return text.indexOf("symbol:") === 0 || text.indexOf("test:") === 0;
    if (type === "symbol") return text.indexOf("symbol:") === 0;
    return false;
  }

  function mergeViewerEntity(existing, next) {
    if (!existing) return next;
    var graphKinds = unique([existing.graph_kind, next.graph_kind].concat(existing.graph_kinds || []).concat(next.graph_kinds || []));
    var preferred = next.graph_kind === "code" ? next : existing;
    return Object.assign({}, existing, preferred, {
      aliases: unique((existing.aliases || []).concat(next.aliases || [])),
      evidence: unique((existing.evidence || []).concat(next.evidence || [])),
      graph_kind: graphKinds.indexOf("code") !== -1 ? "code" : existing.graph_kind,
      graph_kinds: graphKinds
    });
  }

  function normalizeGraph(graph) {
    if (Array.isArray(graph.entities) && Array.isArray(graph.edges)) {
      return {
        entities: graph.entities.map(function (entity) { return Object.assign({ graph_kind: "memory" }, entity); }),
        edges: graph.edges.map(function (edge) { return Object.assign({ graph_kind: "memory" }, edge); }),
        episodes: Array.isArray(graph.episodes) ? graph.episodes : []
      };
    }

    if (Array.isArray(graph.files) || Array.isArray(graph.symbols)) {
      return normalizeCodeGraph(graph);
    }

    return { entities: [], edges: [], episodes: [] };
  }

  function normalizeCodeGraph(graph) {
    var entities = [];
    var edges = [];
    var seen = new Set();
    var addEntity = function (entity) {
      if (seen.has(entity.id)) return;
      seen.add(entity.id);
      entities.push(entity);
    };
    var addEdge = function (from, to, relation, fact, source, options) {
      if (!from || !to) return;
      options = options || {};
      edges.push({
        id: relation + ":" + from + ":" + to + ":" + edges.length,
        from: from,
        to: to,
        relation: relation,
        fact: fact,
        confidence: options.confidence == null ? 1 : Number(options.confidence),
        evidence: [],
        commit: graph.repo_state && graph.repo_state.head,
        source: source || "code_graph",
        graph_kind: "code",
        resolution: options.resolution
      });
    };

    (graph.files || []).forEach(function (file) {
      addEntity({
        id: "file:" + file.path,
        type: "file",
        graph_kind: "code",
        name: file.path,
        summary: file.kind + " file, " + file.language + ", " + file.line_count + " lines",
        aliases: [file.hash, file.path],
        path: file.path,
        language: file.language,
        parser: file.parser,
        kind: file.kind,
        size_bytes: file.size_bytes,
        line_count: file.line_count,
        hash: file.hash,
        evidence: []
      });
    });

    (graph.symbols || []).forEach(function (symbol) {
      addEntity({
        id: symbol.id,
        type: symbol.kind === "test" ? "test" : "symbol",
        graph_kind: "code",
        name: symbol.name,
        summary: symbol.kind + " in " + symbol.path + ":" + symbol.line + (symbol.signature ? "\n" + symbol.signature : ""),
        aliases: [],
        path: symbol.path,
        language: symbol.language,
        parser: symbol.parser,
        kind: symbol.kind,
        exported: Boolean(symbol.export),
        line: symbol.line,
        end_line: symbol.end_line,
        signature: symbol.signature,
        evidence: []
      });
      addEdge("file:" + symbol.path, symbol.id, "defines_symbol", symbol.path + " defines " + symbol.kind + " " + symbol.name + ".", "symbols");
    });

    (graph.imports || []).forEach(function (item) {
      if (item.to_path) addEdge("file:" + item.from_path, "file:" + item.to_path, "imports", item.from_path + " imports " + item.specifier + ".", "imports");
      else {
        var externalId = "external:" + item.specifier;
        addEntity({ id: externalId, type: "external", graph_kind: "code", name: item.specifier, summary: "External import", aliases: [], evidence: [] });
        addEdge("file:" + item.from_path, externalId, "imports_external", item.from_path + " imports " + item.specifier + ".", "imports");
      }
    });

    (graph.calls || []).forEach(function (call) {
      var confidence = call.confidence == null ? 0.7 : Number(call.confidence);
      addEdge(call.from_symbol || "file:" + call.path, call.to_symbol, "calls", call.path + ":" + call.line + " calls target symbol.", "calls", {
        confidence: confidence,
        resolution: call.resolution
      });
    });

    (graph.routes || []).forEach(function (route) {
      addEntity({
        id: route.id,
        type: "route",
        graph_kind: "code",
        name: route.method + " " + route.path,
        summary: route.framework + " route in " + route.file_path + ":" + route.line,
        aliases: [],
        path: route.file_path,
        method: route.method,
        route_path: route.path,
        framework: route.framework,
        handler_symbol: route.handler_symbol,
        line: route.line,
        evidence: []
      });
      addEdge("file:" + route.file_path, route.id, "defines_route", route.file_path + " defines " + route.method + " " + route.path + ".", "routes");
      if (route.handler_symbol) addEdge(route.id, route.handler_symbol, "handled_by", route.method + " " + route.path + " is handled by a symbol.", "routes");
    });

    (graph.tests || []).forEach(function (test) {
      addEdge(test.test_symbol, test.covers_symbol ? symbolEntityId(graph, test.covers_symbol, test.covers_path) : "file:" + test.covers_path, "covers", test.title + " covers " + (test.covers_symbol || test.covers_path || "unknown") + ".", "tests");
    });

    (graph.packages || []).forEach(function (pkg) {
      var id = pkg.kind + ":" + pkg.name;
      addEntity({ id: id, type: pkg.kind === "script" ? "script" : "external", graph_kind: "code", name: pkg.name, summary: pkg.kind + ": " + pkg.version, aliases: [], evidence: [] });
    });

    return { entities: entities, edges: edges, episodes: [] };
  }

  function symbolEntityId(graph, name, path) {
    var match = (graph.symbols || []).find(function (symbol) {
      return symbol.name === name && (!path || symbol.path === path);
    });
    return match ? match.id : null;
  }

  function isMemoryCodeRelation(relation) {
    return MEMORY_CODE_RELATIONS.has(String(relation || ""));
  }

  function populateFilters() {
    replaceOptions(els.typeFilter, "All types", unique(state.entities.map(function (entity) {
      return entity.type || "unknown";
    })));
    replaceOptions(els.relationFilter, "All relations", unique(state.edges.map(function (edge) {
      return edge.relation || "related";
    })));
    if (state.edges.some(function (edge) { return edge.memory_code_link; })) {
      els.relationFilter.appendChild(new Option("Memory <-> Code only", "__memory_code__"));
    }
  }

  function replaceOptions(select, label, values) {
    select.textContent = "";
    select.appendChild(new Option(label, ""));
    values.sort().forEach(function (value) {
      select.appendChild(new Option(value, value));
    });
  }

  function populatePathOptions() {
    if (!els.pathNodeOptions) return;
    var seen = new Set();
    els.pathNodeOptions.textContent = "";
    pathCandidateEntities().slice(0, 500).forEach(function (entity) {
      [entity.path, displayName(entity), entity.id].filter(Boolean).forEach(function (value) {
        var text = String(value);
        if (seen.has(text)) return;
        seen.add(text);
        var option = document.createElement("option");
        option.value = text;
        els.pathNodeOptions.appendChild(option);
      });
    });
  }

  function pathCandidateEntities() {
    return state.entities
      .filter(function (entity) {
        return entity.graph_kind === "code" && ["file", "symbol", "route", "test", "script"].indexOf(entity.type) !== -1;
      })
      .sort(function (a, b) {
        return entityImportance(b) - entityImportance(a) || displayName(a).localeCompare(displayName(b));
      });
  }

  function resolvePathEntity(value) {
    var query = String(value || "").trim();
    if (!query) return null;
    var lower = query.toLowerCase();
    var candidates = pathCandidateEntities();
    var exact = candidates.filter(function (entity) {
      return String(entity.id || "").toLowerCase() === lower ||
        String(entity.path || "").toLowerCase() === lower ||
        displayName(entity).toLowerCase() === lower;
    });
    if (exact.length) return exact[0];
    var partial = candidates.filter(function (entity) {
      return String(entity.path || "").toLowerCase().indexOf(lower) !== -1 ||
        displayName(entity).toLowerCase().indexOf(lower) !== -1 ||
        String(entity.id || "").toLowerCase().indexOf(lower) !== -1;
    });
    return partial[0] || null;
  }

  function codePathEdges() {
    var relations = new Set(["imports", "imports_external", "defines_symbol", "calls", "covers", "defines_route", "handled_by"]);
    return state.edges.filter(function (edge) {
      if (!relations.has(edge.relation)) return false;
      var from = state.entityById.get(edge.from);
      var to = state.entityById.get(edge.to);
      return from && to && from.graph_kind === "code" && to.graph_kind === "code";
    });
  }

  function shortestCodePath(fromId, toId, undirected) {
    var adjacency = new Map();
    codePathEdges().forEach(function (edge) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from).push({ to: edge.to, edge: edge });
      if (undirected) {
        if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
        adjacency.get(edge.to).push({ to: edge.from, edge: edge });
      }
    });
    var queue = [fromId];
    var seen = new Set([fromId]);
    var previous = new Map();
    while (queue.length) {
      var current = queue.shift();
      if (current === toId) break;
      (adjacency.get(current) || []).forEach(function (step) {
        if (seen.has(step.to)) return;
        seen.add(step.to);
        previous.set(step.to, { from: current, edge: step.edge });
        queue.push(step.to);
      });
    }
    if (!seen.has(toId)) return null;
    var nodes = [toId];
    var edges = [];
    var cursor = toId;
    while (cursor !== fromId) {
      var prev = previous.get(cursor);
      if (!prev) return null;
      edges.unshift(prev.edge.id);
      cursor = prev.from;
      nodes.unshift(cursor);
    }
    return { nodes: nodes, edges: edges };
  }

  function findDependencyPath() {
    var from = resolvePathEntity(els.pathFromInput.value);
    var to = resolvePathEntity(els.pathToInput.value);
    if (!from || !to) {
      setPathStatus("Could not resolve both endpoints. Try a file path or exact symbol name.", "warn");
      return;
    }
    if (from.id === to.id) {
      setPathStatus("Pick two different code nodes.", "warn");
      return;
    }
    var direction = "forward";
    var path = shortestCodePath(from.id, to.id, false);
    if (!path) {
      var reverse = shortestCodePath(to.id, from.id, false);
      if (reverse) {
        direction = "reverse";
        path = {
          nodes: reverse.nodes.slice().reverse(),
          edges: reverse.edges.slice().reverse()
        };
      }
    }
    if (!path) {
      direction = "undirected";
      path = shortestCodePath(from.id, to.id, true);
    }
    if (!path) {
      state.pathHighlight = { nodes: new Set(), edges: new Set(), direction: "", steps: [] };
      els.pathResult.textContent = "";
      els.pathResult.className = "path-result";
      setPathStatus("No code dependency path found between those nodes.", "warn");
      render();
      return;
    }
    state.pathHighlight = {
      nodes: new Set(path.nodes),
      edges: new Set(path.edges),
      direction: direction,
      steps: path.nodes
    };
    setPathStatus(path.nodes.length + " nodes, " + path.edges.length + " edge(s), " + direction + " path.", "ok");
    renderPathResult(path.nodes, path.edges);
    state.lastVisibleSignature = "";
    render();
  }

  function setPathStatus(text, status) {
    els.pathStatus.textContent = text;
    els.pathStatus.className = "path-status" + (status ? " " + status : "");
  }

  function clearDependencyPath(renderNow) {
    state.pathHighlight = { nodes: new Set(), edges: new Set(), direction: "", steps: [] };
    if (els.pathFromInput) els.pathFromInput.value = "";
    if (els.pathToInput) els.pathToInput.value = "";
    if (els.pathResult) {
      els.pathResult.textContent = "";
      els.pathResult.className = "path-result";
    }
    if (els.pathStatus) setPathStatus("Pick two code nodes to trace a dependency path.", "");
    if (renderNow !== false) {
      state.lastVisibleSignature = "";
      render();
    }
  }

  function renderPathResult(nodes, edges) {
    els.pathResult.textContent = "";
    nodes.forEach(function (id, index) {
      var entity = state.entityById.get(id);
      var edge = index > 0 ? state.edgeById.get(edges[index - 1]) : null;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "path-step";
      button.innerHTML = "<strong></strong><span></span>";
      button.querySelector("strong").textContent = entity ? displayName(entity) : id;
      button.querySelector("span").textContent = [
        index === 0 ? "start" : edge ? edge.relation : "path",
        entity && entity.path ? entity.path : id
      ].filter(Boolean).join(" | ");
      button.addEventListener("click", function () {
        selectEntity(id, true);
        render();
      });
      els.pathResult.appendChild(button);
    });
    els.pathResult.className = "path-result visible";
  }

  function layoutGraph(visibleIds) {
    state.positions = new Map();
    var candidates = state.entities.filter(function (entity) {
      return !visibleIds || visibleIds.has(entity.id);
    });
    var lanes = [
      { name: "memory", x: 170, y: 96, step: 82, columns: 10, match: function (entity) { return entity.graph_kind === "memory"; } },
      { name: "files", x: 470, y: 86, step: 78, columns: 10, match: function (entity) { return entity.graph_kind === "code" && entity.type === "file"; } },
      { name: "flow", x: 760, y: 96, step: 76, columns: 10, match: function (entity) { return entity.graph_kind === "code" && ["symbol", "route", "test"].indexOf(entity.type) !== -1; } },
      { name: "external", x: 1040, y: 122, step: 78, columns: 8, match: function (entity) { return isDependencyEntity(entity) || (entity.graph_kind === "code" && ["external", "script"].indexOf(entity.type) !== -1); } },
      { name: "other", x: 760, y: 560, step: 78, columns: 8, match: function (entity) { return ["memory", "code"].indexOf(entity.graph_kind) === -1 || (entity.graph_kind === "code" && ["file", "symbol", "route", "test", "external", "script"].indexOf(entity.type) === -1); } }
    ];
    var placed = new Set();
    lanes.forEach(function (lane) {
      var bucket = candidates.filter(function (entity) {
        return !placed.has(entity.id) && lane.match(entity);
      }).sort(function (a, b) {
        return entityImportance(b) - entityImportance(a) || displayName(a).localeCompare(displayName(b));
      });
      if (!bucket.length) return;
      bucket.forEach(function (entity, index) {
        placed.add(entity.id);
        var column = Math.floor(index / lane.columns);
        var row = index % lane.columns;
        var xOffset = column * 228;
        var yJitter = column % 2 ? 26 : 0;
        state.positions.set(entity.id, {
          x: lane.x + xOffset,
          y: lane.y + row * lane.step + yJitter
        });
      });
    });
  }

  function render() {
    if (!state.graph) return;

    var query = parseSearchQuery(els.searchInput.value);
    state.renderQuery = query;
    var mode = els.viewMode.value;
    var type = els.typeFilter.value;
    var relation = els.relationFilter.value;
    var matchedEntityIds = new Set();
    var matchedEdgeIds = new Set();

    state.entities.forEach(function (entity) {
      if (mode !== "combined" && entity.graph_kind !== mode) return;
      var passesType = !type || entity.type === type;
      var passesSearch = matchesSearchQuery(entity, query);
      if (passesType && passesSearch) matchedEntityIds.add(entity.id);
    });

    state.edges.forEach(function (edge) {
      if (mode !== "combined" && edge.graph_kind !== mode) return;
      var fromMatched = matchedEntityIds.has(edge.from);
      var toMatched = matchedEntityIds.has(edge.to);
      var edgeMatchesSearch = matchesSearchQuery(edge, query);
      var passesRelation = !relation || (relation === "__memory_code__" ? edge.memory_code_link : edge.relation === relation);
      if (passesRelation && (edgeMatchesSearch || fromMatched || toMatched)) {
        matchedEdgeIds.add(edge.id);
        if (!type) {
          if (state.entityById.has(edge.from)) matchedEntityIds.add(edge.from);
          if (state.entityById.has(edge.to)) matchedEntityIds.add(edge.to);
        }
      }
    });

    if (!query.active && !type && !relation) {
      matchedEntityIds = new Set(state.entities.filter(function (entity) { return mode === "combined" || entity.graph_kind === mode; }).map(function (entity) { return entity.id; }));
      matchedEdgeIds = new Set(state.edges.filter(function (edge) { return mode === "combined" || edge.graph_kind === mode; }).map(function (edge) { return edge.id; }));
    }

    var actionFiltered = applyMatchedGraphActionFilter(matchedEntityIds, matchedEdgeIds);
    matchedEntityIds = actionFiltered.entities;
    matchedEdgeIds = actionFiltered.edges;

    var visible = refineVisibleGraph(matchedEntityIds, matchedEdgeIds, {
      query: query,
      type: type,
      relation: relation,
      scope: els.scopeFilter.value,
      mode: mode,
      maxNodes: Number(els.maxNodes.value || 90),
      showDependencies: els.showDependencies.checked
    });

    state.visibleEntityIds = visible.entities;
    state.visibleEdgeIds = visible.edges;
    layoutGraph(state.visibleEntityIds);
    var nextSignature = visibleSignature(state.visibleEntityIds, state.visibleEdgeIds);
    var graphChanged = nextSignature !== state.lastVisibleSignature;
    state.lastVisibleSignature = nextSignature;

    renderActiveGraph(graphChanged);
    renderPagePanels();
  }

  function scheduleRender() {
    if (state.renderRaf) return;
    state.renderRaf = window.requestAnimationFrame(function () {
      state.renderRaf = null;
      render();
    });
  }

  function renderPagePanels() {
    if (state.viewerPage === "graph") {
      renderDetails();
      renderMetrics();
      return;
    }
    if (state.viewerPage === "memory") {
      renderDetails();
      renderMemoryLibrary();
      return;
    }
    if (state.viewerPage === "owners") {
      renderOwners();
      return;
    }
    if (state.viewerPage === "intel") {
      renderIntelligence();
      return;
    }
    if (state.viewerPage === "review") {
      renderReviewQueue();
      renderProof();
      return;
    }
    if (state.viewerPage === "data") {
      renderDetails();
      renderArtifactDiagnostics(state.entities, state.edges);
      renderLists();
      return;
    }
    renderDashboard();
  }

  function applyGraphActionFilter(filter) {
    state.graphActionFilter = state.graphActionFilter === filter ? "" : filter;
    if (filter === "memory-code") {
      els.viewMode.value = "combined";
      els.relationFilter.value = "__memory_code__";
    } else if (state.graphActionFilter) {
      els.viewMode.value = "combined";
      els.relationFilter.value = "";
    }
    state.lastVisibleSignature = "";
    render();
  }

  function clearGraphActionFilter() {
    state.graphActionFilter = "";
  }

  function applyMatchedGraphActionFilter(entityIds, edgeIds) {
    if (!state.graphActionFilter) return { entities: entityIds, edges: edgeIds };
    if (state.graphActionFilter === "memory-code") {
      var memoryCodeEdges = state.edges.filter(isMemoryCodeEdge);
      return entitiesForEdges(memoryCodeEdges);
    }
    if (state.graphActionFilter === "untrusted") {
      var flagged = state.edges.filter(function (edge) { return reviewStatus(edge) !== "ok"; });
      return entitiesForEdges(flagged);
    }
    if (state.graphActionFilter === "uncovered") {
      var covered = memoryLinkedCodeKeys();
      var uncovered = state.entities.filter(function (entity) {
        return entity.graph_kind === "code" && entity.type === "file" && !covered.has(codeCoverageKey(entity));
      });
      var entities = new Set(uncovered.map(function (entity) { return entity.id; }));
      return { entities: entities, edges: edgesWithVisibleEndpoints(new Set(state.edges.map(function (edge) { return edge.id; })), entities) };
    }
    return { entities: entityIds, edges: edgeIds };
  }

  function entitiesForEdges(edges) {
    var entities = new Set();
    var edgeIds = new Set();
    edges.forEach(function (edge) {
      edgeIds.add(edge.id);
      if (state.entityById.has(edge.from)) entities.add(edge.from);
      if (state.entityById.has(edge.to)) entities.add(edge.to);
    });
    return { entities: entities, edges: edgeIds };
  }

  function refineVisibleGraph(entityIds, edgeIds, options) {
    var entities = new Set(entityIds);
    var edges = new Set(edgeIds);

    if (!options.showDependencies) {
      Array.from(entities).forEach(function (id) {
        var entity = state.entityById.get(id);
        if (!entity) return;
        if (isDependencyEntity(entity) && !matchesSearchQuery(entity, options.query)) {
          entities.delete(id);
        }
      });
      edges = edgesWithVisibleEndpoints(edges, entities);
    }

    if (options.scope === "focus" && state.selected) {
      var focused = focusSelection(entities, edges, state.selected);
      entities = focused.entities;
      edges = focused.edges;
    } else if (options.scope === "signal" && entities.size > options.maxNodes) {
      var ranked = Array.from(entities).sort(function (a, b) {
        return entityImportance(state.entityById.get(b)) - entityImportance(state.entityById.get(a)) ||
          displayName(state.entityById.get(a)).localeCompare(displayName(state.entityById.get(b)));
      });
      entities = options.mode === "combined"
        ? balancedSignalEntities(ranked, edges, options.maxNodes)
        : connectedSignalEntities(ranked, edges, options.maxNodes);
      if (state.selected && state.selected.kind === "entity") entities.add(state.selected.id);
      edges = edgesWithVisibleEndpoints(edges, entities);
    }

    if (state.selected && state.selected.kind === "edge" && edges.has(state.selected.id)) {
      var selectedEdge = state.edges.find(function (edge) { return edge.id === state.selected.id; });
      if (selectedEdge) {
        entities.add(selectedEdge.from);
        entities.add(selectedEdge.to);
      }
    }

    if (state.pathHighlight && state.pathHighlight.nodes.size) {
      state.pathHighlight.nodes.forEach(function (id) { entities.add(id); });
      state.pathHighlight.edges.forEach(function (id) { edges.add(id); });
    }

    var cappedEdges = capVisibleEdges(edgesWithVisibleEndpoints(edges, entities), entities, options);
    if (state.pathHighlight && state.pathHighlight.edges.size) {
      state.pathHighlight.edges.forEach(function (id) { if (edges.has(id)) cappedEdges.add(id); });
    }
    return { entities: entities, edges: cappedEdges };
  }

  function capVisibleEdges(edgeIds, entityIds, options) {
    var maxEdges = clamp(Math.round((options.maxNodes || 90) * VISIBLE_EDGE_MULTIPLIER), VISIBLE_EDGE_MIN, VISIBLE_EDGE_MAX);
    if (edgeIds.size <= maxEdges) return edgeIds;

    var sorted = Array.from(edgeIds).sort(function (a, b) {
      return edgeDisplayImportance(state.edgeById.get(b), entityIds) - edgeDisplayImportance(state.edgeById.get(a), entityIds) ||
        String(a).localeCompare(String(b));
    });
    if (options.mode !== "combined" || options.relation || options.query.active) {
      return new Set(sorted.slice(0, maxEdges));
    }

    var result = new Set();
    var codeEdges = [];
    var memoryCodeEdges = [];
    var memoryEdges = [];
    var otherEdges = [];
    sorted.forEach(function (id) {
      var edge = state.edgeById.get(id);
      var from = edge && state.entityById.get(edge.from);
      var to = edge && state.entityById.get(edge.to);
      if (!edge || !from || !to) return;
      if (isMemoryCodeEdge(edge)) memoryCodeEdges.push(id);
      else if (from.graph_kind === "code" && to.graph_kind === "code") codeEdges.push(id);
      else if (from.graph_kind === "memory" && to.graph_kind === "memory") memoryEdges.push(id);
      else otherEdges.push(id);
    });

    var codeBudget = Math.round(maxEdges * 0.30);
    var memoryCodeBudget = Math.round(maxEdges * 0.50);
    var memoryBudget = Math.round(maxEdges * 0.14);
    takeEdges(result, codeEdges, codeBudget);
    takeEdges(result, memoryCodeEdges, memoryCodeBudget);
    takeEdges(result, memoryEdges, memoryBudget);
    takeEdges(result, otherEdges, maxEdges - result.size);
    takeEdges(result, sorted, maxEdges - result.size);
    return result;
  }

  function takeEdges(result, ids, count) {
    var target = result.size + Math.max(0, count);
    ids.forEach(function (id) {
      if (result.size < target) result.add(id);
    });
  }

  function edgeDisplayImportance(edge, entityIds) {
    if (!edge) return -1000;
    var from = state.entityById.get(edge.from);
    var to = state.entityById.get(edge.to);
    var score = entityImportance(from) + entityImportance(to);
    var relation = String(edge.relation || "");
    if (state.selected && state.selected.kind === "edge" && state.selected.id === edge.id) score += 10000;
    if (state.selected && state.selected.kind === "entity" && (state.selected.id === edge.from || state.selected.id === edge.to)) score += 1600;
    if (isMemoryCodeEdge(edge)) {
      if (relation === "affects_code_path") score += 520;
      else if (["fixes_symbol", "verified_by_test"].indexOf(relation) !== -1) score += 420;
      else if (["explains_symbol", "informs_symbol", "applies_to_route"].indexOf(relation) !== -1) score += 300;
      else score += 120;
    } else if (["defines_symbol", "calls", "covers", "imports", "defines_route", "handled_by"].indexOf(relation) !== -1) {
      score += 360;
    } else if (["contains_memory", "has_type", "mentions_tag", "verified_by"].indexOf(relation) !== -1) {
      score += 160;
    }
    if (entityIds && entityIds.has(edge.from) && entityIds.has(edge.to)) score += 30;
    return score;
  }

  function balancedSignalEntities(rankedIds, edgeIds, maxNodes) {
    var result = new Set();
    var memoryIds = rankedIds.filter(function (id) {
      var entity = state.entityById.get(id);
      return entity && entity.graph_kind === "memory" && ["memory", "repo", "memory_type", "command"].indexOf(entity.type) !== -1;
    });
    var codeIds = rankedIds.filter(function (id) {
      var entity = state.entityById.get(id);
      return entity && entity.graph_kind === "code";
    });
    var otherMemoryIds = rankedIds.filter(function (id) {
      var entity = state.entityById.get(id);
      return entity && entity.graph_kind === "memory" && !memoryIds.includes(id);
    });

    var memoryBudget = clamp(Math.round(maxNodes * 0.30), 14, Math.min(36, maxNodes));
    memoryIds.slice(0, memoryBudget).forEach(function (id) { result.add(id); });
    otherMemoryIds.slice(0, Math.max(0, Math.round(memoryBudget * 0.35))).forEach(function (id) { result.add(id); });

    var bridgeBudget = Math.max(0, Math.round(maxNodes * 0.22));
    memoryCodeConnectionsForIds(result).forEach(function (id) {
      if (result.size < maxNodes && bridgeBudget > 0 && result.size < memoryBudget + bridgeBudget) result.add(id);
    });

    var codeBudget = Math.max(0, maxNodes - result.size);
    connectedSignalEntities(codeIds, edgeIds, codeBudget).forEach(function (id) {
      if (result.size < maxNodes) result.add(id);
    });

    memoryCodeConnectionsForIds(result).forEach(function (id) {
      if (result.size < maxNodes) result.add(id);
    });
    rankedIds.forEach(function (id) {
      if (result.size < maxNodes) result.add(id);
    });
    return result;
  }

  function memoryCodeConnectionsForIds(entityIds) {
    var connected = new Map();
    state.edges.forEach(function (edge) {
      if (!isMemoryCodeEdge(edge)) return;
      if (entityIds.has(edge.from) && !entityIds.has(edge.to)) {
        connected.set(edge.to, Math.max(connected.get(edge.to) || 0, memoryCodePeerImportance(edge, edge.to)));
      }
      if (entityIds.has(edge.to) && !entityIds.has(edge.from)) {
        connected.set(edge.from, Math.max(connected.get(edge.from) || 0, memoryCodePeerImportance(edge, edge.from)));
      }
    });
    return Array.from(connected.keys()).sort(function (a, b) {
      return (connected.get(b) || 0) - (connected.get(a) || 0) ||
        displayName(state.entityById.get(a)).localeCompare(displayName(state.entityById.get(b)));
    });
  }

  function memoryCodePeerImportance(edge, peerId) {
    var peer = state.entityById.get(peerId);
    var score = entityImportance(peer);
    var relation = String(edge.relation || "");
    if (relation === "affects_code_path") score += 900;
    if (["fixes_symbol", "verified_by_test"].indexOf(relation) !== -1) score += 520;
    if (["explains_symbol", "informs_symbol", "applies_to_route"].indexOf(relation) !== -1) score += 360;
    if (peer && peer.type === "file") score += 180;
    return score;
  }

  function connectedSignalEntities(rankedIds, edgeIds, maxNodes) {
    var result = new Set();
    var candidates = new Set(rankedIds);
    var neighbors = new Map();
    edgeIds.forEach(function (edgeId) {
      var edge = state.edgeById.get(edgeId);
      if (!edge || !candidates.has(edge.from) || !candidates.has(edge.to)) return;
      if (!neighbors.has(edge.from)) neighbors.set(edge.from, []);
      if (!neighbors.has(edge.to)) neighbors.set(edge.to, []);
      neighbors.get(edge.from).push(edge.to);
      neighbors.get(edge.to).push(edge.from);
    });

    rankedIds.forEach(function (id) {
      if (result.size >= maxNodes) return;
      result.add(id);
      (neighbors.get(id) || [])
        .sort(function (a, b) {
          return entityImportance(state.entityById.get(b)) - entityImportance(state.entityById.get(a)) ||
            displayName(state.entityById.get(a)).localeCompare(displayName(state.entityById.get(b)));
        })
        .forEach(function (peer) {
          if (result.size < maxNodes) result.add(peer);
        });
    });
    rankedIds.forEach(function (id) {
      if (result.size < maxNodes) result.add(id);
    });
    return result;
  }

  function focusSelection(entityIds, edgeIds, selection) {
    var entities = new Set();
    var edges = new Set();
    if (selection.kind === "entity") {
      entities.add(selection.id);
      state.edges.forEach(function (edge) {
        if (!edgeIds.has(edge.id)) return;
        if (edge.from === selection.id || edge.to === selection.id) {
          edges.add(edge.id);
          entities.add(edge.from);
          entities.add(edge.to);
        }
      });
    } else {
      var selectedEdge = state.edges.find(function (edge) { return edge.id === selection.id; });
      if (selectedEdge && edgeIds.has(selectedEdge.id)) {
        edges.add(selectedEdge.id);
        entities.add(selectedEdge.from);
        entities.add(selectedEdge.to);
      }
    }
    entityIds.forEach(function (id) {
      if (entities.has(id)) return;
      var entity = state.entityById.get(id);
      if (entity && entity.graph_kind === "memory" && entities.size < 16) entities.add(id);
    });
    return { entities: entities.size ? entities : entityIds, edges: edges.size ? edges : edgeIds };
  }

  function edgesWithVisibleEndpoints(edgeIds, entityIds) {
    return new Set(Array.from(edgeIds).filter(function (id) {
      var edge = state.edgeById.get(id);
      return edge && entityIds.has(edge.from) && entityIds.has(edge.to);
    }));
  }

  function activeRenderMode() {
    return els.renderMode && els.renderMode.value === "3d" ? "3d" : "2d";
  }

  function renderActiveGraph(graphChanged) {
    var mode = activeRenderMode();
    updateGraphSurfaceMode(mode);
    syncSimulationGraph(graphChanged);
    if (mode === "3d") {
      stopSimulation();
      renderThreeGraph(graphChanged);
      return;
    }
    stopThreeGraph();
    renderCanvasGraph(graphChanged, true);
  }

  function updateGraphSurfaceMode(mode) {
    if (els.graphWrap) {
      els.graphWrap.classList.toggle("mode-3d", mode === "3d");
      els.graphWrap.classList.toggle("mode-2d", mode !== "3d");
    }
    if (els.interactionHint) {
      els.interactionHint.textContent = mode === "3d"
        ? "drag orb or node / wheel zoom / click node"
        : "drag canvas / wheel zoom / click node";
    }
    if (els.tooltip) els.tooltip.classList.remove("visible");
  }

  function resizeActiveGraph() {
    if (activeRenderMode() === "3d") {
      resizeThreeGraph();
      renderThreeFrame();
      return;
    }
    resizeCanvas();
    fitCanvas();
    drawCanvasGraph();
  }

  function fitActiveGraph() {
    if (activeRenderMode() === "3d") {
      fitThreeGraph();
      renderThreeFrame();
      return;
    }
    fitCanvas();
    drawCanvasGraph();
  }

  function zoomGraph(factor) {
    if (activeRenderMode() === "3d") {
      zoomThreeGraph(factor);
      renderThreeFrame();
      return;
    }
    zoomCanvas(factor);
  }

  function renderCanvasGraph(graphChanged, alreadySynced) {
    resizeCanvas();
    if (!alreadySynced) syncSimulationGraph(graphChanged);
    if (graphChanged) fitCanvas();
    startSimulation();
    drawCanvasGraph();
  }

  function resizeCanvas() {
    var canvas = els.canvas;
    var ctx = canvas.getContext("2d");
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var width = Math.max(320, rect.width);
    var height = Math.max(360, rect.height);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function syncSimulationGraph(forceReset) {
    var existing = state.sim.nodeById;
    var visibleEntities = state.entities.filter(function (entity) { return state.visibleEntityIds.has(entity.id); });
    var nextNodes = visibleEntities.map(function (entity, index) {
      var current = existing.get(entity.id);
      var lanePos = state.positions.get(entity.id);
      var seed = seededPosition(index, visibleEntities.length);
      var degree = degreeOf(entity.id);
      if (!current || forceReset) {
        current = {
          id: entity.id,
          entity: entity,
          x: lanePos ? lanePos.x : seed.x,
          y: lanePos ? lanePos.y : seed.y,
          vx: 0,
          vy: 0,
          r: clamp(9 + degree * 1.7, 10, entity.graph_kind === "memory" ? 25 : 22)
        };
      }
      current.entity = entity;
      current.r = clamp(9 + degree * 1.7, 10, entity.graph_kind === "memory" ? 25 : 22);
      return current;
    });
    state.sim.nodes = nextNodes;
    state.sim.nodeById = new Map(nextNodes.map(function (node) { return [node.id, node]; }));
    state.sim.edges = state.edges.filter(function (edge) {
      return state.visibleEdgeIds.has(edge.id) && state.sim.nodeById.has(edge.from) && state.sim.nodeById.has(edge.to);
    });
    state.sim.adjacency = buildAdjacency(state.sim.edges);
    if (forceReset) {
      state.sim.tick = 0;
      state.sim.idleFrames = 0;
    }
  }

  function buildAdjacency(edges) {
    var adjacency = new Map();
    edges.forEach(function (edge) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
      adjacency.get(edge.from).add(edge.to);
      adjacency.get(edge.to).add(edge.from);
    });
    return adjacency;
  }

  function seededPosition(index, total) {
    var angle = (Math.PI * 2 * index) / Math.max(1, total);
    var radius = 220 + Math.min(180, total * 2);
    return {
      x: Math.cos(angle) * radius + 520,
      y: Math.sin(angle) * radius + 340
    };
  }

  function startSimulation() {
    if (state.sim.running) return;
    state.sim.running = true;
    state.sim.raf = window.requestAnimationFrame(simulationTick);
  }

  function stopSimulation() {
    state.sim.running = false;
    if (state.sim.raf) window.cancelAnimationFrame(state.sim.raf);
    state.sim.raf = null;
  }

  function simulationTick() {
    if (!state.sim.running) return;
    var maxVelocity = stepSimulation();
    drawCanvasGraph();
    state.sim.tick += 1;
    state.sim.idleFrames = maxVelocity < 0.035 ? state.sim.idleFrames + 1 : 0;
    if (!state.sim.dragNode && (state.sim.idleFrames > 24 || state.sim.tick > 220)) {
      stopSimulation();
      return;
    }
    state.sim.raf = window.requestAnimationFrame(simulationTick);
  }

  function stepSimulation() {
    var nodes = state.sim.nodes;
    if (!nodes.length) return 0;
    var nodeMap = state.sim.nodeById;
    var count = nodes.length;
    var repulsion = count > 120 ? 3600 : count > 70 ? 2500 : 1700;
    var attraction = count > 100 ? 0.006 : 0.010;
    var centerGravity = count > 100 ? 0.006 : 0.011;
    var laneGravity = 0.012;

    nodes.forEach(function (node, index) {
      if (state.sim.dragNode === node) return;
      var fx = 0;
      var fy = 0;
      for (var j = 0; j < nodes.length; j++) {
        if (index === j) continue;
        var other = nodes[j];
        var dx = node.x - other.x;
        var dy = node.y - other.y;
        var dist = Math.max(18, Math.sqrt(dx * dx + dy * dy));
        var force = repulsion / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }
      var lane = state.positions.get(node.id);
      if (lane) {
        fx += (lane.x - node.x) * laneGravity;
        fy += (lane.y - node.y) * laneGravity;
      }
      fx += (620 - node.x) * centerGravity * 0.15;
      fy += (360 - node.y) * centerGravity * 0.15;
      node.vx = (node.vx + fx) * 0.82;
      node.vy = (node.vy + fy) * 0.82;
    });

    state.sim.edges.forEach(function (edge) {
      var from = nodeMap.get(edge.from);
      var to = nodeMap.get(edge.to);
      if (!from || !to) return;
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var target = edge.graph_kind === "memory" ? 145 : 120;
      var force = (dist - target) * attraction * (edge.confidence == null ? 1 : clamp(edge.confidence, 0.35, 1.2));
      var fx = (dx / dist) * force;
      var fy = (dy / dist) * force;
      if (state.sim.dragNode !== from) {
        from.vx += fx;
        from.vy += fy;
      }
      if (state.sim.dragNode !== to) {
        to.vx -= fx;
        to.vy -= fy;
      }
    });

    var maxVelocity = 0;
    nodes.forEach(function (node) {
      if (state.sim.dragNode === node) return;
      var vx = clamp(node.vx, -8, 8);
      var vy = clamp(node.vy, -8, 8);
      node.x += vx;
      node.y += vy;
      maxVelocity = Math.max(maxVelocity, Math.abs(vx), Math.abs(vy));
    });
    return maxVelocity;
  }

  function drawCanvasGraph() {
    var canvas = els.canvas;
    var ctx = canvas.getContext("2d");
    var width = canvas.width / Math.max(1, window.devicePixelRatio || 1);
    var height = canvas.height / Math.max(1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);
    drawCanvasGrid(ctx, width, height);
    ctx.save();
    ctx.translate(state.sim.panX, state.sim.panY);
    ctx.scale(state.sim.zoom, state.sim.zoom);
    drawCanvasEdges(ctx);
    drawCanvasNodes(ctx);
    ctx.restore();

    if (!state.sim.nodes.length) {
      ctx.fillStyle = "#6ea77d";
      ctx.font = "13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText("No graph data visible.", width / 2, height / 2);
    }
  }

  function drawCanvasGrid(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = graphPalette.background;
    ctx.fillRect(0, 0, width, height);
    var gradient = ctx.createRadialGradient(width * 0.52, height * 0.44, 40, width * 0.52, height * 0.44, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(65,255,143,0.145)");
    gradient.addColorStop(0.48, "rgba(65,255,143,0.030)");
    gradient.addColorStop(1, "rgba(2,5,3,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = graphPalette.grid;
    ctx.lineWidth = 1;
    var grid = 28;
    for (var x = 0; x < width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (var y = 0; y < height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = graphPalette.gridStrong;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.restore();
  }

  function drawCanvasEdges(ctx) {
    var nodeMap = state.sim.nodeById;
    var focusId = focusedCanvasNodeId();
    var query = state.renderQuery || parseSearchQuery(els.searchInput.value);
    var dense = state.sim.nodes.length > 55;
    state.sim.edges.forEach(function (edge) {
      var from = nodeMap.get(edge.from);
      var to = nodeMap.get(edge.to);
      if (!from || !to) return;
      var connected = focusId && (edge.from === focusId || edge.to === focusId);
      var pathEdge = state.pathHighlight && state.pathHighlight.edges.has(edge.id);
      var matches = matchesSearchQuery(edge, query) || matchesSearchQuery(from.entity, query) || matchesSearchQuery(to.entity, query);
      var alpha = pathEdge ? 0.92 : !matches ? 0.035 : focusId ? (connected ? 0.62 : 0.055) : (dense ? 0.13 : 0.22);
      var color = hexToRgb(pathEdge ? graphPalette.bridge : edgeThemeColor(edge, from.entity, to.entity));
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var offset = dense ? 10 : 16;
      var cx = (from.x + to.x) / 2 + (-dy / dist) * offset;
      var cy = (from.y + to.y) / 2 + (dx / dist) * offset;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cx, cy, to.x, to.y);
      ctx.strokeStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + alpha + ")";
      ctx.lineWidth = pathEdge ? 3 : connected ? 2.2 : 1;
      ctx.stroke();
      if (pathEdge || connected || (!dense && state.sim.zoom > 1.25)) drawArrow(ctx, from, to, cx, cy, color, alpha);
      if ((pathEdge || connected) && state.sim.zoom > 0.62) drawEdgeLabel(ctx, edge, cx, cy);
    });
  }

  function drawCanvasNodes(ctx) {
    var focusId = focusedCanvasNodeId();
    var query = state.renderQuery || parseSearchQuery(els.searchInput.value);
    var dense = state.sim.nodes.length > 55;
    var focusNeighbors = focusId ? state.sim.adjacency.get(focusId) : null;
    state.sim.nodes.forEach(function (node) {
      var entity = node.entity;
      var selected = state.selected && state.selected.kind === "entity" && state.selected.id === node.id;
      var hovered = state.sim.hoverNode && state.sim.hoverNode.id === node.id;
      var connected = focusId && (node.id === focusId || (focusNeighbors && focusNeighbors.has(node.id)));
      var pathNode = state.pathHighlight && state.pathHighlight.nodes.has(node.id);
      var matches = matchesSearchQuery(entity, query);
      var alpha = pathNode ? 1 : !matches ? 0.12 : focusId && !connected ? 0.20 : 1;
      var color = nodeThemeColor(entity);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (selected || hovered || pathNode || entity.graph_kind === "memory") {
        ctx.shadowColor = pathNode ? graphPalette.bridge : color;
        ctx.shadowBlur = selected ? 16 : pathNode ? 14 : entity.graph_kind === "memory" ? 9 : 10;
      }
      drawNodeShape(ctx, node.x, node.y, node.r, entity);
      ctx.fillStyle = nodeFillColor(entity);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = selected || hovered ? 2.2 : 1.2;
      ctx.stroke();
      if (entity.graph_kind === "memory") {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(2.4, node.r * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (selected || hovered || pathNode) {
        ctx.save();
        drawNodeShape(ctx, node.x, node.y, node.r + 4, entity);
        ctx.strokeStyle = pathNode ? graphPalette.bridge : color;
        ctx.lineWidth = selected ? 2.6 : pathNode ? 2.2 : 1.8;
        ctx.shadowColor = pathNode ? graphPalette.bridge : color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }

      var shouldLabel = pathNode || (matches && (selected || hovered || (query.active && matches) || (!dense && state.sim.zoom > 0.75) || (dense && state.sim.zoom > 1.55 && node.r > 13)));
      if (shouldLabel) drawNodeLabel(ctx, node, selected || hovered);
    });
  }

  function drawArrow(ctx, from, to, cx, cy, color, alpha) {
    var angle = Math.atan2(to.y - cy, to.x - cx);
    var tipX = to.x - to.r * Math.cos(angle);
    var tipY = to.y - to.r * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 6 * Math.cos(angle - 0.32), tipY - 6 * Math.sin(angle - 0.32));
    ctx.lineTo(tipX - 6 * Math.cos(angle + 0.32), tipY - 6 * Math.sin(angle + 0.32));
    ctx.closePath();
    ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + "," + Math.min(0.85, alpha + 0.10) + ")";
    ctx.fill();
  }

  function drawEdgeLabel(ctx, edge, x, y) {
    var inv = 1 / state.sim.zoom;
    ctx.save();
    ctx.font = "700 " + (9 * inv).toFixed(1) + "px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(155,231,192,0.72)";
    ctx.fillText(shortName(edge.relation || "related", 22), x, y - 5 * inv);
    ctx.restore();
  }

  function drawNodeLabel(ctx, node, strong) {
    var inv = 1 / state.sim.zoom;
    var label = shortName(displayName(node.entity), strong ? 30 : 20);
    ctx.save();
    ctx.font = (strong ? "800 " : "700 ") + (11 * inv).toFixed(1) + "px ui-monospace, Menlo, monospace";
    var width = ctx.measureText(label).width + 16 * inv;
    var height = 20 * inv;
    var x = node.x - width / 2;
    var y = node.y + node.r + 8 * inv;
    ctx.fillStyle = "rgba(2,5,3,0.92)";
    roundedRect(ctx, x, y, width, height, 4 * inv);
    ctx.fill();
    ctx.strokeStyle = strong ? "rgba(65,255,143,0.45)" : "rgba(65,255,143,0.14)";
    ctx.stroke();
    ctx.fillStyle = strong ? graphPalette.text : graphPalette.muted;
    ctx.textAlign = "center";
    ctx.fillText(label, node.x, y + 14 * inv);
    ctx.restore();
  }

  function drawNodeShape(ctx, x, y, r, entity) {
    var type = entity.type || "";
    if (type === "file" || type === "repo" || type === "command" || type === "script") {
      roundedRect(ctx, x - r * 1.25, y - r * 0.75, r * 2.5, r * 1.5, 4);
      return;
    }
    if (type === "decision" || type === "bug_fix" || type === "test") {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      return;
    }
    if (type === "route" || type === "external" || isDependencyEntity(entity)) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var angle = Math.PI / 3 * i - Math.PI / 2;
        var px = x + r * Math.cos(angle);
        var py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  function nodeThemeColor(entity) {
    if (isDependencyEntity(entity) || entity.type === "external") return graphPalette.dependency;
    if (entity.type === "test" || entity.type === "tag") return graphPalette.amber;
    if (entity.type === "bug_fix" || entity.type === "path") return graphPalette.danger;
    if (entity.graph_kind === "memory" || ["memory", "repo", "memory_type", "decision", "runbook", "workflow", "convention", "gotcha", "reference", "policy"].indexOf(entity.type) !== -1) return graphPalette.memory;
    if (entity.graph_kind === "code" || ["file", "symbol", "route", "script", "command", "package"].indexOf(entity.type) !== -1) return graphPalette.code;
    return graphPalette.muted;
  }

  function nodeFillColor(entity) {
    if (isDependencyEntity(entity) || entity.type === "external") return "rgba(7,13,10,0.88)";
    if (entity.graph_kind === "memory" || entity.type === "memory") return graphPalette.bodyMemory;
    if (entity.graph_kind === "code") return graphPalette.bodyCode;
    return graphPalette.body;
  }

  function edgeThemeColor(edge, fromEntity, toEntity) {
    if (edge.memory_code_link || isMemoryCodeRelation(edge.relation)) return graphPalette.bridge;
    if (edge.relation && /test|covers/i.test(edge.relation)) return graphPalette.amber;
    if (edge.relation && /invalid|risk|missing|bug/i.test(edge.relation)) return graphPalette.danger;
    if (isDependencyEntity(fromEntity) || isDependencyEntity(toEntity)) return graphPalette.dependency;
    if (fromEntity.graph_kind === "memory" || toEntity.graph_kind === "memory") return graphPalette.memory;
    return graphPalette.code;
  }

  function renderSvg() {
    els.edgeLayer.textContent = "";
    els.nodeLayer.textContent = "";
    els.svg.setAttribute("viewBox", [state.viewBox.x, state.viewBox.y, state.viewBox.width, state.viewBox.height].join(" "));

    var selectedEntityId = state.selected && state.selected.kind === "entity" ? state.selected.id : null;
    var selectedEdgeId = state.selected && state.selected.kind === "edge" ? state.selected.id : null;
    var connectedIds = connectedEntityIds(selectedEntityId, selectedEdgeId);

    renderLaneLabels();

    state.edges.forEach(function (edge) {
      if (!state.visibleEdgeIds.has(edge.id)) return;
      var from = state.positions.get(edge.from);
      var to = state.positions.get(edge.to);
      if (!from || !to) return;

      var group = svgEl("g");
      var connected = selectedEdgeId === edge.id || connectedIds.edges.has(edge.id);
      var line = svgEl("path", {
        d: edgePath(from, to),
        class: classNames("edge-line", edge.memory_code_link && "memory-code-link", "review-" + reviewStatus(edge).replace(/\s+/g, "-"), connected && "connected", selectedEdgeId === edge.id && "selected")
      });
      var hit = svgEl("path", {
        d: edgePath(from, to),
        class: "edge-hit"
      });
      hit.addEventListener("click", function () {
        selectEdge(edge.id, true);
        render();
      });
      hit.addEventListener("mousedown", function (event) {
        event.stopPropagation();
      });
      group.appendChild(line);
      group.appendChild(hit);
      els.edgeLayer.appendChild(group);
    });

    state.entities.forEach(function (entity) {
      if (!state.visibleEntityIds.has(entity.id)) return;
      var pos = state.positions.get(entity.id);
      if (!pos) return;

      var selected = selectedEntityId === entity.id;
      var connected = connectedIds.entities.has(entity.id);
      var group = svgEl("g", {
        class: classNames("node", "graph-" + (entity.graph_kind || "unknown"), "type-" + safeCssName(entity.type || "unknown"), isDependencyEntity(entity) && "dependency-node", selected && "selected", connected && "connected"),
        transform: "translate(" + pos.x + " " + pos.y + ")"
      });
      var dims = nodeDimensions(entity);
      var rect = svgEl("rect", {
        x: -dims.width / 2,
        y: -dims.height / 2,
        width: dims.width,
        height: dims.height,
        class: "node-body"
      });
      var port = svgEl("circle", {
        cx: -dims.width / 2 + 10,
        cy: 0,
        r: selected ? 4 : 3,
        class: "node-port",
        fill: palette[entity.type] || palette.default
      });
      var titleText = svgEl("text", {
        x: -dims.width / 2 + 22,
        y: -4,
        class: "node-title"
      });
      titleText.textContent = shortName(displayName(entity), dims.labelMax);
      var typeText = svgEl("text", {
        x: -dims.width / 2 + 22,
        y: 13,
        class: "node-type"
      });
      typeText.textContent = nodeKindLabel(entity);
      var title = svgEl("title");
      title.textContent = displayName(entity) + "\n" + (entity.summary || "");
      group.addEventListener("click", function () {
        selectEntity(entity.id, true);
        render();
      });
      group.addEventListener("mousedown", function (event) {
        event.stopPropagation();
      });
      group.appendChild(title);
      group.appendChild(rect);
      group.appendChild(port);
      group.appendChild(titleText);
      group.appendChild(typeText);
      els.nodeLayer.appendChild(group);
    });
  }

  function renderLaneLabels() {
    var visible = state.entities.filter(function (entity) { return state.visibleEntityIds.has(entity.id); });
    [
      ["MEMORY", 92, visible.some(function (entity) { return entity.graph_kind === "memory"; })],
      ["FILES", 392, visible.some(function (entity) { return entity.graph_kind === "code" && entity.type === "file"; })],
      ["FLOW", 682, visible.some(function (entity) { return entity.graph_kind === "code" && ["symbol", "route", "test"].indexOf(entity.type) !== -1; })],
      ["DEPS", 962, visible.some(function (entity) { return isDependencyEntity(entity); })]
    ].forEach(function (lane) {
      if (!lane[2]) return;
      var label = svgEl("text", { x: lane[1], y: 34, class: "lane-label" });
      label.textContent = lane[0];
      els.edgeLayer.appendChild(label);
    });
  }

  function renderLists() {
    var visibleEntities = state.viewerPage === "data"
      ? state.entities.slice()
      : state.entities.filter(function (entity) {
        return state.visibleEntityIds.has(entity.id);
      });
    var visibleEdges = (state.viewerPage === "data"
      ? state.edges.slice()
      : state.edges.filter(function (edge) {
        return state.visibleEdgeIds.has(edge.id);
      })).sort(function (a, b) {
      return reviewRank(a) - reviewRank(b);
    });

    els.entityCount.textContent = String(visibleEntities.length);
    els.edgeCount.textContent = String(visibleEdges.length);
    els.entityList.textContent = "";
    els.edgeList.textContent = "";

    var rowLimit = state.viewerPage === "data" ? 40 : 80;
    var entityRows = visibleEntities.slice(0, rowLimit);
    var edgeRows = visibleEdges.slice(0, rowLimit);

    entityRows.forEach(function (entity) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = classNames("list-item", state.selected && state.selected.kind === "entity" && state.selected.id === entity.id && "selected");
      button.innerHTML = "<span class=\"item-title\"></span><span class=\"item-meta\"></span>";
      button.querySelector(".item-title").textContent = displayName(entity);
      button.querySelector(".item-meta").textContent = (entity.type || "unknown") + " | " + entity.id;
      button.addEventListener("click", function () {
        selectEntity(entity.id, true);
        render();
      });
      els.entityList.appendChild(button);
    });
    if (visibleEntities.length > entityRows.length) {
      appendListNote(els.entityList, "Showing " + entityRows.length + " of " + visibleEntities.length + ". Use search to narrow.");
    }

    edgeRows.forEach(function (edge) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = classNames("list-item", state.selected && state.selected.kind === "edge" && state.selected.id === edge.id && "selected");
      button.innerHTML = "<span class=\"item-title\"></span><span class=\"item-meta\"></span>";
      button.querySelector(".item-title").textContent = edge.relation || "related";
      button.querySelector(".item-meta").textContent = displayName(state.entityById.get(edge.from)) + " -> " + displayName(state.entityById.get(edge.to)) + " | " + reviewStatus(edge);
      button.addEventListener("click", function () {
        selectEdge(edge.id, true);
        render();
      });
      els.edgeList.appendChild(button);
    });
    if (visibleEdges.length > edgeRows.length) {
      appendListNote(els.edgeList, "Showing " + edgeRows.length + " of " + visibleEdges.length + ". Filter by relation or select a node first.");
    }
  }

  function appendListNote(parent, text) {
    var note = document.createElement("div");
    note.className = "list-note";
    note.textContent = text;
    parent.appendChild(note);
  }

  function renderDetails() {
    if (!state.selected) {
      setSelectionBodyState(null);
      els.selectionDetails.className = "details-empty";
      els.selectionDetails.textContent = "Select a node or relation to see what it means, why it exists, and which connected memory or code to inspect next.";
      els.selectionStatus.textContent = "No selection";
      if (!state.pathHighlight.steps.length) setPathStatus("Select a code node, then trace to another code node when you need impact proof.", "");
      return;
    }

    var item = state.selected.kind === "entity"
      ? state.entityById.get(state.selected.id)
      : state.edges.find(function (edge) { return edge.id === state.selected.id; });

    if (!item) {
      setSelectionBodyState(null);
      els.selectionDetails.textContent = "Selection no longer exists.";
      return;
    }

    setSelectionBodyState(state.selected.kind === "entity" ? item : null);
    els.selectionDetails.className = "";
    els.selectionDetails.textContent = "";
    var title = document.createElement("div");
    title.className = "detail-title";
    title.textContent = state.selected.kind === "entity" ? displayName(item) : (item.relation || "related");
    var kind = document.createElement("div");
    kind.className = "detail-kind";
    kind.textContent = state.selected.kind === "entity" ? (item.type || "unknown") : "edge";
    var rows = document.createElement("dl");
    rows.appendChild(detailRow("ID", item.id));
    els.selectionStatus.textContent = state.selected.kind === "entity" ? "Node" : reviewStatus(item);

    if (state.selected.kind === "entity") {
      entityDetailRows(item).forEach(function (row) { rows.appendChild(row); });
      rows.appendChild(detailRow("Graph", item.graph_kind || ""));
      rows.appendChild(detailRow("Aliases", Array.isArray(item.aliases) ? item.aliases.join(", ") : ""));
      rows.appendChild(detailRow("Evidence", formatEvidence(item.evidence)));
      rows.appendChild(detailRow("First seen", item.first_seen_at || ""));
      rows.appendChild(detailRow("Last seen", item.last_seen_at || ""));
    } else {
      rows.appendChild(detailRow("From", displayName(state.entityById.get(item.from)) + " (" + item.from + ")"));
      rows.appendChild(detailRow("To", displayName(state.entityById.get(item.to)) + " (" + item.to + ")"));
      rows.appendChild(detailRow("Fact", item.fact || ""));
      rows.appendChild(detailRow("Graph", item.graph_kind || ""));
      rows.appendChild(detailRow("Review", reviewStatus(item)));
      rows.appendChild(detailRow("Confidence", item.confidence == null ? "" : String(item.confidence)));
      rows.appendChild(detailRow("Evidence", formatEvidence(item.evidence)));
      rows.appendChild(detailRow("Valid from", item.valid_from || ""));
      rows.appendChild(detailRow("Invalidated at", item.invalidated_at || ""));
      rows.appendChild(detailRow("Commit", item.commit || ""));
    }

    els.selectionDetails.appendChild(title);
    els.selectionDetails.appendChild(kind);
    els.selectionDetails.appendChild(rows);
    renderInspectorConnections(item);
    if (state.selected.kind === "entity" && item.graph_kind === "code") prefillPathFromSelection(true);
  }

  function setSelectionBodyState(entity) {
    if (!document.body || !document.body.classList) return;
    document.body.classList.toggle("has-selection", Boolean(state.selected));
    document.body.classList.toggle("has-code-selection", Boolean(entity && entity.graph_kind === "code"));
  }

  function prefillPathFromSelection(silent) {
    if (!state.selected || state.selected.kind !== "entity") {
      if (!silent) setPathStatus("Select a code node first. Path tracing is for files, symbols, routes, tests, and scripts.", "warn");
      return;
    }
    var entity = state.entityById.get(state.selected.id);
    if (!entity || entity.graph_kind !== "code" || ["file", "symbol", "route", "test", "script"].indexOf(entity.type) === -1) {
      if (!silent) setPathStatus("Select a code node first. Memory nodes are shown through memory-code links, not code path tracing.", "warn");
      return;
    }
    if (!els.pathFromInput.value || silent) {
      els.pathFromInput.value = entity.path || displayName(entity) || entity.id;
    }
    if (!silent) {
      els.pathToInput.focus();
      setPathStatus("Selected " + displayName(entity) + ". Pick a target test, route, file, or symbol to trace impact.", "ok");
    }
  }

  function entityDetailRows(entity) {
    var rows = [detailRow("Summary", entitySummary(entity))];
    if (entity.graph_kind === "code") {
      if (entity.path) rows.push(detailRow("Path", entity.path));
      if (entity.language) rows.push(detailRow("Language", entity.language));
      if (entity.parser) rows.push(detailRow("Parser", entity.parser));
      if (entity.kind) rows.push(detailRow("Kind", entity.kind));
      if (entity.line) rows.push(detailRow("Line", String(entity.line)));
      if (entity.end_line) rows.push(detailRow("End line", String(entity.end_line)));
      if (entity.exported != null) rows.push(detailRow("Exported", entity.exported ? "yes" : "no"));
      if (entity.signature) rows.push(detailRow("Signature", entity.signature));
      if (entity.line_count) rows.push(detailRow("Lines", String(entity.line_count)));
      if (entity.size_bytes != null) rows.push(detailRow("Size", formatBytes(entity.size_bytes)));
      if (entity.hash) rows.push(detailRow("Hash", entity.hash));
      if (entity.method) rows.push(detailRow("Method", entity.method));
      if (entity.route_path) rows.push(detailRow("Route", entity.route_path));
      if (entity.framework) rows.push(detailRow("Framework", entity.framework));
      if (entity.handler_symbol) rows.push(detailRow("Handler", entity.handler_symbol));
    }
    return rows;
  }

  function entitySummary(entity) {
    if (entity.summary) return entity.summary;
    if (entity.graph_kind === "code" && entity.type === "symbol") {
      return [entity.kind || "symbol", entity.path && "in " + entity.path, entity.line && "line " + entity.line].filter(Boolean).join(" ");
    }
    if (entity.graph_kind === "code" && entity.type === "file") {
      return [entity.kind || "file", entity.language, entity.line_count && entity.line_count + " lines"].filter(Boolean).join(", ");
    }
    if (entity.graph_kind === "code" && entity.type === "test") {
      return ["test", entity.path && "in " + entity.path, entity.line && "line " + entity.line].filter(Boolean).join(" ");
    }
    return displayName(entity);
  }

  function formatBytes(value) {
    var bytes = Number(value || 0);
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function renderInspectorConnections(item) {
    if (state.selected.kind !== "entity") {
      if (item && isMemoryCodeEdge(item)) {
        els.selectionDetails.appendChild(detailSection("Memory-Code Link", [
          connectionText(item, state.entityById.get(item.from), state.entityById.get(item.to))
        ], 0));
      }
      return;
    }

    var direct = directConnections(item.id);
    if (direct.length) {
      var directRows = direct.slice(0, INSPECTOR_CONNECTION_LIMIT).map(function (link) {
        return connectionText(link.edge, item, link.other);
      });
      els.selectionDetails.appendChild(detailSection("Connected Relations", directRows, direct.length - directRows.length));
    }

    var links = memoryCodeConnections(item.id);
    if (!links.length) return;
    var rows = links.slice(0, INSPECTOR_CONNECTION_LIMIT).map(function (link) {
      return connectionText(link.edge, item, link.other);
    });
    els.selectionDetails.appendChild(detailSection("Memory-Code Evidence", rows, links.length - rows.length));
  }

  function memoryCodeConnections(entityId) {
    return state.edges
      .filter(function (edge) { return isMemoryCodeEdge(edge) && (edge.from === entityId || edge.to === entityId); })
      .map(function (edge) {
        var otherId = edge.from === entityId ? edge.to : edge.from;
        return { edge: edge, other: state.entityById.get(otherId) };
      })
      .filter(function (link) { return Boolean(link.other); })
      .sort(function (a, b) {
        return connectionImportance(b) - connectionImportance(a) ||
          displayName(a.other).localeCompare(displayName(b.other));
      });
  }

  function directConnections(entityId) {
    return state.edges
      .filter(function (edge) { return edge.from === entityId || edge.to === entityId; })
      .map(function (edge) {
        var otherId = edge.from === entityId ? edge.to : edge.from;
        return { edge: edge, other: state.entityById.get(otherId) };
      })
      .filter(function (link) { return Boolean(link.other); })
      .sort(function (a, b) {
        return connectionImportance(b) - connectionImportance(a) ||
          displayName(a.other).localeCompare(displayName(b.other));
      });
  }

  function splitParamValues(values) {
    return []
      .concat(values || [])
      .flatMap(function (value) { return String(value || "").split(","); })
      .map(function (value) { return value.trim(); })
      .filter(Boolean);
  }

  function applyRequestedView(view) {
    if (!view) return;
    var normalized = String(view).toLowerCase();
    if (["combined", "memory", "code"].indexOf(normalized) === -1) return;
    els.viewMode.value = normalized;
  }

  function applyRequestedRenderMode(mode) {
    if (!mode) return;
    var normalized = String(mode).toLowerCase();
    if (normalized === "canvas") normalized = "2d";
    if (normalized === "space") normalized = "3d";
    if (["2d", "3d"].indexOf(normalized) === -1) return;
    els.renderMode.value = normalized;
  }

  function isMemoryCodeEdge(edge) {
    return Boolean(edge && (edge.memory_code_link || isMemoryCodeRelation(edge.relation)));
  }

  function codeCoverageKey(entity) {
    if (!entity) return "";
    return String(entity.path || entity.id || "").replace(/\\/g, "/").replace(/^\.\//, "");
  }

  function memoryLinkedCodeKeys() {
    var keys = new Set();
    state.edges.filter(isMemoryCodeEdge).forEach(function (edge) {
      [state.entityById.get(edge.from), state.entityById.get(edge.to)].forEach(function (entity) {
        if (!entity || entity.graph_kind !== "code") return;
        var key = codeCoverageKey(entity);
        if (key) keys.add(key);
      });
    });
    return keys;
  }

  function connectionImportance(link) {
    var relation = String(link.edge.relation || "");
    var score = entityImportance(link.other);
    if (["fixes_symbol", "verified_by_test"].indexOf(relation) !== -1) score += 36;
    if (["explains_symbol", "applies_to_route"].indexOf(relation) !== -1) score += 24;
    if (link.other.graph_kind === "memory") score += 18;
    return score;
  }

  function connectionText(edge, selected, other) {
    var from = state.entityById.get(edge.from);
    var to = state.entityById.get(edge.to);
    var peer = other || (selected && selected.id === edge.from ? to : from);
    var label = peer ? displayName(peer) : displayName(from) + " -> " + displayName(to);
    var meta = [edge.relation || "related", peer && (peer.graph_kind || peer.type)].filter(Boolean).join(" | ");
    return {
      label: label,
      meta: meta,
      body: edge.fact || "",
      edge: edge,
      entity: peer
    };
  }

  function detailSection(title, items, hiddenCount) {
    var section = document.createElement("section");
    section.className = "detail-section";
    var heading = document.createElement("div");
    heading.className = "detail-section-title";
    heading.textContent = title;
    section.appendChild(heading);
    var list = document.createElement("div");
    list.className = "detail-section-list";
    items.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "detail-link";
      button.innerHTML = "<span class=\"detail-link-title\"></span><span class=\"detail-link-meta\"></span><span class=\"detail-link-body\"></span>";
      button.querySelector(".detail-link-title").textContent = item.label;
      button.querySelector(".detail-link-meta").textContent = item.meta;
      button.querySelector(".detail-link-body").textContent = item.body;
      button.addEventListener("click", function () {
        if (item.entity) selectEntity(item.entity.id, true);
        else selectEdge(item.edge.id, true);
        render();
      });
      list.appendChild(button);
    });
    if (hiddenCount > 0) {
      var more = document.createElement("div");
      more.className = "detail-more";
      more.textContent = "+" + hiddenCount + " more connected items hidden to keep the graph readable.";
      list.appendChild(more);
    }
    section.appendChild(list);
    return section;
  }

  function detailRow(label, value) {
    var wrapper = document.createElement("div");
    var term = document.createElement("dt");
    var description = document.createElement("dd");
    wrapper.className = "detail-row";
    term.textContent = label;
    description.textContent = value || "n/a";
    wrapper.appendChild(term);
    wrapper.appendChild(description);
    return wrapper;
  }

  function formatEvidence(evidence) {
    if (!Array.isArray(evidence) || evidence.length === 0) return "";
    return evidence.map(function (id) {
      var episode = state.episodesById.get(id);
      return episode && episode.summary ? id + ": " + episode.summary : id;
    }).join("\n");
  }

  function reviewStatus(item) {
    if (item.invalidated_at) return "invalidated";
    if (item.confidence != null && item.confidence < 0.75) return "low confidence";
    if (Array.isArray(item.evidence) && item.evidence.length === 0) return "missing evidence";
    return "ok";
  }

  function reviewRank(item) {
    var status = reviewStatus(item);
    if (status === "invalidated") return 0;
    if (status === "missing evidence") return 1;
    if (status === "low confidence") return 2;
    return 3;
  }

  function renderMetrics() {
    if (!els.metricsSummary) return;
    var visibleEdges = state.edges.filter(function (edge) { return state.visibleEdgeIds.has(edge.id); });
    var visibleEntities = state.entities.filter(function (entity) { return state.visibleEntityIds.has(entity.id); });
    var hiddenDependencies = state.entities.filter(function (entity) {
      return isDependencyEntity(entity) && !state.visibleEntityIds.has(entity.id);
    }).length;
    var evidenceEdges = visibleEdges.filter(function (edge) { return Array.isArray(edge.evidence) && edge.evidence.length > 0; }).length;
    var official = state.metrics;
    var memoryCodeLinks = state.edges.filter(isMemoryCodeEdge).length;
    var pendingReview = official && official.memory_graph ? Number(firstNumber(official.memory_graph.pending_packets, 0)) : 0;
    var metrics = official ? [
      ["Validation", official.harness && official.harness.validation_ok ? "Clean" : "Check"],
      ["Review queue", pendingReview ? pendingReview + " pending" : "Clear"],
      ["Reusable memory", official.memory_graph ? official.memory_graph.approved_packets + " packets" : "n/a"],
      ["Code indexed", official.structural_index ? official.structural_index.files + " files" : official.code_graph.files + " files"],
      ["Parser coverage", official.code_graph.indexer_coverage_percent + "%"],
      ["Memory-code links", memoryCodeLinks]
    ] : [
      ["Nodes", visibleEntities.length + "/" + state.entities.length],
      ["Relations", visibleEdges.length + "/" + state.edges.length],
      ["Memory Nodes", visibleEntities.filter(function (entity) { return entity.graph_kind === "memory"; }).length],
      ["Code Nodes", visibleEntities.filter(function (entity) { return entity.graph_kind === "code"; }).length],
      ["Evidence", visibleEdges.length ? Math.round(evidenceEdges / visibleEdges.length * 100) + "%" : "n/a"],
      ["Review Flags", visibleEdges.filter(function (edge) { return reviewStatus(edge) !== "ok"; }).length]
    ];
    els.metricsSummary.textContent = "";
    metrics.forEach(function (metric) {
      var div = document.createElement("div");
      div.className = "metric";
      div.innerHTML = "<strong></strong><span></span>";
      div.querySelector("strong").textContent = metric[1];
      div.querySelector("span").textContent = metric[0];
      els.metricsSummary.appendChild(div);
    });
    renderStatusStrip(visibleEntities, visibleEdges, official);
    els.workspaceMode.textContent = (els.viewMode.value || "combined").replace(/^./, function (letter) { return letter.toUpperCase(); });
    els.graphSubhead.textContent = visibleEntities.length + " visible nodes and " + visibleEdges.length + " visible relations" +
      (hiddenDependencies && !els.showDependencies.checked ? " (" + hiddenDependencies + " dependency/noise nodes hidden)." : ".");
    renderGraphInsights(visibleEntities, visibleEdges, hiddenDependencies);
    updateGraphActionButtons();
  }

  function renderGraphInsights(visibleEntities, visibleEdges, hiddenDependencies) {
    if (!els.graphInsights) return;
    els.graphInsights.textContent = "";
    var allMemoryCode = state.edges.filter(isMemoryCodeEdge);
    var visibleMemoryCode = visibleEdges.filter(isMemoryCodeEdge);
    var reviewFlags = visibleEdges.filter(function (edge) { return reviewStatus(edge) !== "ok"; });
    var visibleCodeFiles = visibleEntities.filter(function (entity) { return entity.graph_kind === "code" && entity.type === "file"; });
    var coveredKeys = memoryLinkedCodeKeys();
    var uncoveredCodeFiles = visibleCodeFiles.filter(function (entity) { return !coveredKeys.has(codeCoverageKey(entity)); });
    var evidenceEdges = visibleEdges.filter(function (edge) { return Array.isArray(edge.evidence) && edge.evidence.length; }).length;
    var evidencePercent = visibleEdges.length ? Math.round(evidenceEdges / visibleEdges.length * 100) : 0;
    var coveragePercent = visibleCodeFiles.length ? Math.round((visibleCodeFiles.length - uncoveredCodeFiles.length) / visibleCodeFiles.length * 100) : 0;
    var queryActive = parseSearchQuery(els.searchInput.value).active;
    var hasActiveFilters = queryActive || state.graphActionFilter || els.viewMode.value !== "combined" || els.typeFilter.value || els.relationFilter.value || els.showDependencies.checked;
    if (!visibleEntities.length || hasActiveFilters) {
      var recovery = document.createElement("article");
      recovery.className = classNames("metric-card graph-action-card graph-recovery-card", !visibleEntities.length && "metric-card-warn");
      recovery.innerHTML = [
        "<div class=\"metric-card-head\"><span></span><strong></strong></div>",
        "<p></p>",
        "<button type=\"button\">Clear search/filter</button>",
        "<em></em>"
      ].join("");
      recovery.querySelector(".metric-card-head span").textContent = !visibleEntities.length ? "No graph results" : "Active graph filter";
      recovery.querySelector(".metric-card-head strong").textContent = !visibleEntities.length ? "0 visible" : "filtered";
      recovery.querySelector("p").textContent = !visibleEntities.length
        ? "The current search or filter hides every node. Clear it to recover the graph."
        : "A search, relation, or journey filter is active.";
      recovery.querySelector("button").addEventListener("click", resetGraphView);
      recovery.querySelector("em").textContent = queryActive ? "Search: " + els.searchInput.value : (state.graphActionFilter || "custom filter");
      els.graphInsights.appendChild(recovery);
    }
    var cards = [
      graphActionCard("Memory coverage", coveragePercent + "%", uncoveredCodeFiles.length
        ? uncoveredCodeFiles.length + " visible code file(s) have no linked repo memory."
        : "Visible code files have linked repo memory.",
        "Show uncovered code", "uncovered", uncoveredCodeFiles.length ? "warn" : "ok"),
      graphActionCard("Untrusted edges", reviewFlags.length ? reviewFlags.length + " flagged" : "clear", reviewFlags.length
        ? "Low-confidence, missing-evidence, or invalidated relations are visible."
        : "Visible relations are evidence-backed enough for inspection.",
        "Filter to untrusted", "untrusted", reviewFlags.length ? "warn" : "ok", [
        { label: "Low confidence", value: reviewFlags.filter(function (edge) { return reviewStatus(edge) === "low confidence"; }).length, score: Math.min(100, reviewFlags.length * 20), status: reviewFlags.length ? "warn" : "ok" },
        { label: "Missing evidence", value: reviewFlags.filter(function (edge) { return reviewStatus(edge) === "missing evidence"; }).length, score: Math.min(100, reviewFlags.length * 20), status: reviewFlags.length ? "warn" : "ok" },
        { label: "Invalidated", value: reviewFlags.filter(function (edge) { return reviewStatus(edge) === "invalidated"; }).length, score: Math.min(100, reviewFlags.length * 20), status: reviewFlags.length ? "danger" : "ok" }
      ]),
      graphActionCard("Evidence in view", evidencePercent + "%", evidenceEdges + " of " + visibleEdges.length + " visible relation(s) carry evidence.",
        "Show memory-code links", "memory-code", evidencePercent >= 80 ? "ok" : "warn"),
      graphActionCard("Trace impact", visibleMemoryCode.length + " links", "Select a code node, then trace to a test, route, or symbol from the Inspector.",
        "Use selected node", "path", visibleMemoryCode.length ? "ok" : "warn")
    ];
    cards.forEach(function (card) { els.graphInsights.appendChild(card); });
    if (els.graphInsightStatus) els.graphInsightStatus.textContent = state.graphActionFilter || (hiddenDependencies ? hiddenDependencies + " external hidden" : "ready");
  }

  function graphActionCard(title, value, detail, actionLabel, action, status, rows) {
    var card = document.createElement("article");
    card.className = classNames("metric-card graph-action-card", status && "metric-card-" + status, state.graphActionFilter === action && "active");
    card.innerHTML = [
      "<div class=\"metric-card-head\"><span></span><strong></strong></div>",
      "<p></p>",
      "<div class=\"metric-bars\"></div>",
      "<button type=\"button\"></button>",
      "<em></em>"
    ].join("");
    card.querySelector(".metric-card-head span").textContent = title;
    card.querySelector(".metric-card-head strong").textContent = value;
    card.querySelector("p").textContent = detail;
    var bars = card.querySelector(".metric-bars");
    if (Array.isArray(rows) && rows.length) {
      rows.forEach(function (row) {
        var item = document.createElement("div");
        item.className = classNames("metric-bar", row.status && "metric-bar-" + row.status);
        item.innerHTML = "<span></span><strong></strong><i></i>";
        item.querySelector("span").textContent = row.label;
        item.querySelector("strong").textContent = formatDashboardValue(row.value);
        item.querySelector("i").style.width = clamp(Number(row.score || 0), row.value ? 8 : 0, 100) + "%";
        bars.appendChild(item);
      });
    } else {
      bars.remove();
    }
    var button = card.querySelector("button");
    button.textContent = actionLabel;
    button.addEventListener("click", function () {
      if (action === "path") {
        prefillPathFromSelection();
        return;
      }
      applyGraphActionFilter(action);
    });
    card.querySelector("em").textContent = state.graphActionFilter === action ? "Active filter" : "";
    return card;
  }

  function updateGraphActionButtons() {
    [
      [els.showUntrusted, "untrusted"],
      [els.showUncovered, "uncovered"],
      [els.showMemoryCode, "memory-code"]
    ].forEach(function (entry) {
      if (!entry[0]) return;
      entry[0].classList.toggle("active", state.graphActionFilter === entry[1]);
    });
  }

  function renderArtifactDiagnostics(visibleEntities, visibleEdges) {
    if (!els.debugOverview) return;
    els.debugOverview.textContent = "";
    var episodes = state.episodesById ? state.episodesById.size : 0;
    var evidenceEdges = state.edges.filter(function (edge) { return Array.isArray(edge.evidence) && edge.evidence.length; }).length;
    var evidencePercent = state.edges.length ? Math.round(evidenceEdges / state.edges.length * 100) : 0;
    var memoryCodeEdges = state.edges.filter(isMemoryCodeEdge).length;
    var reviewFlags = state.edges.filter(function (edge) { return reviewStatus(edge) !== "ok"; }).length;
    [
      metricBars("Artifact shape", state.entities.length + " nodes", [
        { label: "Visible nodes", value: visibleEntities.length, score: state.entities.length ? visibleEntities.length / state.entities.length * 100 : 0, status: "ok" },
        { label: "Relations", value: state.edges.length, score: 100, status: "ok" },
        { label: "Episodes", value: episodes, score: episodes ? 100 : 0, status: episodes ? "ok" : "warn" }
      ], "Use this when graph generation seems incomplete.", "ok"),
      metricDonut("Evidence", evidencePercent, evidenceEdges + " of " + state.edges.length + " relation(s) have evidence", "Low evidence means recall may explain less than expected.", evidencePercent >= 80 ? "ok" : "warn"),
      metricBars("Link diagnostics", memoryCodeEdges + " memory-code", [
        { label: "Memory-code", value: memoryCodeEdges, score: Math.min(100, memoryCodeEdges / Math.max(1, state.edges.length) * 100), status: memoryCodeEdges ? "ok" : "warn" },
        { label: "Review flags", value: reviewFlags, score: Math.min(100, reviewFlags * 12), status: reviewFlags ? "warn" : "ok" },
        { label: "Visible edges", value: visibleEdges.length, score: state.edges.length ? visibleEdges.length / state.edges.length * 100 : 0, status: "ok" }
      ], "Use raw rows below to inspect exact IDs, relations, and evidence.", reviewFlags ? "warn" : "ok")
    ].forEach(function (card) { els.debugOverview.appendChild(card); });
  }

  function renderDashboard() {
    if (!els.dashboardStats) return;
    var metrics = state.metrics || {};
    var memoryGraph = metrics.memory_graph || {};
    var codeGraph = metrics.code_graph || {};
    var structural = metrics.structural_index || {};
    var savings = metrics.savings || {};
    var pain = metrics.pain || {};
    var memoryNodes = state.entities.filter(function (entity) { return entity.graph_kind === "memory"; }).length;
    var codeNodes = state.entities.filter(function (entity) { return entity.graph_kind === "code"; }).length;
    var memoryCodeEdges = state.edges.filter(isMemoryCodeEdge);
    var reports = state.reports || {};
    var reportCount = Object.keys(reports).filter(function (key) { return reports[key]; }).length;
    var risk = reports.risk || {};
    var riskTargets = Array.isArray(risk.targets) ? risk.targets : Object.keys(risk.targets || {});
    var inboxCounts = state.inbox && state.inbox.counts ? state.inbox.counts : {};
    var pendingReview = Number(firstNumber(inboxCounts.pending, memoryGraph.pending_packets, (state.pendingPackets || []).length, 0));
    var staleFlags = Number(firstNumber(inboxCounts.stale, 0));
    var duplicateFlags = Number(firstNumber(inboxCounts.duplicates, memoryGraph.duplicate_candidate_pairs, 0));
    var missingContext = Number(firstNumber(inboxCounts.missing_context, 0));
    var ownerSilos = Array.isArray(risk.ownership_silos) ? risk.ownership_silos.length : 0;
    var hotspots = Array.isArray(risk.global_hotspots) ? risk.global_hotspots.length : 0;
    var readiness = dashboardReadiness(metrics, pendingReview, staleFlags, duplicateFlags, missingContext);
    var memoryCoverage = dashboardMemoryCoverage(reports, memoryCodeEdges, memoryGraph, memoryNodes);
    var riskHealth = riskTargets.length || hotspots ? (riskTargets.length + hotspots) + " signals" : "No flags";
    var statRows = [
      ["Handoff", readiness.label, readiness.detail, readiness.status],
      ["Memory", memoryCoverage.label, memoryCoverage.detail, memoryCoverage.status],
      ["Risk", riskHealth, riskTargets.length + " targets, " + ownerSilos + " ownership silos", riskTargets.length || ownerSilos || hotspots ? "warn" : "ok"],
      ["Code map", firstNumber(codeGraph.files, structural.files, countEntitiesByType("file")) + " files", firstNumber(codeGraph.symbols, structural.symbols, codeNodes) + " symbols indexed", "code"]
    ];
    els.dashboardStats.textContent = "";
    statRows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = classNames("dashboard-stat", row[3] && "dashboard-stat-" + row[3]);
      item.innerHTML = "<span></span><strong></strong><em></em>";
      item.querySelector("strong").textContent = formatDashboardValue(row[1]);
      item.querySelector("span").textContent = row[0];
      item.querySelector("em").textContent = row[2] || "";
      els.dashboardStats.appendChild(item);
    });

    setDashboardRows("dashboardMemory", [
      ["Reusable", firstNumber(memoryGraph.approved_packets, memoryNodes) + " packets"],
      ["Linked", memoryCodeEdges.length + " code links"],
      ["Review", pendingReview ? pendingReview + " pending" : "clear"]
    ]);
    setDashboardRows("dashboardGraph", [
      ["Files", firstNumber(codeGraph.files, structural.files, countEntitiesByType("file"))],
      ["Symbols", firstNumber(codeGraph.symbols, structural.symbols, countEntitiesByType("symbol"))],
      ["Coverage", codeGraph.indexer_coverage_percent != null ? codeGraph.indexer_coverage_percent + "%" : "not loaded"]
    ]);
    setDashboardRows("dashboardIntel", [
      ["Risk targets", riskTargets.length || "none"],
      ["Ownership silos", ownerSilos || "none"],
      ["Decision coverage", reports.decisions && reports.decisions.coverage_percent != null ? reports.decisions.coverage_percent + "%" : "not loaded"]
    ]);
    setDashboardRows("dashboardReview", [
      ["Handoff", readiness.label],
      ["Pending", pendingReview || "none"],
      ["Stale / duplicate", staleFlags + " / " + duplicateFlags],
      ["Missing context", missingContext || "none"]
    ]);
    renderDashboardCharts({
      metrics: metrics,
      reports: reports,
      memoryGraph: memoryGraph,
      codeGraph: codeGraph,
      structural: structural,
      memoryCodeEdges: memoryCodeEdges,
      memoryNodes: memoryNodes,
      pendingReview: pendingReview,
      staleFlags: staleFlags,
      duplicateFlags: duplicateFlags,
      missingContext: missingContext,
      riskTargets: riskTargets,
      ownerSilos: ownerSilos,
      hotspots: hotspots
    });
  }

  function renderDashboardCharts(data) {
    if (!els.dashboardCharts) return;
    var approvedPackets = Number(firstNumber(data.memoryGraph.approved_packets, data.memoryNodes, 0));
    var linkedPacketIds = new Set();
    data.memoryCodeEdges.forEach(function (edge) {
      var from = state.entityById.get(edge.from);
      var to = state.entityById.get(edge.to);
      if (from && isMemoryPacketEntity(from)) linkedPacketIds.add(from.id);
      if (to && isMemoryPacketEntity(to)) linkedPacketIds.add(to.id);
    });
    var memoryGrounding = approvedPackets ? Math.round(linkedPacketIds.size / approvedPackets * 100) : 0;
    var sourceCoverage = Number(firstNumber(data.codeGraph.indexer_coverage_percent, 0));
    var blockers = data.pendingReview + data.staleFlags + data.duplicateFlags + data.missingContext;
    var riskSignals = data.riskTargets.length + data.ownerSilos + data.hotspots;
    els.dashboardCharts.textContent = "";
    [
      metricDonut("Memory grounding", memoryGrounding, linkedPacketIds.size + " of " + approvedPackets + " packets linked to code", "Open Memory and fix Needs paths first.", memoryGrounding >= 70 ? "ok" : "warn"),
      metricDonut("Source map", sourceCoverage, firstNumber(data.codeGraph.files, data.structural.files, 0) + " files indexed for graph recall", "If this drops, refresh indexing before relying on graph answers.", sourceCoverage >= 90 ? "ok" : "warn"),
      metricBars("Handoff blockers", blockers ? blockers + " open" : "clear", [
        { label: "Pending", value: data.pendingReview, score: Math.min(100, data.pendingReview * 24), status: data.pendingReview ? "warn" : "ok" },
        { label: "Stale", value: data.staleFlags, score: Math.min(100, data.staleFlags * 24), status: data.staleFlags ? "warn" : "ok" },
        { label: "Duplicate", value: data.duplicateFlags, score: Math.min(100, data.duplicateFlags * 24), status: data.duplicateFlags ? "warn" : "ok" },
        { label: "Missing context", value: data.missingContext, score: Math.min(100, data.missingContext * 18), status: data.missingContext ? "warn" : "ok" }
      ], blockers ? "Resolve Review before handing work to another agent." : "Memory is clean for handoff.", blockers ? "warn" : "ok"),
      metricBars("Change risk", riskSignals ? riskSignals + " signals" : "none", [
        { label: "Targets", value: data.riskTargets.length, score: Math.min(100, data.riskTargets.length * 18), status: data.riskTargets.length ? "warn" : "ok" },
        { label: "Silos", value: data.ownerSilos, score: Math.min(100, data.ownerSilos * 18), status: data.ownerSilos ? "warn" : "ok" },
        { label: "Hotspots", value: data.hotspots, score: Math.min(100, data.hotspots * 18), status: data.hotspots ? "danger" : "ok" }
      ], riskSignals ? "Open Intel or Owners before editing risky files." : "No loaded risk flags.", riskSignals ? "warn" : "ok")
    ].forEach(function (card) { els.dashboardCharts.appendChild(card); });
  }

  function metricDonut(title, percent, detail, action, status) {
    var card = document.createElement("article");
    var value = clamp(Number(percent || 0), 0, 100);
    card.className = classNames("metric-card", status && "metric-card-" + status);
    card.innerHTML = [
      "<div class=\"metric-card-head\"><span></span><strong></strong></div>",
      "<div class=\"metric-visual\"><div class=\"metric-donut\"><span></span></div><p></p></div>",
      "<em></em>"
    ].join("");
    card.querySelector(".metric-card-head span").textContent = title;
    card.querySelector(".metric-card-head strong").textContent = value + "%";
    card.querySelector(".metric-donut").style.setProperty("--value", value);
    card.querySelector(".metric-donut span").textContent = value + "%";
    card.querySelector("p").textContent = detail || "";
    card.querySelector("em").textContent = action || "";
    return card;
  }

  function metricBars(title, value, rows, action, status) {
    var card = document.createElement("article");
    card.className = classNames("metric-card", status && "metric-card-" + status);
    card.innerHTML = [
      "<div class=\"metric-card-head\"><span></span><strong></strong></div>",
      "<div class=\"metric-bars\"></div>",
      "<em></em>"
    ].join("");
    card.querySelector(".metric-card-head span").textContent = title;
    card.querySelector(".metric-card-head strong").textContent = formatDashboardValue(value);
    var list = card.querySelector(".metric-bars");
    rows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = classNames("metric-bar", row.status && "metric-bar-" + row.status);
      item.innerHTML = "<span></span><strong></strong><i></i>";
      item.querySelector("span").textContent = row.label;
      item.querySelector("strong").textContent = formatDashboardValue(row.value);
      item.querySelector("i").style.width = clamp(Number(row.score || 0), row.value ? 8 : 0, 100) + "%";
      list.appendChild(item);
    });
    card.querySelector("em").textContent = action || "";
    return card;
  }

  function dashboardReadiness(metrics, pendingReview, staleFlags, duplicateFlags, missingContext) {
    if (pendingReview || staleFlags || duplicateFlags || missingContext) {
      return { label: "Needs review", detail: pendingReview + " pending, " + staleFlags + " stale, " + duplicateFlags + " duplicate, " + missingContext + " missing context", status: "warn" };
    }
    if (metrics && metrics.harness && metrics.harness.validation_ok) {
      return { label: "Ready", detail: "Memory and graph checks are clean", status: "ok" };
    }
    return { label: "Unknown", detail: "Run kage refresh or open local viewer with metrics", status: "warn" };
  }

  function dashboardMemoryCoverage(reports, memoryCodeEdges, memoryGraph, memoryNodes) {
    var coverage = reports.decisions && reports.decisions.coverage_percent;
    if (coverage != null) {
      return {
        label: coverage + "%",
        detail: "Decision memory coverage for important code paths",
        status: Number(coverage) >= 70 ? "ok" : "warn"
      };
    }
    var packets = Number(firstNumber(memoryGraph.approved_packets, memoryNodes, 0));
    if (!packets) return { label: "No memory", detail: "Agents will rediscover repo context", status: "warn" };
    return {
      label: memoryCodeEdges.length + " links",
      detail: "Memory packets connected back to code",
      status: memoryCodeEdges.length ? "ok" : "warn"
    };
  }

  function setDashboardRows(cardId, rows) {
    var card = document.getElementById(cardId);
    if (!card) return;
    var list = card.querySelector("ul");
    if (!list) return;
    list.textContent = "";
    rows.forEach(function (row) {
      var item = document.createElement("li");
      item.innerHTML = "<strong></strong><span></span>";
      item.querySelector("strong").textContent = row[0];
      item.querySelector("span").textContent = formatDashboardValue(row[1]);
      list.appendChild(item);
    });
  }

  function firstNumber() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = arguments[index];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "n/a";
  }

  function countEntitiesByType(type) {
    return state.entities.filter(function (entity) { return entity.type === type; }).length;
  }

  function formatDashboardValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
    return String(value == null ? "n/a" : value);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char;
    });
  }

  function renderMemoryLibrary() {
    if (!els.memoryList) return;
    var memoryEntities = state.entities.filter(function (entity) {
      return isMemoryPacketEntity(entity);
    }).sort(function (a, b) {
      return entityImportance(b) - entityImportance(a) || displayName(a).localeCompare(displayName(b));
    });
    var memoryLinkCounts = new Map();
    state.edges.forEach(function (edge) {
      if (!isMemoryCodeEdge(edge)) return;
      var fromEntity = state.entityById.get(edge.from);
      var toEntity = state.entityById.get(edge.to);
      if (fromEntity && fromEntity.graph_kind === "memory" && toEntity && toEntity.graph_kind === "code") {
        memoryLinkCounts.set(edge.from, (memoryLinkCounts.get(edge.from) || 0) + 1);
      }
      if (toEntity && toEntity.graph_kind === "memory" && fromEntity && fromEntity.graph_kind === "code") {
        memoryLinkCounts.set(edge.to, (memoryLinkCounts.get(edge.to) || 0) + 1);
      }
    });
    var linkedCount = memoryEntities.filter(function (entity) { return (memoryLinkCounts.get(entity.id) || 0) > 0; }).length;
    var query = parseSearchQuery(els.memorySearch ? els.memorySearch.value : "");
    var filter = els.memoryFilter ? els.memoryFilter.value : "all";
    var filtered = memoryEntities.filter(function (entity) {
      var linkCount = memoryLinkCounts.get(entity.id) || 0;
      if (filter === "linked" && !linkCount) return false;
      if (filter === "needs-paths" && linkCount) return false;
      if (["decision", "runbook", "bug_fix"].indexOf(filter) !== -1 && !memoryMatchesKind(entity, filter)) return false;
      return matchesSearchQuery(entity, query);
    });
    els.memoryStatus.textContent = filtered.length + " shown";
    if (els.memoryStats) {
      els.memoryStats.innerHTML = [
        memoryStat("Reusable", memoryEntities.length),
        memoryStat("Code-linked", linkedCount),
        memoryStat("Needs paths", memoryEntities.length - linkedCount)
      ].join("");
    }
    if (els.memoryOverview) renderMemoryOverview(memoryEntities, linkedCount);
    els.memoryList.textContent = "";
    if (!memoryEntities.length) {
      els.memoryList.className = "memory-list details-empty";
      els.memoryList.textContent = "No memory packets loaded. Launch with `kage viewer --project <repo>` to load repo memory.";
      return;
    }
    if (!filtered.length) {
      els.memoryList.className = "memory-list details-empty";
      els.memoryList.textContent = "No matching memory. Clear search or switch the filter.";
      return;
    }
    filtered.sort(function (a, b) {
      return (memoryLinkCounts.get(b.id) || 0) - (memoryLinkCounts.get(a.id) || 0) ||
        entityImportance(b) - entityImportance(a) ||
        displayName(a).localeCompare(displayName(b));
    });
    els.memoryList.className = "memory-list";
    filtered.slice(0, 60).forEach(function (entity) {
      var links = memoryCodeLinksForEntity(entity.id);
      var firstCodeTarget = primaryCodeTargetForMemory(entity.id, links);
      var item = document.createElement("button");
      item.type = "button";
      var selected = state.selected && state.selected.kind === "entity" && state.selected.id === entity.id;
      item.className = classNames("memory-row", selected && "selected");
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.innerHTML = [
        "<span class=\"memory-row-main\"><strong></strong><em></em></span>",
        "<span class=\"memory-row-meta\"></span>",
        "<span class=\"memory-row-target\"></span>"
      ].join("");
      item.querySelector("strong").textContent = displayName(entity);
      item.querySelector("em").textContent = entity.type || "memory";
      item.querySelector(".memory-row-meta").textContent = trimIntelText(entity.summary || entity.description || entity.path || "No summary", 150);
      item.querySelector(".memory-row-target").textContent = links.length
        ? links.length + " code link" + (links.length === 1 ? "" : "s") + (firstCodeTarget ? " | " + trimIntelText(codeTargetLabel(firstCodeTarget), 64) : "")
        : "needs code paths";
      item.addEventListener("click", function () {
        selectEntity(entity.id, true);
        render();
      });
      els.memoryList.appendChild(item);
    });
    if (filtered.length > 60) appendListNote(els.memoryList, "Showing 60 of " + filtered.length + ". Search a path or topic to narrow.");
  }

  function memoryStat(label, value) {
    return "<div><strong>" + escapeHtml(String(value)) + "</strong><span>" + escapeHtml(label) + "</span></div>";
  }

  function renderMemoryOverview(memoryEntities, linkedCount) {
    els.memoryOverview.textContent = "";
    var total = memoryEntities.length;
    var linkedPercent = total ? Math.round(linkedCount / total * 100) : 0;
    var typeCounts = new Map();
    memoryEntities.forEach(function (entity) {
      typeCounts.set(entity.type || "memory", (typeCounts.get(entity.type || "memory") || 0) + 1);
    });
    var topTypes = Array.from(typeCounts.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, 4);
    var maxType = Math.max(1, topTypes.reduce(function (max, row) { return Math.max(max, row[1]); }, 0));
    els.memoryOverview.appendChild(metricDonut(
      "Code grounding",
      linkedPercent,
      linkedCount + " packet(s) are connected to files, symbols, routes, or tests",
      linkedPercent >= 70 ? "Use linked memory before edits." : "Filter Needs paths and add concrete code references.",
      linkedPercent >= 70 ? "ok" : "warn"
    ));
    els.memoryOverview.appendChild(metricBars("Memory mix", total + " packets", topTypes.map(function (row) {
      return {
        label: row[0],
        value: row[1],
        score: row[1] / maxType * 100,
        status: row[0] === "memory" ? "" : "ok"
      };
    }), "A healthy repo has decisions, bug fixes, runbooks, gotchas, and code explanations.", "ok"));
  }

  function memoryCodeLinksForEntity(entityId) {
    return state.edges.filter(function (edge) {
      if ((edge.from !== entityId && edge.to !== entityId) || !isMemoryCodeEdge(edge)) return false;
      var other = state.entityById.get(edge.from === entityId ? edge.to : edge.from);
      return Boolean(other && other.graph_kind === "code");
    });
  }

  function primaryCodeTargetForMemory(entityId, links) {
    return links.map(function (edge) {
      return state.entityById.get(edge.from === entityId ? edge.to : edge.from);
    }).filter(Boolean).sort(function (a, b) {
      return codeTargetScore(b) - codeTargetScore(a) || codeTargetLabel(a).localeCompare(codeTargetLabel(b));
    })[0] || null;
  }

  function codeTargetScore(entity) {
    var score = 0;
    if (!entity) return score;
    if (entity.type === "file") score += 80;
    if (entity.type === "route" || entity.type === "test") score += 60;
    if (entity.type === "symbol") score += 45;
    if (entity.path) score += 35;
    if (entity.line) score += 8;
    if (String(entity.path || "").indexOf(".agent_memory/") === 0) score -= 100;
    return score;
  }

  function codeTargetLabel(entity) {
    if (!entity) return "";
    if (entity.type === "file" && entity.path) return entity.path;
    if (entity.type === "route") {
      return (entity.method && entity.route_path ? entity.method + " " + entity.route_path : displayName(entity)) +
        (entity.path ? " in " + entity.path : "");
    }
    if ((entity.type === "symbol" || entity.type === "test") && entity.path) {
      return displayName(entity) + " in " + entity.path;
    }
    return entity.path || displayName(entity);
  }

  function memoryMatchesKind(entity, kind) {
    if (!entity) return false;
    if (entity.type === kind) return true;
    var normalizedKind = String(kind || "").replace(/_/g, " ");
    var text = [
      entity.type,
      entity.name,
      entity.summary,
      entity.description,
      entity.path
    ].join(" ").toLowerCase();
    return text.indexOf(kind) !== -1 || text.indexOf(normalizedKind) !== -1;
  }

  function isMemoryPacketEntity(entity) {
    return Boolean(entity && entity.graph_kind === "memory" && MEMORY_PACKET_TYPES.has(entity.type));
  }

  function renderOwners() {
    if (!els.ownersList) return;
    var contributors = state.reports && state.reports.contributors;
    var risk = state.reports && state.reports.risk;
    var profiles = contributors && Array.isArray(contributors.contributors) ? contributors.contributors : [];
    var silos = risk && Array.isArray(risk.ownership_silos) ? risk.ownership_silos : [];
    els.ownersStatus.textContent = profiles.length ? profiles.length + " contributors" : "not loaded";
    els.ownersList.textContent = "";
    if (els.ownersSummary) renderOwnersSummary(profiles, silos);
    if (!profiles.length && !silos.length) {
      els.ownersList.className = "owners-list details-empty";
      els.ownersList.textContent = "No owner report loaded. Launch with `kage viewer --project <repo>` to load contributor and ownership reports.";
      return;
    }
    els.ownersList.className = "owners-list";
    profiles.slice(0, 24).forEach(function (profile) {
      var item = document.createElement("article");
      item.className = "owner-card";
      item.innerHTML = [
        "<div class=\"owner-head\"><strong></strong><span></span></div>",
        "<div class=\"owner-stats\"></div>",
        "<p></p>"
      ].join("");
      item.querySelector("strong").textContent = shortContributor(profile.contributor);
      item.querySelector(".owner-head span").textContent = (profile.primary_owned_files || 0) + " owned files";
      item.querySelector(".owner-stats").textContent = [
        (profile.commits_total || 0) + " commits",
        (profile.commits_90d || 0) + " in 90d",
        (profile.silo_files && profile.silo_files.length ? profile.silo_files.length + " silo files" : "no silo flags")
      ].join(" | ");
      item.querySelector("p").textContent = Array.isArray(profile.top_modules) && profile.top_modules.length
        ? "Modules: " + profile.top_modules.slice(0, 4).join(", ")
        : "Local git ownership signal.";
      els.ownersList.appendChild(item);
    });
    if (silos.length) {
      var siloSection = document.createElement("section");
      siloSection.className = "owner-silos";
      siloSection.innerHTML = "<h3>Ownership Silos</h3>";
      silos.slice(0, 16).forEach(function (silo) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "owner-silo-row";
        row.innerHTML = "<strong></strong><span></span>";
        row.querySelector("strong").textContent = silo.file_path || "file";
        row.querySelector("span").textContent = [
          shortContributor(silo.primary_owner || "unknown"),
          silo.primary_owner_pct != null ? Math.round(Number(silo.primary_owner_pct || 0) * 100) + "% ownership" : "",
          (silo.commit_count_total || 0) + " commits"
        ].filter(Boolean).join(" | ");
        row.addEventListener("click", function () {
          focusGraphPath(silo.file_path);
        });
        siloSection.appendChild(row);
      });
      els.ownersList.appendChild(siloSection);
    }
  }

  function renderOwnersSummary(profiles, silos) {
    els.ownersSummary.textContent = "";
    if (!profiles.length && !silos.length) return;
    var totalOwned = profiles.reduce(function (sum, profile) { return sum + Number(profile.primary_owned_files || 0); }, 0);
    var topOwned = profiles.reduce(function (max, profile) { return Math.max(max, Number(profile.primary_owned_files || 0)); }, 0);
    var topOwnerShare = totalOwned ? Math.round(topOwned / totalOwned * 100) : 0;
    var commits90 = profiles.reduce(function (sum, profile) { return sum + Number(profile.commits_90d || 0); }, 0);
    var maxOwned = Math.max(1, topOwned);
    els.ownersSummary.appendChild(metricDonut(
      "Backup coverage",
      Math.max(0, 100 - topOwnerShare),
      silos.length ? silos.length + " single-owner file(s) need backup reviewers" : "No loaded ownership silos",
      silos.length ? "Click silo rows to inspect the file in Graph." : "Keep ownership spread visible before large changes.",
      silos.length ? "warn" : "ok"
    ));
    els.ownersSummary.appendChild(metricBars("Owner concentration", profiles.length + " profiles", profiles.slice(0, 4).map(function (profile) {
      var owned = Number(profile.primary_owned_files || 0);
      return {
        label: shortContributor(profile.contributor),
        value: owned + " files",
        score: owned / maxOwned * 100,
        status: owned && Array.isArray(profile.silo_files) && profile.silo_files.length ? "warn" : "ok"
      };
    }), "Use this for reviewer routing and bus-factor checks.", silos.length ? "warn" : "ok"));
    els.ownersSummary.appendChild(metricBars("Recent activity", commits90 + " commits", profiles.slice(0, 4).map(function (profile) {
      var commits = Number(profile.commits_90d || 0);
      var maxCommits = Math.max(1, profiles.reduce(function (max, item) { return Math.max(max, Number(item.commits_90d || 0)); }, 0));
      return {
        label: shortContributor(profile.contributor),
        value: commits,
        score: commits / maxCommits * 100,
        status: commits ? "ok" : ""
      };
    }), "Prefer recent editors for fast review context.", "ok"));
  }

  function renderReviewQueue() {
    if (!els.reviewList) return;
    var packets = state.pendingPackets || [];
    var inbox = state.inbox;
    var inboxItems = inbox && Array.isArray(inbox.items) ? inbox.items : [];
    var counts = inbox && inbox.counts ? inbox.counts : {};
    var openCount = reviewOpenCount(counts, packets, inboxItems);
    els.reviewCount.textContent = String(openCount);
    els.reviewList.textContent = "";
    if (els.reviewOverview) renderReviewOverview(inbox, packets, inboxItems);
    if (!packets.length && !inboxItems.length && !state.reviewText) {
      els.reviewList.className = "review-list details-empty";
      els.reviewList.textContent = "No pending packets loaded. Launch with `kage viewer --project <repo>` to load review context automatically.";
      return;
    }
    els.reviewList.className = "review-list";
    if (inbox) {
      var summary = document.createElement("div");
      summary.className = "review-item";
      summary.innerHTML = [
        "<div class=\"review-title\"></div>",
        "<div class=\"review-meta\"></div>",
        "<div class=\"review-summary\"></div>",
        "<div class=\"review-risks\"></div>"
      ].join("");
      summary.querySelector(".review-title").textContent = "Memory inbox";
      summary.querySelector(".review-meta").textContent = [
        "pending " + (counts.pending || 0),
        "stale " + (counts.stale || 0),
        "duplicates " + (counts.duplicates || 0),
        "missing context " + (counts.missing_context || 0)
      ].join(" | ");
      summary.querySelector(".review-summary").textContent = Array.isArray(inbox.recommendations) && inbox.recommendations.length
        ? inbox.recommendations.slice(0, 2).join(" ")
        : "No inbox recommendations.";
      summary.querySelector(".review-risks").textContent = openCount ? "Resolve inbox items before merge" : "Ready for handoff";
      els.reviewList.appendChild(summary);
    }
    inboxItems.slice(0, 8).forEach(function (entry) {
      var item = document.createElement("div");
      item.className = "review-item";
      item.innerHTML = [
        "<div class=\"review-title\"></div>",
        "<div class=\"review-meta\"></div>",
        "<div class=\"review-summary\"></div>",
        "<div class=\"review-risks\"></div>"
      ].join("");
      item.querySelector(".review-title").textContent = entry.title || entry.summary || entry.kind;
      item.querySelector(".review-meta").textContent = [entry.kind, entry.severity, entry.type, entry.status].filter(Boolean).join(" | ");
      item.querySelector(".review-summary").textContent = entry.action || entry.summary || "";
      item.querySelector(".review-risks").textContent = Array.isArray(entry.reasons) && entry.reasons.length
        ? trimIntelText(entry.reasons[0], 86)
        : "Review before handoff";
      els.reviewList.appendChild(item);
    });
    packets.forEach(function (packet) {
      var item = document.createElement("div");
      item.className = "review-item";
      var quality = packet.quality || {};
      item.innerHTML = [
        "<div class=\"review-title\"></div>",
        "<div class=\"review-meta\"></div>",
        "<div class=\"review-summary\"></div>",
        "<div class=\"review-risks\"></div>"
      ].join("");
      item.querySelector(".review-title").textContent = packet.title || packet.id;
      item.querySelector(".review-meta").textContent = [packet.type, packet.status, "score " + (quality.score == null ? "n/a" : quality.score + "/100")].filter(Boolean).join(" | ");
      item.querySelector(".review-summary").textContent = packet.summary || "";
      item.querySelector(".review-risks").textContent = Array.isArray(quality.risks) && quality.risks.length
        ? "Resolve " + quality.risks.join(", ")
        : "Evidence looks clean";
      els.reviewList.appendChild(item);
    });
    if (state.reviewText) {
      var artifact = document.createElement("details");
      artifact.className = "review-artifact";
      artifact.innerHTML = "<summary>Review artifact markdown</summary><pre></pre>";
      artifact.querySelector("pre").textContent = state.reviewText.slice(0, 12000);
      els.reviewList.appendChild(artifact);
    }
  }

  function renderReviewOverview(inbox, packets, inboxItems) {
    els.reviewOverview.textContent = "";
    var counts = inbox && inbox.counts ? inbox.counts : {};
    var pending = Number(firstNumber(counts.pending, packets.length, 0));
    var stale = Number(firstNumber(counts.stale, 0));
    var duplicates = Number(firstNumber(counts.duplicates, 0));
    var missingContext = Number(firstNumber(counts.missing_context, 0));
    var blockers = reviewOpenCount(counts, packets, inboxItems);
    els.reviewOverview.appendChild(metricDonut(
      "Handoff readiness",
      blockers ? 0 : 100,
      blockers ? blockers + " review blocker(s) need attention" : "No pending, stale, duplicate, or missing-context memory",
      blockers ? "Resolve these before trusting branch memory." : "Ready to hand work to another agent or teammate.",
      blockers ? "warn" : "ok"
    ));
    els.reviewOverview.appendChild(metricBars("Inbox breakdown", blockers ? blockers + " open" : "clear", [
      { label: "Pending", value: pending, score: Math.min(100, pending * 24), status: pending ? "warn" : "ok" },
      { label: "Stale", value: stale, score: Math.min(100, stale * 24), status: stale ? "warn" : "ok" },
      { label: "Duplicates", value: duplicates, score: Math.min(100, duplicates * 24), status: duplicates ? "warn" : "ok" },
      { label: "Missing context", value: missingContext, score: Math.min(100, missingContext * 24), status: missingContext ? "warn" : "ok" }
    ], "These are the only review metrics that should block merge or handoff.", blockers ? "warn" : "ok"));
  }

  function reviewOpenCount(counts, packets, inboxItems) {
    var pending = Number(firstNumber(counts && counts.pending, packets && packets.length, 0));
    var stale = Number(firstNumber(counts && counts.stale, 0));
    var duplicates = Number(firstNumber(counts && counts.duplicates, 0));
    var missingContext = Number(firstNumber(counts && counts.missing_context, 0));
    var counted = pending + stale + duplicates + missingContext;
    if (counted) return counted;
    return Array.isArray(inboxItems) ? inboxItems.length : 0;
  }

  function renderProof() {
    if (!els.proofList) return;
    var metrics = state.metrics;
    els.proofList.textContent = "";
    if (!metrics) {
      els.proofStatus.textContent = "not loaded";
      if (els.proofOverview) els.proofOverview.textContent = "";
      els.proofList.className = "proof-list details-empty";
      els.proofList.textContent = "Metrics not loaded. Run `kage metrics --project <repo> --json > .agent_memory/metrics.json` or launch with `kage viewer`.";
      return;
    }
    els.proofStatus.textContent = "loaded";
    els.proofList.className = "proof-list";
    if (els.proofOverview) renderProofOverview(metrics, state.reports || {});
    var rows = [
      ["Validation", metrics.harness && metrics.harness.validation_ok ? "clean" : "check"],
      ["Evidence", metrics.memory_graph ? metrics.memory_graph.evidence_coverage_percent + "%" : "n/a"],
      ["Pending review", metrics.memory_graph ? String(metrics.memory_graph.pending_packets) : "n/a"],
      ["Recall savings", metrics.pain ? String(metrics.pain.estimated_tokens_saved) : metrics.savings ? String(metrics.savings.estimated_tokens_saved_per_recall) : "n/a"]
    ];
    rows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = "proof-item";
      item.innerHTML = "<strong></strong><span></span>";
      item.querySelector("strong").textContent = row[1];
      item.querySelector("span").textContent = row[0];
      els.proofList.appendChild(item);
    });
  }

  function renderProofOverview(metrics, reports) {
    els.proofOverview.textContent = "";
    var quality = reports.quality || {};
    var benchmark = reports.benchmark || {};
    var gates = Array.isArray(benchmark.gates) ? benchmark.gates : [];
    var passingGates = gates.filter(function (gate) { return gate.pass; }).length;
    var gatePercent = gates.length ? Math.round(passingGates / gates.length * 100) : (benchmark.ok ? 100 : 0);
    var evidence = Number(firstNumber(metrics.memory_graph && metrics.memory_graph.evidence_coverage_percent, quality.evidence_coverage_percent, 0));
    var pathGrounding = Number(firstNumber(quality.path_grounding_coverage_percent, 0));
    els.proofOverview.appendChild(metricDonut(
      "Trust gate",
      gatePercent,
      gates.length ? passingGates + " of " + gates.length + " benchmark gates passing" : "Benchmark report not loaded",
      gatePercent >= 100 ? "Keep this green before publishing or handing off." : "Fix failing proof gates before release.",
      gatePercent >= 100 ? "ok" : "warn"
    ));
    els.proofOverview.appendChild(metricBars("Memory quality", evidence + "% evidence", [
      { label: "Evidence", value: evidence + "%", score: evidence, status: evidence >= 80 ? "ok" : "warn" },
      { label: "Path grounded", value: pathGrounding ? pathGrounding + "%" : "n/a", score: pathGrounding || 0, status: pathGrounding >= 80 ? "ok" : "warn" },
      { label: "Useful", value: quality.useful_memory_ratio_percent != null ? quality.useful_memory_ratio_percent + "%" : "n/a", score: Number(quality.useful_memory_ratio_percent || 0), status: Number(quality.useful_memory_ratio_percent || 0) >= 70 ? "ok" : "warn" }
    ], "Trust memory only when it is evidence-backed and path-grounded.", evidence >= 80 ? "ok" : "warn"));
  }

  function renderIntelligence() {
    if (!els.intelligenceList) return;
    var reports = state.reports || {};
    var cards = buildIntelligenceCards(reports);
    els.intelligenceList.textContent = "";
    els.intelligenceStatus.textContent = cards.length ? cards.length + " loaded" : "not loaded";
    if (!cards.length) {
      els.intelligenceList.className = "intelligence-list details-empty";
      els.intelligenceList.textContent = "No repo intelligence reports loaded. Launch with `kage viewer --project <repo>` to load risk, module health, graph insights, and workspace reports.";
      return;
    }
    els.intelligenceList.className = "intelligence-list";
    normalizeIntelCards(cards).slice(0, 6).forEach(function (card) {
      var item = document.createElement("article");
      item.className = "intel-card";
      item.innerHTML = [
        "<div class=\"intel-card-head\"><div><h3></h3><span></span></div><strong></strong></div>",
        "<div class=\"intel-metric-label\"></div>",
        "<p class=\"intel-highlight\"></p>",
        "<p class=\"intel-action\"><b>Action:</b> <span></span></p>",
        "<ul></ul>"
      ].join("");
      item.querySelector("h3").textContent = card.title;
      item.querySelector(".intel-card-head span").textContent = card.kicker;
      item.querySelector(".intel-card-head strong").textContent = card.metric || "n/a";
      item.querySelector(".intel-metric-label").textContent = card.metricLabel || "signal";
      item.querySelector(".intel-highlight").textContent = card.highlight || card.summary || "";
      item.querySelector(".intel-action span").textContent = card.action || "Review this signal before changing related code.";
      var list = item.querySelector("ul");
      card.rows.slice(0, 3).forEach(function (row) {
        var li = document.createElement("li");
        li.innerHTML = "<strong></strong> <span></span>";
        li.querySelector("strong").textContent = row[0];
        li.querySelector("span").textContent = trimIntelText(row[1], 92);
        list.appendChild(li);
      });
      els.intelligenceList.appendChild(item);
    });
    var sections = rankIntelligenceSections(buildIntelligenceSections(reports)).slice(0, 4);
    if (sections.length) {
      var deepGrid = document.createElement("div");
      deepGrid.className = "intel-deep-grid";
      sections.forEach(function (section) {
        deepGrid.appendChild(renderIntelligenceSection(section));
      });
      els.intelligenceList.appendChild(deepGrid);
    }
  }

  function renderIntelligenceSection(section) {
    var panel = document.createElement("article");
    panel.className = "intel-section";
    var header = document.createElement("div");
    header.className = "intel-section-header";
    header.innerHTML = "<div><h3></h3><span></span></div><strong></strong>";
    header.querySelector("h3").textContent = section.title;
    header.querySelector("span").textContent = section.kicker || "";
    header.querySelector("strong").textContent = section.stat || "";
    panel.appendChild(header);
    if (section.summary) {
      var summary = document.createElement("p");
      summary.className = "intel-section-summary";
      summary.textContent = section.summary;
      panel.appendChild(summary);
    }
    var list = document.createElement("div");
    list.className = "intel-section-list";
    section.rows.slice(0, section.limit || 8).forEach(function (row) {
      var rowEl = document.createElement(row.path ? "button" : "div");
      if (row.path) rowEl.type = "button";
      rowEl.className = classNames("intel-row", row.status && "intel-row-" + safeCssName(row.status), row.path && "clickable");
      rowEl.innerHTML = [
        "<span class=\"intel-row-main\"><strong></strong><em></em></span>",
        "<span class=\"intel-row-meta\"></span>",
        "<span class=\"intel-row-bar\"><i></i></span>"
      ].join("");
      rowEl.querySelector("strong").textContent = row.label || "";
      rowEl.querySelector("em").textContent = row.value || "";
      rowEl.querySelector(".intel-row-meta").textContent = row.meta || "";
      rowEl.querySelector(".intel-row-bar i").style.width = clamp(Number(row.score || 0), 4, 100) + "%";
      if (row.path) {
        rowEl.title = "Focus " + row.path + " in the graph";
        rowEl.setAttribute("aria-label", "Focus " + row.path + " in Graph");
        rowEl.addEventListener("click", function () {
          focusGraphPath(row.path);
        });
      }
      list.appendChild(rowEl);
    });
    panel.appendChild(list);
    return panel;
  }

  function rankIntelligenceSections(sections) {
    return sections.slice().sort(function (a, b) {
      return intelligenceSectionPriority(a) - intelligenceSectionPriority(b);
    });
  }

  function intelligenceSectionPriority(section) {
    var title = String(section && section.title || "").toLowerCase();
    if (title.indexOf("blast") !== -1 || title.indexOf("risk") !== -1) return 0;
    if (title.indexOf("onboarding") !== -1 || title.indexOf("decision") !== -1) return 1;
    if (title.indexOf("module") !== -1 || title.indexOf("health") !== -1) return 2;
    if (title.indexOf("owner") !== -1 || title.indexOf("contributor") !== -1) return 3;
    return 4;
  }

  function buildIntelligenceSections(reports) {
    var sections = [];
    var contributors = reports.contributors;
    var risk = reports.risk;
    var decisions = reports.decisions;
    var health = reports.moduleHealth;
    var insights = reports.graphInsights;
    var workspace = reports.workspace;

    if (contributors || risk) {
      var profiles = contributors && Array.isArray(contributors.contributors) ? contributors.contributors : [];
      var silos = risk && Array.isArray(risk.ownership_silos) ? risk.ownership_silos : [];
      var maxOwned = Math.max(1, profiles.reduce(function (max, profile) {
        return Math.max(max, Number(profile.primary_owned_files || 0));
      }, 0));
      var rows = profiles.slice(0, 6).map(function (profile) {
        var owned = Number(profile.primary_owned_files || 0);
        return {
          label: shortContributor(profile.contributor),
          value: owned + " owned",
          meta: profile.commits_90d + " commits in 90d, " + (profile.silo_files ? profile.silo_files.length : 0) + " silo files",
          score: owned / maxOwned * 100,
          status: owned > 0 && profile.silo_files && profile.silo_files.length ? "warn" : "ok",
        };
      }).concat(silos.slice(0, 4).map(function (silo) {
        return {
          label: silo.file_path,
          value: Math.round(Number(silo.primary_owner_pct || 0) * 100) + "% owner",
          meta: shortContributor(silo.primary_owner || "unknown") + ", " + (silo.commit_count_total || 0) + " commits",
          score: Number(silo.primary_owner_pct || 0) * 100,
          status: "warn",
          path: silo.file_path,
        };
      }));
      if (rows.length) {
        sections.push({
          title: "Ownership Map",
          kicker: "who owns what",
          stat: silos.length + " silos",
          summary: "Action: assign backup reviewers for silo files before risky changes.",
          rows: rows,
          limit: 10,
        });
      }
    }

    if (health && Array.isArray(health.modules)) {
      var modules = health.modules.slice().sort(function (a, b) {
        return Number(a.score || 0) - Number(b.score || 0) || String(a.module).localeCompare(String(b.module));
      });
      sections.push({
        title: "Module Health Map",
        kicker: "churn / tests / ownership",
        stat: modules.length + " modules",
        summary: "Action: start cleanup and test planning from the lowest-score modules.",
        rows: modules.slice(0, 8).map(function (item) {
          return {
            label: item.module,
            value: item.grade + " / " + item.score,
            meta: Array.isArray(item.reasons) ? item.reasons.slice(0, 2).join("; ") : "",
            score: Number(item.score || 0),
            status: Number(item.score || 0) < 60 ? "danger" : Number(item.score || 0) < 75 ? "warn" : "ok",
          };
        }),
      });
    }

    if (decisions && Array.isArray(decisions.coverage_gaps)) {
      var gaps = decisions.coverage_gaps;
      sections.push({
        title: "Onboarding Targets",
        kicker: "missing repo lore",
        stat: (decisions.coverage_percent != null ? decisions.coverage_percent + "%" : "n/a"),
        summary: "Action: capture why-memory for these files before the next agent works there.",
        rows: gaps.slice(0, 8).map(function (gap) {
          var score = Math.min(100, Number(gap.dependents || 0) * 18 + Number(gap.churn_90d || 0) * 6 + 12);
          return {
            label: gap.path,
            value: "needs memory",
            meta: gap.reason || "",
            score: score,
            status: "warn",
            path: gap.path,
          };
        }),
      });
    }

    if (insights && Array.isArray(insights.communities)) {
      var communities = insights.communities.slice().sort(function (a, b) {
        return (b.files ? b.files.length : 0) - (a.files ? a.files.length : 0);
      });
      var maxFiles = Math.max(1, communities.reduce(function (max, community) {
        return Math.max(max, community.files ? community.files.length : 0);
      }, 0));
      sections.push({
        title: "Architecture Communities",
        kicker: "module clusters",
        stat: communities.length + " clusters",
        summary: "Action: use clusters to understand the graph before changing architecture.",
        rows: communities.slice(0, 8).map(function (community) {
          var files = community.files || [];
          var entrypoints = community.entrypoints || [];
          var routes = community.routes || [];
          return {
            label: community.label || ("community " + community.id),
            value: files.length + " files",
            meta: entrypoints.length + " entrypoints, " + routes.length + " routes",
            score: files.length / maxFiles * 100,
            status: routes.length || entrypoints.length ? "ok" : "",
            path: files[0],
          };
        }),
      });
    }

    if (insights && Array.isArray(insights.entry_flows) && insights.entry_flows.length) {
      sections.push({
        title: "Execution Flows",
        kicker: "entrypoint traces",
        stat: insights.entry_flows.length + " flows",
        summary: "Action: inspect entry files first when debugging runtime behavior.",
        rows: insights.entry_flows.slice(0, 8).map(function (flow) {
          var path = flow.path || [];
          return {
            label: flow.entry,
            value: Math.max(0, path.length - 1) + " hops",
            meta: path.slice(0, 5).join(" -> "),
            score: Math.min(100, Math.max(12, path.length * 18)),
            status: "ok",
            path: flow.entry,
          };
        }),
      });
    }

    if (workspace) {
      var deps = Array.isArray(workspace.package_dependencies) ? workspace.package_dependencies : [];
      var routeContracts = Array.isArray(workspace.route_contracts) ? workspace.route_contracts : [];
      var topicContracts = Array.isArray(workspace.topic_contracts) ? workspace.topic_contracts : [];
      var coChanges = Array.isArray(workspace.co_changes) ? workspace.co_changes : [];
      var workspaceRows = deps.slice(0, 6).map(function (dep) {
        return {
          label: dep.from + " -> " + dep.to,
          value: dep.package_name || "package",
          meta: "workspace package dependency",
          score: 72,
          status: "ok",
        };
      }).concat(routeContracts.slice(0, 6).map(function (contract) {
        return {
          label: contract.provider_repo + " -> " + contract.consumer_repo,
          value: [contract.method, contract.path].filter(Boolean).join(" "),
          meta: [contract.provider_file, contract.consumer_file].filter(Boolean).join(" -> "),
          score: contract.confidence === "high" ? 92 : 76,
          status: "ok",
        };
      })).concat(topicContracts.slice(0, 6).map(function (contract) {
        return {
          label: contract.producer_repo + " -> " + contract.consumer_repo,
          value: contract.topic,
          meta: [contract.producer_file, contract.consumer_file].filter(Boolean).join(" -> "),
          score: contract.confidence === "high" ? 88 : 72,
          status: "ok",
        };
      })).concat(coChanges.slice(0, 8).map(function (link) {
        var score = Math.min(100, Number(link.strength || 0) * 22 + Number(link.frequency || 0) * 12);
        return {
          label: link.source_repo + " <-> " + link.target_repo,
          value: (link.frequency || 0) + "x co-change",
          meta: [link.source_file, link.target_file].filter(Boolean).join(" <-> "),
          score: Math.max(20, score),
          status: "warn",
        };
      }));
      if (workspaceRows.length) {
        sections.push({
          title: "Workspace Map",
          kicker: "deps / contracts / co-changes",
          stat: workspaceRows.length + " links",
          summary: "Action: check linked repos before changing shared packages or contracts.",
          rows: workspaceRows,
          limit: 14,
        });
      }
    }

    if (risk) {
      var targets = Array.isArray(risk.targets) ? risk.targets : Object.keys(risk.targets || {}).map(function (key) { return risk.targets[key]; });
      var hotspots = Array.isArray(risk.global_hotspots) ? risk.global_hotspots : [];
      var riskRows = targets.slice(0, 6).map(function (item) {
        return {
          label: item.target,
          value: item.risk_type || "risk",
          meta: item.risk_summary || "",
          score: Math.round(Number(item.hotspot_score || 0) * 100) || Math.min(100, Number(item.dependents_count || 0) * 12 + (item.test_gap ? 24 : 0)),
          status: item.test_gap || item.risk_type === "single-owner" ? "warn" : "",
          path: item.target,
        };
      }).concat(hotspots.slice(0, 4).map(function (hotspot) {
        return {
          label: hotspot.file_path,
          value: Math.round(Number(hotspot.hotspot_score || 0) * 100) + "% hot",
          meta: (hotspot.commit_count_90d || 0) + " commits in 90d, owner " + shortContributor(hotspot.primary_owner || "unknown"),
          score: Math.round(Number(hotspot.hotspot_score || 0) * 100),
          status: "danger",
          path: hotspot.file_path,
        };
      }));
      if (riskRows.length) {
        sections.push({
          title: "Blast Radius",
          kicker: "change impact",
          stat: riskRows.length + " signals",
          summary: "Action: review tests, owners, and dependents before editing these targets.",
          rows: riskRows,
          limit: 10,
        });
      }
    }

    return sections.filter(function (section) { return section.rows && section.rows.length; });
  }

  function focusGraphPath(path) {
    if (!path) return;
    var normalized = String(path).replace(/\\/g, "/").replace(/^\.\//, "");
    var found = state.entities.find(function (entity) {
      var entityPath = String(entity.path || "").replace(/\\/g, "/").replace(/^\.\//, "");
      return entityPath === normalized || entity.id === normalized || entity.id === "code:file:" + normalized;
    }) || state.entities.find(function (entity) {
      var text = [entity.id, entity.path, entity.name].filter(Boolean).join(" ");
      return text.indexOf(normalized) !== -1;
    });
    if (!found) {
      els.searchInput.value = normalized;
      showViewerPageInPlace("graph");
      scheduleRender();
      return;
    }
    selectEntity(found.id, true);
    els.searchInput.value = normalized;
    showViewerPageInPlace("graph");
    scheduleRender();
  }

  function shortContributor(value) {
    var text = String(value || "unknown");
    return text.replace(/\s*<[^>]+>\s*$/, "");
  }

  function buildIntelligenceCards(reports) {
    var cards = [];
    var memoryCodeEdges = state.edges.filter(isMemoryCodeEdge);
    if (state.edges.length) {
      var byRelation = new Map();
      memoryCodeEdges.forEach(function (edge) {
        byRelation.set(edge.relation, (byRelation.get(edge.relation) || 0) + 1);
      });
      cards.push({
        title: "Memory-Code Bridge",
        kicker: "shareable repo lore",
        summary: memoryCodeEdges.length
          ? "Approved memory is linked back to concrete code artifacts so future agents can recall why the code exists."
          : "No memory-code links are visible in the loaded graph.",
        rows: [
          ["Links", String(memoryCodeEdges.length)],
          ["Visible", String(memoryCodeEdges.filter(function (edge) { return state.visibleEdgeIds.has(edge.id); }).length)],
          ["Precise", String(memoryCodeEdges.filter(function (edge) { return edge.relation !== "affects_code_path"; }).length)]
        ].concat(Array.from(byRelation.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, 2).map(function (entry) {
          return [entry[0], String(entry[1])];
        }))
      });
    }
    var risk = reports.risk;
    if (risk) {
      var targets = Array.isArray(risk.targets) ? risk.targets : Object.keys(risk.targets || {}).map(function (key) { return risk.targets[key]; });
      var silos = Array.isArray(risk.ownership_silos) ? risk.ownership_silos : [];
      cards.push({
        title: "Change Risk",
        kicker: "blast radius",
        summary: risk.summary || "Local risk report from code graph and git history.",
        rows: targets.slice(0, 5).map(function (item) {
          return [item.target || "target", item.risk_summary || [item.risk_type, item.dependents_count != null ? item.dependents_count + " dependents" : ""].filter(Boolean).join(", ")];
        }).concat(targets.length ? [] : [["Hotspots", Array.isArray(risk.global_hotspots) ? risk.global_hotspots.length + " global" : "none"]])
          .concat(silos.length ? [["Silos", silos.length + " ownership concentration(s)"]] : [])
      });
    }
    var contributors = reports.contributors;
    if (contributors) {
      var profiles = Array.isArray(contributors.contributors) ? contributors.contributors : [];
      cards.push({
        title: "Contributors",
        kicker: "local git profiles",
        summary: contributors.summary || "Contributor profiles from git history, ownership, modules, and hotspots.",
        rows: profiles.slice(0, 5).map(function (profile) {
          return [
            profile.contributor || "contributor",
            profile.commits_total + " commits, " + profile.commits_90d + " in 90d, " + profile.primary_owned_files + " owned file(s)"
          ];
        }).concat(profiles.length ? [] : [["Profiles", "No contributor profiles loaded"]])
      });
    }
    var decisions = reports.decisions;
    if (decisions) {
      var topDecisions = Array.isArray(decisions.top_decisions) ? decisions.top_decisions : [];
      var gaps = Array.isArray(decisions.coverage_gaps) ? decisions.coverage_gaps : [];
      cards.push({
        title: "Decision Memory",
        kicker: "why / gotchas / runbooks",
        summary: decisions.summary || "Decision memory connected to code paths, plus important uncovered files.",
        rows: [
          ["Coverage", (decisions.coverage_percent != null ? decisions.coverage_percent + "%" : "n/a") + " of code paths"],
          ["Why-memory", String(decisions.decision_memory_count || 0)],
          ["Coverage gaps", String(gaps.length)]
        ].concat(topDecisions.slice(0, 2).map(function (item) {
          return [item.type || "memory", item.title || item.summary || "decision memory"];
        })).concat(gaps.slice(0, 1).map(function (gap) {
          return ["Uncovered", gap.path + " - " + gap.reason];
        }))
      });
    }
    var health = reports.moduleHealth;
    if (health) {
      var modules = Array.isArray(health.modules) ? health.modules : [];
      cards.push({
        title: "Module Health",
        kicker: "churn / tests / ownership",
        summary: health.summary || "Module scorecards from local graph and git signals.",
        rows: modules.slice(0, 5).map(function (item) {
          return [item.module + " " + item.grade, "score " + item.score + " - " + (Array.isArray(item.reasons) ? item.reasons.slice(0, 2).join("; ") : "")];
        }).concat(modules.length ? [] : [["Modules", "No module scorecards loaded"]])
      });
    }
    var insights = reports.graphInsights;
    if (insights) {
      var central = Array.isArray(insights.central_files) ? insights.central_files : [];
      var cycles = Array.isArray(insights.dependency_cycles) ? insights.dependency_cycles : [];
      var communities = Array.isArray(insights.communities) ? insights.communities : [];
      var coverage = Array.isArray(insights.language_coverage) ? insights.language_coverage : [];
      var edgeMix = insights.edge_mix || {};
      cards.push({
        title: "Graph Insights",
        kicker: "centrality / cycles / communities",
        summary: insights.summary || "Deterministic source graph intelligence.",
        rows: [
          ["Central", central[0] ? central[0].path + " (" + central[0].dependents + " dependents)" : "none"],
          ["Cycles", String(cycles.length)],
          ["Communities", String(communities.length)],
          ["Edges", [edgeMix.imports || 0, "imports", edgeMix.calls || 0, "calls"].join(" ")]
        ].concat(central.slice(1, 3).map(function (item) { return ["Central", item.path]; }))
          .concat(coverage.slice(0, 1).map(function (item) { return [item.language, item.coverage_percent + "% indexed across " + item.files + " files"]; }))
      });
    }
    var workspace = reports.workspace;
    if (workspace) {
      var repos = Array.isArray(workspace.repos) ? workspace.repos : [];
      var deps = Array.isArray(workspace.package_dependencies) ? workspace.package_dependencies : [];
      var contracts = Array.isArray(workspace.route_contracts) ? workspace.route_contracts : [];
      var topics = Array.isArray(workspace.topic_contracts) ? workspace.topic_contracts : [];
      var coChanges = Array.isArray(workspace.co_changes) ? workspace.co_changes : [];
      cards.push({
        title: "Workspace",
        kicker: "multi-repo memory",
        summary: workspace.summary || "Workspace scan across local git repos.",
        rows: [
          ["Repos", String(repos.length)],
          ["Indexed", String(repos.filter(function (repo) { return repo.indexed; }).length)],
          ["Package deps", String(deps.length)],
          ["Route links", String(contracts.length)],
          ["Topic links", String(topics.length)],
          ["Co-changes", String(coChanges.length)]
        ].concat(repos.slice(0, 2).map(function (repo) { return [repo.alias, repo.approved_packets + " packets, " + repo.code_files + " files"]; }))
      });
    }
    var quality = reports.quality;
    if (quality) {
      cards.push({
        title: "Memory Quality",
        kicker: "review gate",
        summary: quality.summary || "Packet quality, duplicates, staleness, and grounding.",
        rows: [
          ["Useful", quality.useful_memory_ratio_percent != null ? quality.useful_memory_ratio_percent + "%" : "n/a"],
          ["Evidence", quality.evidence_coverage_percent != null ? quality.evidence_coverage_percent + "%" : "n/a"],
          ["Path grounded", quality.path_grounding_coverage_percent != null ? quality.path_grounding_coverage_percent + "%" : "n/a"],
          ["Pending", quality.totals ? String(quality.totals.pending) : "n/a"]
        ]
      });
    }
    var benchmark = reports.benchmark;
    if (benchmark) {
      var checks = Array.isArray(benchmark.checks) ? benchmark.checks : [];
      cards.push({
        title: "Benchmark",
        kicker: "local proof",
        summary: benchmark.summary || "Local memory and graph benchmark signals.",
        rows: checks.slice(0, 5).map(function (item) {
          return [item.name || "check", (item.pass ? "pass" : "check") + " - " + item.actual + "/" + item.target];
        })
      });
    }
    return cards;
  }

  function normalizeIntelCards(cards) {
    return cards.map(function (card) {
      var normalized = Object.assign({}, card);
      var row = function (label) {
        var found = (card.rows || []).find(function (item) { return item[0] === label; });
        return found ? found[1] : null;
      };
      if (card.title === "Memory-Code Bridge") {
        normalized.metric = row("Links") || "0";
        normalized.metricLabel = "memory-code links";
        normalized.highlight = "Shows whether saved repo knowledge is tied to actual files, symbols, routes, and tests.";
        normalized.action = "If this is low, capture memory with concrete paths so agents can recall it during edits.";
      } else if (card.title === "Change Risk") {
        var siloText = row("Silos");
        var siloMatch = siloText && String(siloText).match(/\d+/);
        normalized.metric = siloMatch ? siloMatch[0] + " silos" : ((card.rows || []).length + " signals");
        normalized.metricLabel = "risk signals";
        normalized.highlight = "Flags files with blast radius, test gaps, or ownership concentration.";
        normalized.action = "Use these rows to pick tests and reviewers before touching risky files.";
      } else if (card.title === "Contributors") {
        normalized.metric = (card.rows || []).length + " profiles";
        normalized.metricLabel = "review routing";
        normalized.highlight = "Shows who recently touched or owns parts of the repo.";
        normalized.action = "Use this to find backup reviewers and avoid single-person knowledge bottlenecks.";
      } else if (card.title === "Decision Memory") {
        normalized.metric = row("Coverage") || "n/a";
        normalized.metricLabel = "why-memory coverage";
        normalized.highlight = "Shows whether important code paths have captured rationale and gotchas.";
        normalized.action = "Add memory for coverage gaps before future agents rediscover the same context.";
      } else if (card.title === "Module Health") {
        normalized.metric = (card.rows || []).length + " modules";
        normalized.metricLabel = "lowest scores first";
        normalized.highlight = "Ranks modules by churn, tests, ownership, and graph signals.";
        normalized.action = "Start with low-score modules when planning cleanup or refactors.";
      } else if (card.title === "Graph Insights") {
        normalized.metric = row("Cycles") || row("Communities") || "n/a";
        normalized.metricLabel = row("Cycles") != null ? "dependency cycles" : "architecture clusters";
        normalized.highlight = "Explains dense graph structure through central files, cycles, and communities.";
        normalized.action = "Inspect central files and cycles before making architectural changes.";
      } else if (card.title === "Workspace") {
        normalized.metric = row("Repos") || "n/a";
        normalized.metricLabel = "connected repos";
        normalized.highlight = "Shows package, route, topic, and co-change links across local repos.";
        normalized.action = "Check these links before changing shared contracts or packages.";
      } else if (card.title === "Memory Quality") {
        normalized.metric = row("Evidence") || row("Useful") || "n/a";
        normalized.metricLabel = "trust signal";
        normalized.highlight = "Shows whether memory is evidence-backed, grounded, and reviewable.";
        normalized.action = "Review pending or weak memory before relying on it for agent handoff.";
      } else if (card.title === "Benchmark") {
        normalized.metric = (card.rows || []).filter(function (item) { return String(item[1] || "").indexOf("pass") !== -1; }).length + " pass";
        normalized.metricLabel = "local proof checks";
        normalized.highlight = "Shows whether repo memory and graph behavior pass local quality checks.";
        normalized.action = "Use failed checks as release blockers or cleanup targets.";
      }
      return normalized;
    });
  }

  function trimIntelText(value, limit) {
    var text = String(value == null ? "" : value);
    var max = Number(limit || 90);
    if (text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, "") + "...";
  }

  function renderStatusStrip(visibleEntities, visibleEdges, official) {
    if (!els.statusStrip) return;
    var memoryCount = visibleEntities.filter(function (entity) { return entity.graph_kind === "memory"; }).length;
    var codeCount = visibleEntities.filter(function (entity) { return entity.graph_kind === "code"; }).length;
    var reviewFlags = visibleEdges.filter(function (edge) { return reviewStatus(edge) !== "ok"; }).length;
    var memoryCodeLinks = state.edges.filter(isMemoryCodeEdge).length;
    var pendingReview = official && official.memory_graph ? Number(firstNumber(official.memory_graph.pending_packets, 0)) : 0;
    var pills = official ? [
      ["Status", official.harness && official.harness.validation_ok ? "Clean" : "Check", official.harness && official.harness.validation_ok ? "memory" : "warn"],
      ["Review", pendingReview ? pendingReview + " pending" : "Clear", pendingReview ? "warn" : "memory"],
      ["Source map", official.structural_index ? official.structural_index.files + " files" : official.code_graph.files + " files", "code"],
      ["Symbols", String(official.code_graph.symbols), "code"],
      ["Coverage", official.code_graph.indexer_coverage_percent + "%", "code"],
      ["Memory links", String(memoryCodeLinks), memoryCodeLinks ? "memory" : "warn"]
    ] : [
      ["Memory", String(memoryCount), "memory"],
      ["Code", String(codeCount), "code"],
      ["Relations", String(visibleEdges.length), ""],
      ["Review flags", String(reviewFlags), reviewFlags ? "warn" : ""]
    ];
    els.statusStrip.textContent = "";
    pills.forEach(function (pill) {
      var span = document.createElement("span");
      span.className = classNames("status-pill", pill[2]);
      span.innerHTML = "<strong></strong><span></span>";
      span.querySelector("strong").textContent = pill[1];
      span.querySelector("span").textContent = pill[0];
      els.statusStrip.appendChild(span);
    });
  }

  function connectedEntityIds(entityId, edgeId) {
    var entities = new Set();
    var edges = new Set();

    state.edges.forEach(function (edge) {
      if (entityId && (edge.from === entityId || edge.to === entityId)) {
        edges.add(edge.id);
        entities.add(edge.from);
        entities.add(edge.to);
      }
      if (edgeId && edge.id === edgeId) {
        entities.add(edge.from);
        entities.add(edge.to);
        edges.add(edge.id);
      }
    });

    return { entities: entities, edges: edges };
  }

  function degreeOf(id) {
    return state.degreeById.get(id) || 0;
  }

  function entityImportance(entity) {
    if (!entity) return -1000;
    var score = degreeOf(entity.id) * 8;
    if (entity.graph_kind === "memory") score += 80;
    if (entity.graph_kind === "code" && entity.type === "file") score += 42;
    if (["route", "test"].indexOf(entity.type) !== -1) score += 46;
    if (entity.type === "symbol") score += 34;
    if (entity.type === "script") score += 24;
    if (["runbook", "bug_fix", "decision", "workflow", "gotcha", "convention"].indexOf(entity.type) !== -1) score += 40;
    if (isDependencyEntity(entity)) score -= 90;
    if (isGeneratedEntity(entity)) score -= 48;
    return score;
  }

  function isDependencyEntity(entity) {
    var text = normalize([entity.id, entity.name, entity.path, entity.summary].filter(Boolean).join(" "));
    return entity.type === "external" ||
      text.indexOf("node_modules/") !== -1 ||
      text.indexOf("/node_modules") !== -1 ||
      text.indexOf("package-lock.json") !== -1 ||
      text.indexOf("pnpm-lock.yaml") !== -1 ||
      text.indexOf("yarn.lock") !== -1 ||
      text.indexOf("bun.lockb") !== -1 ||
      text.indexOf("dist/") !== -1 ||
      text.indexOf("build/") !== -1;
  }

  function isGeneratedEntity(entity) {
    var text = normalize([entity.id, entity.name, entity.path, entity.summary].filter(Boolean).join(" "));
    return text.indexOf(".agent_memory/indexes/") !== -1 ||
      text.indexOf(".agent_memory/code_graph/") !== -1 ||
      text.indexOf(".agent_memory/graph/") !== -1 ||
      text.indexOf(".min.js") !== -1 ||
      text.indexOf("coverage/") !== -1;
  }

  function startCanvasPointer(event) {
    if (event.button !== 0) return;
    var world = canvasToWorld(event);
    var node = findCanvasNode(world.x, world.y);
    if (node) {
      state.sim.dragNode = node;
      state.sim.panning = null;
    } else {
      state.sim.panning = {
        x: event.clientX,
        y: event.clientY,
        panX: state.sim.panX,
        panY: state.sim.panY,
        moved: false
      };
    }
  }

  function moveCanvasPointer(event) {
    var world = canvasToWorld(event);
    if (state.sim.dragNode) {
      state.sim.dragNode.x = world.x;
      state.sim.dragNode.y = world.y;
      state.sim.dragNode.vx = 0;
      state.sim.dragNode.vy = 0;
      state.sim.tick = 0;
      state.sim.idleFrames = 0;
      startSimulation();
    } else if (state.sim.panning) {
      var dx = event.clientX - state.sim.panning.x;
      var dy = event.clientY - state.sim.panning.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.sim.panning.moved = true;
      state.sim.panX = state.sim.panning.panX + dx;
      state.sim.panY = state.sim.panning.panY + dy;
    }
    state.sim.hoverNode = findCanvasNode(world.x, world.y);
    updateCanvasTooltip(event);
    scheduleCanvasDraw();
  }

  function endCanvasPointer() {
    if (state.sim.dragNode) {
      selectEntity(state.sim.dragNode.id, true);
      state.sim.dragNode = null;
      render();
    } else if (state.sim.panning && !state.sim.panning.moved) {
      state.selected = null;
      closeWorkspace();
      render();
    }
    state.sim.panning = null;
  }

  function leaveCanvasPointer() {
    state.sim.hoverNode = null;
    state.sim.dragNode = null;
    state.sim.panning = null;
    if (els.tooltip) els.tooltip.classList.remove("visible");
    scheduleCanvasDraw();
  }

  function handleCanvasWheel(event) {
    event.preventDefault();
    var rect = els.canvas.getBoundingClientRect();
    var before = canvasToWorld(event);
    var factor = event.deltaY > 0 ? 0.88 : 1.14;
    state.sim.zoom = clamp(state.sim.zoom * factor, 0.14, 4.5);
    state.sim.panX = event.clientX - rect.left - before.x * state.sim.zoom;
    state.sim.panY = event.clientY - rect.top - before.y * state.sim.zoom;
    scheduleCanvasDraw();
  }

  function scheduleCanvasDraw() {
    if (state.sim.drawRaf) return;
    state.sim.drawRaf = window.requestAnimationFrame(function () {
      state.sim.drawRaf = null;
      drawCanvasGraph();
    });
  }

  function handleCanvasDoubleClick(event) {
    var world = canvasToWorld(event);
    var node = findCanvasNode(world.x, world.y);
    if (!node) return;
    selectEntity(node.id, true);
    render();
  }

  function canvasToWorld(event) {
    var rect = els.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - state.sim.panX) / state.sim.zoom,
      y: (event.clientY - rect.top - state.sim.panY) / state.sim.zoom
    };
  }

  function findCanvasNode(x, y) {
    for (var i = state.sim.nodes.length - 1; i >= 0; i--) {
      var node = state.sim.nodes[i];
      var dx = node.x - x;
      var dy = node.y - y;
      if (dx * dx + dy * dy <= Math.pow(node.r + 7, 2)) return node;
    }
    return null;
  }

  function updateCanvasTooltip(event) {
    if (!els.tooltip) return;
    var node = state.sim.hoverNode;
    if (!node || state.sim.dragNode || state.sim.panning) {
      els.tooltip.classList.remove("visible");
      return;
    }
    var entity = node.entity;
    var relationCount = state.sim.edges.filter(function (edge) { return edge.from === node.id || edge.to === node.id; }).length;
    var color = nodeThemeColor(entity);
    els.tooltip.innerHTML = [
      "<div class=\"tt-name\"></div>",
      "<div class=\"tt-type\"></div>",
      "<div class=\"tt-summary\"></div>",
      "<div class=\"tt-conns\"></div>"
    ].join("");
    els.tooltip.querySelector(".tt-name").textContent = displayName(entity);
    els.tooltip.querySelector(".tt-type").textContent = nodeKindLabel(entity);
    els.tooltip.querySelector(".tt-type").style.color = color;
    els.tooltip.querySelector(".tt-summary").textContent = shortName(entity.summary || entity.id, 150);
    els.tooltip.querySelector(".tt-conns").textContent = relationCount + " relation" + (relationCount === 1 ? "" : "s");
    var rect = els.canvas.getBoundingClientRect();
    els.tooltip.style.left = (event.clientX - rect.left + 14) + "px";
    els.tooltip.style.top = (event.clientY - rect.top + 14) + "px";
    els.tooltip.classList.add("visible");
  }

  function zoomCanvas(factor) {
    resizeCanvas();
    var rect = els.canvas.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var before = {
      x: (cx - state.sim.panX) / state.sim.zoom,
      y: (cy - state.sim.panY) / state.sim.zoom
    };
    state.sim.zoom = clamp(state.sim.zoom * factor, 0.14, 4.5);
    state.sim.panX = cx - before.x * state.sim.zoom;
    state.sim.panY = cy - before.y * state.sim.zoom;
    drawCanvasGraph();
  }

  function fitCanvas() {
    resizeCanvas();
    if (!state.sim.nodes.length) {
      state.sim.panX = 0;
      state.sim.panY = 0;
      state.sim.zoom = 1;
      return;
    }
    var xs = state.sim.nodes.map(function (node) { return node.x; });
    var ys = state.sim.nodes.map(function (node) { return node.y; });
    var minX = Math.min.apply(null, xs) - 90;
    var maxX = Math.max.apply(null, xs) + 90;
    var minY = Math.min.apply(null, ys) - 90;
    var maxY = Math.max.apply(null, ys) + 90;
    var width = els.canvas.width / Math.max(1, window.devicePixelRatio || 1);
    var height = els.canvas.height / Math.max(1, window.devicePixelRatio || 1);
    var graphWidth = Math.max(1, maxX - minX);
    var graphHeight = Math.max(1, maxY - minY);
    state.sim.zoom = clamp(Math.min(width / graphWidth, height / graphHeight), 0.22, 1.45);
    state.sim.panX = width / 2 - ((minX + maxX) / 2) * state.sim.zoom;
    state.sim.panY = height / 2 - ((minY + maxY) / 2) * state.sim.zoom;
  }

  function ensureThree() {
    if (state.three.THREE) return Promise.resolve(state.three.THREE);
    if (state.three.loading) return state.three.loading;
    state.three.failed = false;
    var threeSources = [
      "./vendor/three/build/three.module.min.js",
      "../vendor/three/build/three.module.min.js",
      "/vendor/three/build/three.module.min.js",
      "https://unpkg.com/three@0.184.0/build/three.module.min.js"
    ];
    state.three.loading = threeSources.reduce(function (chain, source) {
      return chain.catch(function () { return import(source); });
    }, Promise.reject())
      .then(function (mod) {
        state.three.THREE = mod;
        return mod;
      })
      .catch(function (error) {
        state.three.failed = true;
        throw error;
      });
    return state.three.loading;
  }

  function renderThreeGraph(graphChanged) {
    drawThreeStatus("Loading 3D graph...");
    ensureThree().then(function () {
      if (activeRenderMode() !== "3d") return;
      setupThreeScene();
      if (graphChanged || !state.three.nodeById.size) rebuildThreeScene();
      if (graphChanged || state.three.distance <= 0) fitThreeGraph();
      startThreeGraph();
      renderThreeFrame();
    }).catch(function () {
      drawThreeStatus("3D renderer unavailable. Falling back to 2D canvas.");
      if (els.renderMode) els.renderMode.value = "2d";
      updateGraphSurfaceMode("2d");
      renderCanvasGraph(true);
    });
  }

  function drawThreeStatus(message) {
    if (!els.threeGraph || state.three.renderer) return;
    els.threeGraph.innerHTML = "<div class=\"three-status\"></div>";
    var status = els.threeGraph.querySelector(".three-status");
    if (status) status.textContent = message;
  }

  function setupThreeScene() {
    if (state.three.renderer) {
      resizeThreeGraph();
      return;
    }
    var THREE = state.three.THREE;
    els.threeGraph.textContent = "";
    state.three.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    state.three.renderer.setClearColor(new THREE.Color(graphPalette.background), 1);
    state.three.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    els.threeGraph.appendChild(state.three.renderer.domElement);
    state.three.scene = new THREE.Scene();
    state.three.scene.fog = new THREE.FogExp2(new THREE.Color(graphPalette.background), 0.00016);
    state.three.camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
    state.three.root = new THREE.Group();
    state.three.nodeGroup = new THREE.Group();
    state.three.edgeGroup = new THREE.Group();
    state.three.root.add(state.three.edgeGroup);
    state.three.root.add(state.three.nodeGroup);
    state.three.scene.add(state.three.root);
    state.three.scene.add(new THREE.AmbientLight(0x8fffb1, 0.54));
    var key = new THREE.PointLight(0x6ad7ff, 1.2, 2200);
    key.position.set(280, 360, 520);
    state.three.scene.add(key);
    var fill = new THREE.PointLight(0xb88cff, 0.72, 1800);
    fill.position.set(-420, -220, 360);
    state.three.scene.add(fill);
    state.three.raycaster = new THREE.Raycaster();
    state.three.pointer = new THREE.Vector2();
    resizeThreeGraph();
  }

  function rebuildThreeScene() {
    var THREE = state.three.THREE;
    clearThreeGroup(state.three.nodeGroup);
    clearThreeGroup(state.three.edgeGroup);
    state.three.nodeById = new Map();
    state.three.edgeRefs = [];
    state.three.physicsTick = 0;
    state.three.physicsIdle = 0;

    state.sim.nodes.forEach(function (node, index) {
      var entity = node.entity;
      var selected = state.selected && state.selected.kind === "entity" && state.selected.id === node.id;
      var pathNode = state.pathHighlight && state.pathHighlight.nodes.has(node.id);
      var material = new THREE.SpriteMaterial({
        map: threeNodeTexture(entity, selected || pathNode),
        transparent: true,
        opacity: isDependencyEntity(entity) ? 0.70 : 1,
        depthWrite: false
      });
      var mesh = new THREE.Sprite(material);
      var position = threePosition(node, index);
      mesh.position.set(position.x, position.y, position.z);
      var size = threeNodeSize(node, selected || pathNode);
      mesh.scale.set(size, size, 1);
      mesh.userData.node = node;
      state.three.nodeGroup.add(mesh);
      state.three.nodeById.set(node.id, { node: node, mesh: mesh, vx: 0, vy: 0, vz: 0 });
    });

    state.sim.edges.forEach(function (edge) {
      var from = state.three.nodeById.get(edge.from);
      var to = state.three.nodeById.get(edge.to);
      if (!from || !to) return;
      var fromEntity = from.node.entity;
      var toEntity = to.node.entity;
      var connected = state.selected && state.selected.kind === "entity" && (state.selected.id === edge.from || state.selected.id === edge.to);
      var pathEdge = state.pathHighlight && state.pathHighlight.edges.has(edge.id);
      var geometry = new THREE.BufferGeometry().setFromPoints([from.mesh.position, to.mesh.position]);
      var material = new THREE.LineBasicMaterial({
        color: new THREE.Color(pathEdge ? graphPalette.bridge : edgeThemeColor(edge, fromEntity, toEntity)),
        transparent: true,
        opacity: pathEdge ? 0.82 : threeEdgeOpacity(edge, fromEntity, toEntity, connected),
        depthWrite: false,
        depthTest: false
      });
      var line = new THREE.Line(geometry, material);
      line.userData.edge = edge;
      line.userData.from = edge.from;
      line.userData.to = edge.to;
      state.three.edgeGroup.add(line);
      state.three.edgeRefs.push(line);
    });

    if (state.three.root) {
      state.three.root.rotation.x = state.three.rotationX;
      state.three.root.rotation.y = state.three.rotationY;
    }
  }

  function clearThreeGroup(group) {
    if (!group) return;
    while (group.children.length) {
      var child = group.children.pop();
      if (!child) continue;
      if (child.geometry && child.geometry.dispose) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(function (material) { if (material.dispose) material.dispose(); });
        else if (child.material.dispose) child.material.dispose();
      }
    }
  }

  function threeNodeTexture(entity, selected) {
    var THREE = state.three.THREE;
    var color = nodeThemeColor(entity);
    var key = [color, entity.graph_kind || "", entity.type || "", selected ? "selected" : "normal", isDependencyEntity(entity) ? "dependency" : "primary"].join("|");
    if (state.three.nodeTextureCache.has(key)) return state.three.nodeTextureCache.get(key);
    var canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext("2d");
    var rgb = hexToRgb(color);
    var fill = nodeFillColor(entity);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var halo = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
    halo.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (selected ? 0.62 : 0.38) + ")");
    halo.addColorStop(0.52, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (selected ? 0.24 : 0.13) + ")");
    halo.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(64, 64, selected ? 36 : 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 8 : 5;
    ctx.beginPath();
    ctx.arc(64, 64, selected ? 38 : 33, 0, Math.PI * 2);
    ctx.stroke();
    if (entity.graph_kind === "memory") {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(64, 64, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    state.three.nodeTextureCache.set(key, texture);
    return texture;
  }

  function threeNodeSize(node, selected) {
    var entity = node.entity;
    var size = clamp(19 + degreeOf(node.id) * 1.65, 22, entity.graph_kind === "memory" ? 46 : 40);
    if (entity.type === "file" || entity.type === "repo") size += 5;
    if (selected) size *= 1.22;
    return size;
  }

  function threeEdgeOpacity(edge, fromEntity, toEntity, connected) {
    if (connected) return 0.48;
    if (edge.memory_code_link || isMemoryCodeRelation(edge.relation)) return 0.34;
    if (fromEntity.graph_kind === "code" && toEntity.graph_kind === "code") return 0.20;
    if (fromEntity.graph_kind === "memory" && toEntity.graph_kind === "memory") return 0.12;
    return 0.15;
  }

  function threePosition(node, index) {
    var entity = node.entity;
    var total = Math.max(1, state.sim.nodes.length);
    var rank = index + 0.5;
    var golden = Math.PI * (3 - Math.sqrt(5));
    var theta = golden * rank + (hashString(node.id || index) % 360) * 0.004;
    var yUnit = 1 - (2 * rank) / total;
    var ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    var radius = threeOrbRadius(total);
    var inner = threeOrbScale(entity);
    var kindOffset = threeKindDepthBias(entity);
    return {
      x: Math.cos(theta) * ring * radius * inner,
      y: yUnit * radius * inner,
      z: (Math.sin(theta) * ring + kindOffset) * radius * inner
    };
  }

  function threeOrbRadius(total) {
    return clamp(245 + Math.max(1, total) * 2.1, 280, 455);
  }

  function threeOrbScale(entity) {
    if (entity.graph_kind === "memory") return 0.88;
    if (entity.type === "file" || entity.type === "repo") return 0.76;
    if (isDependencyEntity(entity)) return 1.08;
    return 1;
  }

  function threeKindDepthBias(entity) {
    if (entity.graph_kind === "memory") return -0.22;
    if (entity.graph_kind === "code") return 0.18;
    return 0;
  }

  function resizeThreeGraph() {
    if (!state.three.renderer || !els.threeGraph) return;
    var rect = els.threeGraph.getBoundingClientRect();
    var width = Math.max(320, rect.width);
    var height = Math.max(360, rect.height);
    state.three.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    state.three.renderer.setSize(width, height, false);
    state.three.camera.aspect = width / height;
    state.three.camera.updateProjectionMatrix();
  }

  function fitThreeGraph() {
    var entries = Array.from(state.three.nodeById.values());
    if (!entries.length) {
      state.three.distance = 850;
      return;
    }
    var maxRadius = entries.reduce(function (max, entry) {
      var p = entry.mesh.position;
      return Math.max(max, Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z));
    }, 260);
    state.three.distance = clamp(maxRadius * 2.35, 760, 2600);
  }

  function zoomThreeGraph(factor) {
    state.three.distance = clamp(state.three.distance / factor, 320, 3200);
  }

  function startThreeGraph() {
    if (state.three.raf) return;
    function frame() {
      if (activeRenderMode() !== "3d" || !state.three.renderer) {
        state.three.raf = null;
        return;
      }
      if (!state.three.drag && state.three.root) {
        state.three.rotationY += 0.0017;
        state.three.root.rotation.y = state.three.rotationY;
      }
      stepThreePhysics();
      renderThreeFrame();
      state.three.raf = window.requestAnimationFrame(frame);
    }
    state.three.raf = window.requestAnimationFrame(frame);
  }

  function stopThreeGraph() {
    if (state.three.raf) window.cancelAnimationFrame(state.three.raf);
    state.three.raf = null;
    if (els.tooltip) els.tooltip.classList.remove("visible");
  }

  function renderThreeFrame() {
    if (!state.three.renderer || !state.three.scene || !state.three.camera) return;
    resizeThreeGraph();
    state.three.camera.position.set(state.three.target.x, state.three.target.y, state.three.distance);
    state.three.camera.lookAt(state.three.target.x, state.three.target.y, state.three.target.z);
    updateThreeEdges();
    state.three.renderer.render(state.three.scene, state.three.camera);
  }

  function stepThreePhysics() {
    if (!state.three.nodeById || state.three.physicsTick > 180) return;
    if (state.three.drag && state.three.drag.type === "node") return;
    var entries = Array.from(state.three.nodeById.values());
    var count = entries.length;
    if (!count) return;
    var forces = new Map(entries.map(function (entry) {
      return [entry.node.id, { x: 0, y: 0, z: 0 }];
    }));
    var repulsion = count > 110 ? 1800 : count > 70 ? 2600 : 3400;
    for (var i = 0; i < entries.length; i++) {
      for (var j = i + 1; j < entries.length; j++) {
        var a = entries[i];
        var b = entries[j];
        var dx = a.mesh.position.x - b.mesh.position.x;
        var dy = a.mesh.position.y - b.mesh.position.y;
        var dz = a.mesh.position.z - b.mesh.position.z;
        var distSq = Math.max(1200, dx * dx + dy * dy + dz * dz);
        var dist = Math.sqrt(distSq);
        var force = repulsion / distSq;
        var ax = (dx / dist) * force;
        var ay = (dy / dist) * force;
        var az = (dz / dist) * force;
        var fa = forces.get(a.node.id);
        var fb = forces.get(b.node.id);
        fa.x += ax;
        fa.y += ay;
        fa.z += az;
        fb.x -= ax;
        fb.y -= ay;
        fb.z -= az;
      }
    }

    state.sim.edges.forEach(function (edge) {
      var from = state.three.nodeById.get(edge.from);
      var to = state.three.nodeById.get(edge.to);
      if (!from || !to) return;
      var dx = to.mesh.position.x - from.mesh.position.x;
      var dy = to.mesh.position.y - from.mesh.position.y;
      var dz = to.mesh.position.z - from.mesh.position.z;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      var memoryCode = edge.memory_code_link || isMemoryCodeRelation(edge.relation);
      var target = memoryCode ? 190 : (from.node.entity.graph_kind === "code" && to.node.entity.graph_kind === "code" ? 240 : 220);
      var strength = memoryCode ? 0.0032 : 0.0018;
      var force = (dist - target) * strength;
      var fx = (dx / dist) * force;
      var fy = (dy / dist) * force;
      var fz = (dz / dist) * force;
      var ff = forces.get(from.node.id);
      var ft = forces.get(to.node.id);
      ff.x += fx;
      ff.y += fy;
      ff.z += fz;
      ft.x -= fx;
      ft.y -= fy;
      ft.z -= fz;
    });

    var baseRadius = threeOrbRadius(count);
    var maxVelocity = 0;
    entries.forEach(function (entry) {
      var p = entry.mesh.position;
      var entity = entry.node.entity;
      var len = Math.max(1, Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z));
      var desiredRadius = baseRadius * threeOrbScale(entity);
      var radial = (desiredRadius - len) * 0.055;
      var f = forces.get(entry.node.id);
      f.x += (p.x / len) * radial;
      f.y += (p.y / len) * radial;
      f.z += (p.z / len) * radial;
      var depthTarget = desiredRadius * threeKindDepthBias(entity);
      f.z += (depthTarget - p.z) * 0.002;
      entry.vx = clamp((entry.vx + f.x) * 0.80, -4.2, 4.2);
      entry.vy = clamp((entry.vy + f.y) * 0.80, -4.2, 4.2);
      entry.vz = clamp((entry.vz + f.z) * 0.80, -4.2, 4.2);
      p.x += entry.vx;
      p.y += entry.vy;
      p.z += entry.vz;
      var nextLen = Math.max(1, Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z));
      var correction = (desiredRadius - nextLen) * 0.08;
      p.x += (p.x / nextLen) * correction;
      p.y += (p.y / nextLen) * correction;
      p.z += (p.z / nextLen) * correction;
      maxVelocity = Math.max(maxVelocity, Math.abs(entry.vx), Math.abs(entry.vy), Math.abs(entry.vz));
    });
    state.three.physicsTick += 1;
    state.three.physicsIdle = maxVelocity < 0.030 ? state.three.physicsIdle + 1 : 0;
    if (state.three.physicsIdle > 32) state.three.physicsTick = 181;
  }

  function startThreePointer(event) {
    if (activeRenderMode() !== "3d" || event.button !== 0) return;
    event.preventDefault();
    var picked = pickThreeNode(event);
    if (picked) {
      var entry = state.three.nodeById.get(picked.id);
      state.three.drag = {
        type: "node",
        x: event.clientX,
        y: event.clientY,
        moved: false,
        picked: picked,
        entry: entry,
        plane: createThreeDragPlane(entry && entry.mesh)
      };
      return;
    }
    state.three.drag = {
      type: "space",
      x: event.clientX,
      y: event.clientY,
      rotationX: state.three.rotationX,
      rotationY: state.three.rotationY,
      moved: false,
      picked: null
    };
  }

  function moveThreePointer(event) {
    if (activeRenderMode() !== "3d") return;
    state.three.lastPointerEvent = event;
    if (state.three.drag) {
      var dx = event.clientX - state.three.drag.x;
      var dy = event.clientY - state.three.drag.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.three.drag.moved = true;
      if (state.three.drag.type === "node") {
        moveThreeDraggedNode(event);
        renderThreeFrame();
        return;
      }
      state.three.rotationY = state.three.drag.rotationY + dx * 0.0065;
      state.three.rotationX = clamp(state.three.drag.rotationX + dy * 0.0048, -1.15, 0.45);
      if (state.three.root) {
        state.three.root.rotation.x = state.three.rotationX;
        state.three.root.rotation.y = state.three.rotationY;
      }
      renderThreeFrame();
      return;
    }
    state.three.hoverNode = pickThreeNode(event);
    updateThreeTooltip(event);
  }

  function endThreePointer(event) {
    if (!state.three.drag) return;
    var picked = !state.three.drag.moved || state.three.drag.type === "node"
      ? (pickThreeNode(event) || state.three.drag.picked)
      : null;
    state.three.drag = null;
    if (picked) {
      selectEntity(picked.id, true);
      render();
    }
  }

  function leaveThreePointer() {
    state.three.hoverNode = null;
    state.three.drag = null;
    if (els.tooltip) els.tooltip.classList.remove("visible");
  }

  function handleThreeWheel(event) {
    if (activeRenderMode() !== "3d") return;
    event.preventDefault();
    zoomThreeGraph(event.deltaY > 0 ? 0.88 : 1.14);
    renderThreeFrame();
  }

  function handleThreeDoubleClick(event) {
    var picked = pickThreeNode(event);
    if (!picked) return;
    selectEntity(picked.id, true);
    render();
  }

  function pickThreeNode(event) {
    if (!state.three.raycaster || !state.three.camera || !state.three.pointer) return null;
    setThreePointerFromEvent(event);
    state.three.raycaster.setFromCamera(state.three.pointer, state.three.camera);
    var meshes = Array.from(state.three.nodeById.values()).map(function (entry) { return entry.mesh; });
    var hits = state.three.raycaster.intersectObjects(meshes, false);
    return hits.length && hits[0].object.userData ? hits[0].object.userData.node : null;
  }

  function createThreeDragPlane(mesh) {
    if (!mesh || !state.three.camera || !state.three.THREE) return null;
    var THREE = state.three.THREE;
    state.three.root.updateMatrixWorld(true);
    state.three.camera.updateMatrixWorld(true);
    var normal = new THREE.Vector3();
    state.three.camera.getWorldDirection(normal);
    var point = new THREE.Vector3();
    mesh.getWorldPosition(point);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
  }

  function moveThreeDraggedNode(event) {
    var drag = state.three.drag;
    if (!drag || !drag.entry || !drag.entry.mesh || !drag.plane || !state.three.raycaster) return;
    var THREE = state.three.THREE;
    setThreePointerFromEvent(event);
    state.three.raycaster.setFromCamera(state.three.pointer, state.three.camera);
    var hit = new THREE.Vector3();
    if (!state.three.raycaster.ray.intersectPlane(drag.plane, hit)) return;
    var local = hit.clone();
    state.three.root.worldToLocal(local);
    drag.entry.mesh.position.copy(local);
    drag.entry.vx = 0;
    drag.entry.vy = 0;
    drag.entry.vz = 0;
    state.three.physicsTick = 0;
    state.three.physicsIdle = 0;
    updateThreeEdges();
  }

  function updateThreeEdges() {
    if (!state.three.edgeRefs || !state.three.edgeRefs.length) return;
    state.three.edgeRefs.forEach(function (line) {
      var from = state.three.nodeById.get(line.userData.from);
      var to = state.three.nodeById.get(line.userData.to);
      if (!from || !to || !line.geometry) return;
      var attr = line.geometry.getAttribute("position");
      if (!attr) return;
      attr.setXYZ(0, from.mesh.position.x, from.mesh.position.y, from.mesh.position.z);
      attr.setXYZ(1, to.mesh.position.x, to.mesh.position.y, to.mesh.position.z);
      attr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    });
  }

  function setThreePointerFromEvent(event) {
    var rect = els.threeGraph.getBoundingClientRect();
    state.three.pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    state.three.pointer.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
  }

  function updateThreeTooltip(event) {
    if (!els.tooltip) return;
    var node = state.three.hoverNode;
    if (!node || state.three.drag) {
      els.tooltip.classList.remove("visible");
      return;
    }
    var entity = node.entity;
    var relationCount = state.sim.edges.filter(function (edge) { return edge.from === node.id || edge.to === node.id; }).length;
    var color = nodeThemeColor(entity);
    els.tooltip.innerHTML = [
      "<div class=\"tt-name\"></div>",
      "<div class=\"tt-type\"></div>",
      "<div class=\"tt-summary\"></div>",
      "<div class=\"tt-conns\"></div>"
    ].join("");
    els.tooltip.querySelector(".tt-name").textContent = displayName(entity);
    els.tooltip.querySelector(".tt-type").textContent = nodeKindLabel(entity);
    els.tooltip.querySelector(".tt-type").style.color = color;
    els.tooltip.querySelector(".tt-summary").textContent = shortName(entity.summary || entity.id, 150);
    els.tooltip.querySelector(".tt-conns").textContent = relationCount + " relation" + (relationCount === 1 ? "" : "s");
    var rect = els.threeGraph.getBoundingClientRect();
    els.tooltip.style.left = (event.clientX - rect.left + 14) + "px";
    els.tooltip.style.top = (event.clientY - rect.top + 14) + "px";
    els.tooltip.classList.add("visible");
  }

  function hashString(value) {
    var text = String(value || "");
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function focusedCanvasNodeId() {
    if (state.sim.hoverNode) return state.sim.hoverNode.id;
    if (state.selected && state.selected.kind === "entity") return state.selected.id;
    if (state.selected && state.selected.kind === "edge") {
      var selectedEdge = state.edges.find(function (edge) { return edge.id === state.selected.id; });
      return selectedEdge ? selectedEdge.from : null;
    }
    return null;
  }

  function fitView() {
    var visible = state.entities.filter(function (entity) {
      return state.visibleEntityIds.size === 0 || state.visibleEntityIds.has(entity.id);
    });
    var points = visible.map(function (entity) { return state.positions.get(entity.id); }).filter(Boolean);
    if (!points.length) {
      state.viewBox = { x: 0, y: 0, width: 1000, height: 660 };
      return;
    }
    var xs = points.map(function (point) { return point.x; });
    var ys = points.map(function (point) { return point.y; });
    var minX = Math.min.apply(null, xs) - 130;
    var maxX = Math.max.apply(null, xs) + 150;
    var minY = Math.min.apply(null, ys) - 82;
    var maxY = Math.max.apply(null, ys) + 82;
    state.viewBox = {
      x: minX,
      y: minY,
      width: Math.max(620, maxX - minX),
      height: Math.max(400, maxY - minY)
    };
  }

  function zoomView(factor) {
    var box = state.viewBox;
    var nextWidth = clamp(box.width * factor, 260, 1400);
    var nextHeight = clamp(box.height * factor, 210, 950);
    state.viewBox = {
      x: box.x + (box.width - nextWidth) / 2,
      y: box.y + (box.height - nextHeight) / 2,
      width: nextWidth,
      height: nextHeight
    };
    renderSvg();
  }

  function startPan(event) {
    if (event.button !== 0) return;
    state.pan = {
      x: event.clientX,
      y: event.clientY,
      viewBox: Object.assign({}, state.viewBox),
      moved: false
    };
    els.svg.classList.add("dragging");
  }

  function continuePan(event) {
    if (!state.pan) return;
    var rect = els.svg.getBoundingClientRect();
    var dx = (event.clientX - state.pan.x) / Math.max(rect.width, 1) * state.pan.viewBox.width;
    var dy = (event.clientY - state.pan.y) / Math.max(rect.height, 1) * state.pan.viewBox.height;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) state.pan.moved = true;
    state.viewBox = {
      x: state.pan.viewBox.x - dx,
      y: state.pan.viewBox.y - dy,
      width: state.pan.viewBox.width,
      height: state.pan.viewBox.height
    };
    renderSvg();
  }

  function endPan() {
    if (!state.pan) return;
    window.setTimeout(function () {
      state.pan = null;
    }, 0);
    els.svg.classList.remove("dragging");
  }

  function handleSvgClick(event) {
    if (state.pan && state.pan.moved) return;
    if (event.target !== els.svg) return;
    state.selected = null;
    closeWorkspace();
    render();
  }

  function handleWheelZoom(event) {
    event.preventDefault();
    var rect = els.svg.getBoundingClientRect();
    var pointX = state.viewBox.x + (event.clientX - rect.left) / Math.max(rect.width, 1) * state.viewBox.width;
    var pointY = state.viewBox.y + (event.clientY - rect.top) / Math.max(rect.height, 1) * state.viewBox.height;
    var factor = event.deltaY > 0 ? 1.12 : 0.88;
    var nextWidth = clamp(state.viewBox.width * factor, 260, 1400);
    var nextHeight = clamp(state.viewBox.height * factor, 210, 950);
    var rx = (pointX - state.viewBox.x) / state.viewBox.width;
    var ry = (pointY - state.viewBox.y) / state.viewBox.height;
    state.viewBox = {
      x: pointX - nextWidth * rx,
      y: pointY - nextHeight * ry,
      width: nextWidth,
      height: nextHeight
    };
    renderSvg();
  }

  function displayName(entity) {
    if (!entity) return "Unknown";
    return entity.name || entity.title || entity.path || entity.id || "Unknown";
  }

  function edgePath(from, to) {
    var dx = Math.max(60, Math.abs(to.x - from.x) * 0.48);
    var x1 = from.x + (to.x >= from.x ? 72 : -72);
    var x2 = to.x + (to.x >= from.x ? -72 : 72);
    return "M " + x1 + " " + from.y + " C " + (x1 + (to.x >= from.x ? dx : -dx)) + " " + from.y + ", " + (x2 - (to.x >= from.x ? dx : -dx)) + " " + to.y + ", " + x2 + " " + to.y;
  }

  function nodeDimensions(entity) {
    var name = displayName(entity);
    var width = clamp(116 + Math.min(name.length, 26) * 4.5, 142, entity.graph_kind === "memory" ? 210 : 190);
    return {
      width: width,
      height: 42,
      labelMax: width > 180 ? 28 : 22
    };
  }

  function nodeKindLabel(entity) {
    return (entity.graph_kind || "graph") + " / " + (entity.type || "node");
  }

  function searchableText(value) {
    return normalize(JSON.stringify(value || {}));
  }

  function parseSearchQuery(value) {
    var raw = normalize(value);
    var tokens = raw
      .replace(/[^a-z0-9_./:-]+/g, " ")
      .split(/\s+/)
      .map(searchStem)
      .filter(Boolean)
      .filter(function (token) { return !SEARCH_STOP_WORDS.has(token); });
    if ((tokens.indexOf("run") !== -1 || tokens.indexOf("runn") !== -1) && tokens.indexOf("test") !== -1) tokens.push("runtest");
    var groups = tokens.map(function (token) {
      return unique([token].concat(SEARCH_SYNONYMS[token] || []).map(searchStem).filter(Boolean));
    });
    return {
      active: raw.trim().length > 0,
      raw: raw,
      tokens: unique(groups.reduce(function (all, group) { return all.concat(group); }, [])),
      groups: groups
    };
  }

  var SEARCH_STOP_WORDS = new Set([
    "a", "an", "and", "are", "about", "can", "do", "does", "for", "from", "how", "i", "in", "is", "it", "me", "of", "on", "or", "please", "show", "that", "the", "there", "this", "to", "what", "when", "where", "which", "who", "why", "with"
  ]);

  var SEARCH_SYNONYMS = {
    memory: ["packet", "runbook", "decision", "workflow", "gotcha", "reference"],
    test: ["tests", "testing", "vitest", "jest", "pytest", "spec"],
    run: ["running", "command", "script", "npm", "pnpm", "yarn"],
    runn: ["run", "running", "command", "script", "npm", "pnpm", "yarn"],
    runtest: ["run", "test", "runbook", "command"],
    start: ["serve", "dev", "launch"],
    build: ["compile", "tsc"],
    bug: ["fix", "gotcha", "error"],
    route: ["endpoint", "api"],
    file: ["path"],
    dependency: ["package", "external", "deps"]
  };

  function matchesSearchQuery(value, query) {
    if (!query || !query.active) return true;
    var text = searchableText(value);
    if (query.raw && text.indexOf(query.raw) !== -1) return true;
    if (!query.tokens.length) return true;
    var textTokens = new Set(text
      .replace(/[^a-z0-9_./:-]+/g, " ")
      .split(/\s+/)
      .map(searchStem)
      .filter(Boolean));
    var requiredGroups = (query.groups || []).filter(function (group) {
      return group.some(function (token) { return SEARCH_SOFT_TOKENS.has(token) ? text.indexOf(token) !== -1 || textTokens.has(token) : true; });
    });
    if (!requiredGroups.length) requiredGroups = query.groups || [query.tokens];
    return requiredGroups.every(function (group) {
      return group.some(function (token) {
        if (text.indexOf(token) !== -1) return true;
        return textTokens.has(token);
      });
    });
  }

  var SEARCH_SOFT_TOKENS = new Set(["memory", "packet", "about"]);

  function searchStem(value) {
    var token = String(value || "").toLowerCase();
    if (token.length > 5 && token.endsWith("ing")) token = token.slice(0, -3);
    if (token.length > 4 && token.endsWith("ies")) token = token.slice(0, -3) + "y";
    if (token.length > 4 && token.endsWith("es")) token = token.slice(0, -2);
    if (token.length > 3 && token.endsWith("s")) token = token.slice(0, -1);
    return token;
  }

  function shortName(value, max) {
    var text = String(value || "");
    return text.length > max ? text.slice(0, Math.max(1, max - 1)) + "..." : text;
  }

  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgb(value) {
    var hex = String(value || "#9be7c0").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (part) { return part + part; }).join("");
    var parsed = parseInt(hex, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255
    };
  }

  function brighten(value, amount) {
    var rgb = hexToRgb(value);
    return "rgb(" + Math.min(255, rgb.r + amount) + "," + Math.min(255, rgb.g + amount) + "," + Math.min(255, rgb.b + amount) + ")";
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function classNames() {
    return Array.prototype.slice.call(arguments).filter(Boolean).join(" ");
  }

  function visibleSignature(entityIds, edgeIds) {
    return Array.from(entityIds).sort().join("|") + "::" + Array.from(edgeIds).sort().join("|");
  }

  function safeCssName(value) {
    return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  function testSignalVisibilityForGraph(graph, maxNodes) {
    var normalized = normalizeGraph(graph);
    return testVisibilityForNormalized(normalized, "code", maxNodes || 90);
  }

  function testCombinedVisibilityForGraphs(graphs, maxNodes) {
    var normalized = mergeNormalizedGraphs(graphs.map(function (graph) { return normalizeGraph(graph); }));
    return testVisibilityForNormalized(normalized, "combined", maxNodes || 90);
  }

  function testRelationVisibilityForGraphs(graphs, relation, maxNodes) {
    var normalized = mergeNormalizedGraphs(graphs.map(function (graph) { return normalizeGraph(graph); }));
    state.entities = normalized.entities;
    state.edges = normalized.edges;
    state.entityById = new Map(state.entities.map(function (entity) { return [entity.id, entity]; }));
    state.edgeById = new Map(state.edges.map(function (edge) { return [edge.id, edge]; }));
    state.degreeById = buildDegreeMap(state.edges);
    var edgeIds = new Set(state.edges.filter(function (edge) {
      return relation === "__memory_code__" ? isMemoryCodeEdge(edge) : edge.relation === relation;
    }).map(function (edge) { return edge.id; }));
    var entityIds = new Set();
    edgeIds.forEach(function (id) {
      var edge = state.edgeById.get(id);
      if (!edge) return;
      entityIds.add(edge.from);
      entityIds.add(edge.to);
    });
    var ranked = Array.from(entityIds).sort(function (a, b) {
      return entityImportance(state.entityById.get(b)) - entityImportance(state.entityById.get(a)) ||
        displayName(state.entityById.get(a)).localeCompare(displayName(state.entityById.get(b)));
    });
    var entities = connectedSignalEntities(ranked, edgeIds, maxNodes || 90);
    var edges = capVisibleEdges(edgesWithVisibleEndpoints(edgeIds, entities), entities, {
      maxNodes: maxNodes || 90,
      mode: "combined",
      relation: relation,
      query: { active: false }
    });
    return visibilityStats(entities, edges);
  }

  function testVisibilityForNormalized(normalized, mode, maxNodes) {
    state.entities = normalized.entities;
    state.edges = normalized.edges;
    state.entityById = new Map(state.entities.map(function (entity) { return [entity.id, entity]; }));
    state.edgeById = new Map(state.edges.map(function (edge) { return [edge.id, edge]; }));
    state.degreeById = buildDegreeMap(state.edges);
    var ranked = state.entities
      .filter(function (entity) { return mode === "combined" || entity.graph_kind === mode; })
      .map(function (entity) { return entity.id; })
      .sort(function (a, b) {
        return entityImportance(state.entityById.get(b)) - entityImportance(state.entityById.get(a)) ||
          displayName(state.entityById.get(a)).localeCompare(displayName(state.entityById.get(b)));
      });
    var edgeIds = new Set(state.edges.filter(function (edge) { return mode === "combined" || edge.graph_kind === mode; }).map(function (edge) { return edge.id; }));
    var entities = mode === "combined"
      ? balancedSignalEntities(ranked, edgeIds, maxNodes)
      : connectedSignalEntities(ranked, edgeIds, maxNodes);
    var edges = capVisibleEdges(edgesWithVisibleEndpoints(edgeIds, entities), entities, {
      maxNodes: maxNodes,
      mode: mode,
      relation: "",
      query: { active: false }
    });
    return visibilityStats(entities, edges);
  }

  function visibilityStats(entities, edges) {
    return {
      entities: entities.size,
      edges: edges.size,
      memoryCodeEdges: Array.from(edges).filter(function (id) {
        return isMemoryCodeEdge(state.edgeById.get(id));
      }).length,
      pathBridgeEdges: Array.from(edges).filter(function (id) {
        var edge = state.edgeById.get(id);
        return edge && edge.relation === "affects_code_path";
      }).length,
      codeEdges: Array.from(edges).filter(function (id) {
        var edge = state.edgeById.get(id);
        var from = edge && state.entityById.get(edge.from);
        var to = edge && state.entityById.get(edge.to);
        return from && to && from.graph_kind === "code" && to.graph_kind === "code";
      }).length,
      memory: Array.from(entities).filter(function (id) {
        var entity = state.entityById.get(id);
        return entity && entity.graph_kind === "memory";
      }).length,
      code: Array.from(entities).filter(function (id) {
        var entity = state.entityById.get(id);
        return entity && entity.graph_kind === "code";
      }).length
    };
  }

  function svgEl(name, attrs) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) {
      element.setAttribute(key, attrs[key]);
    });
    return element;
  }

  if (typeof globalThis !== "undefined") {
    globalThis.__KAGE_VIEWER_TEST__ = {
      normalizeGraph: normalizeGraph,
      normalizeCodeGraph: normalizeCodeGraph,
      hydrateCompactCodeGraph: hydrateCompactCodeGraph,
      connectedSignalEntities: connectedSignalEntities,
      testSignalVisibilityForGraph: testSignalVisibilityForGraph,
      testCombinedVisibilityForGraphs: testCombinedVisibilityForGraphs,
      testRelationVisibilityForGraphs: testRelationVisibilityForGraphs,
      mergeNormalizedGraphs: mergeNormalizedGraphs,
      isMemoryCodeRelation: isMemoryCodeRelation
    };
  }

  function showError(message) {
    els.graphSummary.textContent = message;
  }
})();
