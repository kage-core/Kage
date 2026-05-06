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
    metrics: null,
    inbox: null,
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
    viewMode: document.getElementById("viewMode"),
    typeFilter: document.getElementById("typeFilter"),
    relationFilter: document.getElementById("relationFilter"),
    scopeFilter: document.getElementById("scopeFilter"),
    maxNodes: document.getElementById("maxNodes"),
    showDependencies: document.getElementById("showDependencies"),
    resetView: document.getElementById("resetView"),
    zoomOut: document.getElementById("zoomOut"),
    zoomIn: document.getElementById("zoomIn"),
    fitView: document.getElementById("fitView"),
    canvas: document.getElementById("graphCanvas"),
    tooltip: document.getElementById("graphTooltip"),
    svg: document.getElementById("graphSvg"),
    nodeLayer: document.getElementById("nodeLayer"),
    edgeLayer: document.getElementById("edgeLayer"),
    emptyState: document.getElementById("emptyState"),
    selectionDetails: document.getElementById("selectionDetails"),
    entityList: document.getElementById("entityList"),
    edgeList: document.getElementById("edgeList"),
    metricsSummary: document.getElementById("metricsSummary"),
    entityCount: document.getElementById("entityCount"),
    edgeCount: document.getElementById("edgeCount"),
    reviewCount: document.getElementById("reviewCount"),
    reviewList: document.getElementById("reviewList"),
    proofStatus: document.getElementById("proofStatus"),
    proofList: document.getElementById("proofList")
  };

  var MEMORY_CODE_RELATIONS = new Set(["explains_symbol", "informs_symbol", "fixes_symbol", "applies_to_route", "verified_by_test", "affects_path"]);

  els.graphFile.addEventListener("change", handleFile);
  els.searchInput.addEventListener("input", scheduleRender);
  els.viewMode.addEventListener("change", render);
  els.typeFilter.addEventListener("change", render);
  els.relationFilter.addEventListener("change", render);
  els.scopeFilter.addEventListener("change", render);
  els.maxNodes.addEventListener("change", render);
  els.showDependencies.addEventListener("change", render);
  els.zoomOut.addEventListener("click", function () { zoomCanvas(0.82); });
  els.zoomIn.addEventListener("click", function () { zoomCanvas(1.22); });
  els.fitView.addEventListener("click", function () { fitCanvas(); drawCanvasGraph(); });
  els.canvas.addEventListener("mousedown", startCanvasPointer);
  els.canvas.addEventListener("mousemove", moveCanvasPointer);
  els.canvas.addEventListener("mouseup", endCanvasPointer);
  els.canvas.addEventListener("mouseleave", leaveCanvasPointer);
  els.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  els.canvas.addEventListener("dblclick", handleCanvasDoubleClick);
  els.svg.addEventListener("mousedown", startPan);
  els.svg.addEventListener("click", handleSvgClick);
  els.svg.addEventListener("wheel", handleWheelZoom, { passive: false });
  window.addEventListener("mousemove", continuePan);
  window.addEventListener("mouseup", endPan);
  window.addEventListener("resize", function () {
    resizeCanvas();
    fitCanvas();
    drawCanvasGraph();
  });
  els.resetView.addEventListener("click", function () {
    els.searchInput.value = "";
    els.viewMode.value = "combined";
    els.typeFilter.value = "";
    els.relationFilter.value = "";
    els.scopeFilter.value = "signal";
    els.maxNodes.value = "90";
    els.showDependencies.checked = false;
    state.selected = null;
    state.lastVisibleSignature = "";
    render();
  });
  loadFromUrlParams();

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
        els.graphSummary.textContent = "Metrics loaded.";
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
    state.lastVisibleSignature = "";

    populateFilters();
    els.emptyState.classList.add("hidden");
    els.graphSummary.textContent = fileName + " loaded: " + entities.length + " nodes, " + edges.length + " relations.";
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
    var graphPaths = []
      .concat(params.getAll("graph"))
      .concat(params.getAll("code"))
      .flatMap(function (value) { return String(value || "").split(","); })
      .map(function (value) { return value.trim(); })
      .filter(Boolean);
    var metricsPath = params.get("metrics");
    var inboxPath = params.get("inbox");
    var reviewPath = params.get("review");
    var pendingPath = params.get("pending");
    var inferredRoot = inferMemoryRoot(graphPaths[0] || "");
    if (!inboxPath && inferredRoot) inboxPath = inferredRoot + "/inbox.json";
    if (!reviewPath && inferredRoot) reviewPath = inferredRoot + "/review/memory-review.md";
    if (!pendingPath && inferredRoot) pendingPath = inferredRoot + "/pending";
    var jobs = [];
    if (metricsPath) jobs.push(fetchJson(metricsPath).then(function (metrics) { state.metrics = metrics; }));
    if (inboxPath) jobs.push(fetchJson(inboxPath).then(function (inbox) { state.inbox = inbox; }).catch(function () { state.inbox = null; }));
    if (reviewPath) jobs.push(fetchText(reviewPath).then(function (text) { state.reviewText = text; }).catch(function () { state.reviewText = ""; }));
    if (pendingPath) jobs.push(loadPending(pendingPath).then(function (packets) { state.pendingPackets = packets; }));
    if (!graphPaths.length && !jobs.length) {
      loadHostedDefault();
      return;
    }
    setAutoLoad("loading project graph", false);
    Promise.all(graphPaths.map(function (path) {
      return fetch(path).then(function (response) {
        if (!response.ok) throw new Error(response.status + " " + path);
        return response.json().then(function (graph) { return { fileName: path.split("/").pop() || path, graph: graph }; });
      });
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
      fetchJson("./data/kage/graph.json"),
      fetchJson("./data/kage/code_graph/graph.json"),
      fetchJson("./data/kage/metrics.json").catch(function () { return null; }),
      fetchJson("./data/kage/inbox.json").catch(function () { return null; })
    ]).then(function (items) {
      var merged = mergeNormalizedGraphs([normalizeGraph(items[0]), normalizeGraph(items[1])]);
      state.metrics = items[2];
      state.inbox = items[3];
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
        var memoryCodeLink = Boolean(edge.memory_code_link || isMemoryCodeRelation(edge.relation));
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
    return { entities: Array.from(entities.values()), edges: Array.from(edges.values()), episodes: Array.from(episodes.values()) };
  }

  function canonicalEntityId(entity, aliasToCodeId) {
    if (!entity) return "";
    if (entity.graph_kind === "memory" && ["symbol", "test", "route", "file", "path"].indexOf(entity.type) !== -1) {
      var alias = [entity.id, entity.name].concat(entity.aliases || []).find(function (value) { return aliasToCodeId.has(value); });
      if (alias) return aliasToCodeId.get(alias);
    }
    return aliasToCodeId.get(entity.id) || entity.id;
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
    var addEdge = function (from, to, relation, fact, source) {
      if (!from || !to) return;
      edges.push({
        id: relation + ":" + from + ":" + to + ":" + edges.length,
        from: from,
        to: to,
        relation: relation,
        fact: fact,
        confidence: 1,
        evidence: [],
        commit: graph.repo_state && graph.repo_state.head,
        source: source || "code_graph",
        graph_kind: "code"
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
        aliases: [symbol.path],
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
      addEdge(call.from_symbol || "file:" + call.path, call.to_symbol, "calls", call.path + ":" + call.line + " calls target symbol.", "calls");
    });

    (graph.routes || []).forEach(function (route) {
      addEntity({
        id: route.id,
        type: "route",
        graph_kind: "code",
        name: route.method + " " + route.path,
        summary: route.framework + " route in " + route.file_path + ":" + route.line,
        aliases: [route.file_path],
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
      els.relationFilter.appendChild(new Option("Memory-Code links", "__memory_code__"));
    }
  }

  function replaceOptions(select, label, values) {
    select.textContent = "";
    select.appendChild(new Option(label, ""));
    values.sort().forEach(function (value) {
      select.appendChild(new Option(value, value));
    });
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

    renderCanvasGraph(graphChanged);
    renderLists();
    renderDetails();
    renderMetrics();
    renderReviewQueue();
    renderProof();
  }

  function scheduleRender() {
    if (state.renderRaf) return;
    state.renderRaf = window.requestAnimationFrame(function () {
      state.renderRaf = null;
      render();
    });
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
        ? balancedSignalEntities(ranked, options.maxNodes)
        : new Set(ranked.slice(0, options.maxNodes));
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

    return { entities: entities, edges: edgesWithVisibleEndpoints(edges, entities) };
  }

  function balancedSignalEntities(rankedIds, maxNodes) {
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

    var memoryBudget = clamp(Math.round(maxNodes * 0.34), 18, Math.min(44, maxNodes));
    memoryIds.slice(0, memoryBudget).forEach(function (id) { result.add(id); });
    otherMemoryIds.slice(0, Math.max(0, Math.round(memoryBudget * 0.35))).forEach(function (id) { result.add(id); });
    codeIds.forEach(function (id) {
      if (result.size < maxNodes) result.add(id);
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

  function renderCanvasGraph(graphChanged) {
    resizeCanvas();
    syncSimulationGraph(graphChanged);
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
    gradient.addColorStop(0, "rgba(65,255,143,0.080)");
    gradient.addColorStop(0.48, "rgba(65,255,143,0.018)");
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
      var matches = matchesSearchQuery(edge, query) || matchesSearchQuery(from.entity, query) || matchesSearchQuery(to.entity, query);
      var alpha = !matches ? 0.035 : focusId ? (connected ? 0.62 : 0.055) : (dense ? 0.13 : 0.22);
      var color = hexToRgb(edgeThemeColor(edge, from.entity, to.entity));
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
      ctx.lineWidth = connected ? 2.2 : 1;
      ctx.stroke();
      if (connected || (!dense && state.sim.zoom > 1.25)) drawArrow(ctx, from, to, cx, cy, color, alpha);
      if (connected && state.sim.zoom > 0.62) drawEdgeLabel(ctx, edge, cx, cy);
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
      var matches = matchesSearchQuery(entity, query);
      var alpha = !matches ? 0.12 : focusId && !connected ? 0.20 : 1;
      var color = nodeThemeColor(entity);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (selected || hovered) {
        ctx.shadowColor = color;
        ctx.shadowBlur = selected ? 14 : 10;
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

      if (selected || hovered) {
        ctx.save();
        drawNodeShape(ctx, node.x, node.y, node.r + 4, entity);
        ctx.strokeStyle = color;
        ctx.lineWidth = selected ? 2.6 : 1.8;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }

      var shouldLabel = matches && (selected || hovered || (query.active && matches) || (!dense && state.sim.zoom > 0.75) || (dense && state.sim.zoom > 1.55 && node.r > 13));
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
        state.selected = { kind: "edge", id: edge.id };
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
        state.selected = { kind: "entity", id: entity.id };
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
    var visibleEntities = state.entities.filter(function (entity) {
      return state.visibleEntityIds.has(entity.id);
    });
    var visibleEdges = state.edges.filter(function (edge) {
      return state.visibleEdgeIds.has(edge.id);
    }).sort(function (a, b) {
      return reviewRank(a) - reviewRank(b);
    });

    els.entityCount.textContent = String(visibleEntities.length);
    els.edgeCount.textContent = String(visibleEdges.length);
    els.entityList.textContent = "";
    els.edgeList.textContent = "";

    visibleEntities.forEach(function (entity) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = classNames("list-item", state.selected && state.selected.kind === "entity" && state.selected.id === entity.id && "selected");
      button.innerHTML = "<span class=\"item-title\"></span><span class=\"item-meta\"></span>";
      button.querySelector(".item-title").textContent = displayName(entity);
      button.querySelector(".item-meta").textContent = (entity.type || "unknown") + " | " + entity.id;
      button.addEventListener("click", function () {
        state.selected = { kind: "entity", id: entity.id };
        render();
      });
      els.entityList.appendChild(button);
    });

    visibleEdges.forEach(function (edge) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = classNames("list-item", state.selected && state.selected.kind === "edge" && state.selected.id === edge.id && "selected");
      button.innerHTML = "<span class=\"item-title\"></span><span class=\"item-meta\"></span>";
      button.querySelector(".item-title").textContent = edge.relation || "related";
      button.querySelector(".item-meta").textContent = displayName(state.entityById.get(edge.from)) + " -> " + displayName(state.entityById.get(edge.to)) + " | " + reviewStatus(edge);
      button.addEventListener("click", function () {
        state.selected = { kind: "edge", id: edge.id };
        render();
      });
      els.edgeList.appendChild(button);
    });
  }

  function renderDetails() {
    if (!state.selected) {
      els.selectionDetails.className = "details-empty";
      els.selectionDetails.textContent = "Select an entity or edge.";
      els.selectionStatus.textContent = "No selection";
      return;
    }

    var item = state.selected.kind === "entity"
      ? state.entityById.get(state.selected.id)
      : state.edges.find(function (edge) { return edge.id === state.selected.id; });

    if (!item) {
      els.selectionDetails.textContent = "Selection no longer exists.";
      return;
    }

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
      rows.appendChild(detailRow("Summary", item.summary || ""));
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
    var metrics = official ? [
      ["Readiness", official.harness.readiness_score + "/100"],
      ["Tokens Saved", official.savings ? official.savings.estimated_tokens_saved_per_recall : "n/a"],
      ["Code Files", official.code_graph.files],
      ["Memory Edges", official.memory_graph.edges],
      ["Quality", official.memory_graph.average_quality_score + "/100"],
      ["Evidence", official.memory_graph.evidence_coverage_percent + "%"]
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
  }

  function renderReviewQueue() {
    if (!els.reviewList) return;
    var packets = state.pendingPackets || [];
    var inbox = state.inbox;
    var inboxItems = inbox && Array.isArray(inbox.items) ? inbox.items : [];
    els.reviewCount.textContent = String(packets.length + inboxItems.length);
    els.reviewList.textContent = "";
    if (!packets.length && !inboxItems.length && !state.reviewText) {
      els.reviewList.className = "review-list details-empty";
      els.reviewList.textContent = "No pending packets loaded. Launch with `kage viewer --project <repo>` to load review context automatically.";
      return;
    }
    els.reviewList.className = "review-list";
    if (inbox) {
      var summary = document.createElement("div");
      summary.className = "review-item";
      var counts = inbox.counts || {};
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
      summary.querySelector(".review-risks").textContent = inbox.ok ? "ready for handoff" : "requires review";
      els.reviewList.appendChild(summary);
    }
    inboxItems.slice(0, 20).forEach(function (entry) {
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
      item.querySelector(".review-risks").textContent = Array.isArray(entry.reasons) && entry.reasons.length ? "reasons: " + entry.reasons.slice(0, 3).join(", ") : "reasons: none";
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
      item.querySelector(".review-risks").textContent = Array.isArray(quality.risks) && quality.risks.length ? "risks: " + quality.risks.join(", ") : "risks: none";
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

  function renderProof() {
    if (!els.proofList) return;
    var metrics = state.metrics;
    els.proofList.textContent = "";
    if (!metrics) {
      els.proofStatus.textContent = "not loaded";
      els.proofList.className = "proof-list details-empty";
      els.proofList.textContent = "Metrics not loaded. Run `kage metrics --project <repo> --json > .agent_memory/metrics.json` or launch with `kage viewer`.";
      return;
    }
    els.proofStatus.textContent = "loaded";
    els.proofList.className = "proof-list";
    var rows = [
      ["Readiness", metrics.harness && metrics.harness.readiness_score != null ? metrics.harness.readiness_score + "/100" : "n/a"],
      ["Useful memory", metrics.quality ? metrics.quality.useful_memory_ratio_percent + "%" : "n/a"],
      ["Evidence", metrics.memory_graph ? metrics.memory_graph.evidence_coverage_percent + "%" : "n/a"],
      ["Pending review", metrics.memory_graph ? String(metrics.memory_graph.pending_packets) : "n/a"],
      ["Recall hit rate", metrics.pain ? metrics.pain.recall_hit_rate_percent + "%" : "n/a"],
      ["Tokens saved", metrics.pain ? String(metrics.pain.estimated_tokens_saved) : metrics.savings ? String(metrics.savings.estimated_tokens_saved_per_recall) : "n/a"]
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

  function renderStatusStrip(visibleEntities, visibleEdges, official) {
    if (!els.statusStrip) return;
    var memoryCount = visibleEntities.filter(function (entity) { return entity.graph_kind === "memory"; }).length;
    var codeCount = visibleEntities.filter(function (entity) { return entity.graph_kind === "code"; }).length;
    var reviewFlags = visibleEdges.filter(function (edge) { return reviewStatus(edge) !== "ok"; }).length;
    var pills = official ? [
      ["Readiness", official.harness.readiness_score + "/100", ""],
      ["Pending", official.memory_graph ? String(official.memory_graph.pending_packets) : "n/a", official.memory_graph && official.memory_graph.pending_packets ? "warn" : ""],
      ["Tokens saved", official.savings ? String(official.savings.estimated_tokens_saved_per_recall) : "n/a", "warn"],
      ["Quality", official.memory_graph.average_quality_score + "/100", "memory"],
      ["Parser coverage", official.code_graph.indexer_coverage_percent + "%", "code"]
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
      state.selected = { kind: "entity", id: state.sim.dragNode.id };
      state.sim.dragNode = null;
      render();
    } else if (state.sim.panning && !state.sim.panning.moved) {
      state.selected = null;
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
    state.selected = { kind: "entity", id: node.id };
    els.scopeFilter.value = "focus";
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
      mergeNormalizedGraphs: mergeNormalizedGraphs,
      isMemoryCodeRelation: isMemoryCodeRelation
    };
  }

  function showError(message) {
    els.graphSummary.textContent = message;
  }
})();
