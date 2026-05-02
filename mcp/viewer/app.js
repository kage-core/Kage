(function () {
  "use strict";

  var state = {
    graph: null,
    entities: [],
    edges: [],
    episodesById: new Map(),
    entityById: new Map(),
    positions: new Map(),
    visibleEntityIds: new Set(),
    visibleEdgeIds: new Set(),
    selected: null,
    metrics: null,
    pendingPackets: [],
    reviewText: "",
    viewBox: { x: 0, y: 0, width: 1000, height: 660 },
    pan: null
  };

  var palette = {
    repo: "#41ff8f",
    memory: "#b88cff",
    path: "#ff6b6b",
    tag: "#ffd166",
    package: "#6ad7ff",
    command: "#9be7c0",
    memory_type: "#41ff8f",
    file: "#6ad7ff",
    symbol: "#b88cff",
    route: "#ff8fab",
    test: "#ffd166",
    external: "#93a4a0",
    script: "#6ad7ff",
    default: "#9be7c0"
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
    resetView: document.getElementById("resetView"),
    zoomOut: document.getElementById("zoomOut"),
    zoomIn: document.getElementById("zoomIn"),
    fitView: document.getElementById("fitView"),
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

  els.graphFile.addEventListener("change", handleFile);
  els.searchInput.addEventListener("input", render);
  els.viewMode.addEventListener("change", render);
  els.typeFilter.addEventListener("change", render);
  els.relationFilter.addEventListener("change", render);
  els.zoomOut.addEventListener("click", function () { zoomView(1.18); });
  els.zoomIn.addEventListener("click", function () { zoomView(0.84); });
  els.fitView.addEventListener("click", function () { fitView(); renderSvg(); });
  els.svg.addEventListener("mousedown", startPan);
  els.svg.addEventListener("click", handleSvgClick);
  els.svg.addEventListener("wheel", handleWheelZoom, { passive: false });
  window.addEventListener("mousemove", continuePan);
  window.addEventListener("mouseup", endPan);
  els.resetView.addEventListener("click", function () {
    els.searchInput.value = "";
    els.viewMode.value = "combined";
    els.typeFilter.value = "";
    els.relationFilter.value = "";
    state.selected = null;
    fitView();
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
    state.episodesById = new Map(episodes.map(function (episode) {
      return [episode.id, episode];
    }));
    state.selected = null;

    populateFilters();
    layoutGraph();
    fitView();
    els.emptyState.classList.add("hidden");
    els.graphSummary.textContent = fileName + " loaded: " + entities.length + " nodes, " + edges.length + " relations.";
    render();
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
    var reviewPath = params.get("review");
    var pendingPath = params.get("pending");
    var inferredRoot = inferMemoryRoot(graphPaths[0] || "");
    if (!reviewPath && inferredRoot) reviewPath = inferredRoot + "/review/memory-review.md";
    if (!pendingPath && inferredRoot) pendingPath = inferredRoot + "/pending";
    var jobs = [];
    if (metricsPath) jobs.push(fetchJson(metricsPath).then(function (metrics) { state.metrics = metrics; }));
    if (reviewPath) jobs.push(fetchText(reviewPath).then(function (text) { state.reviewText = text; }).catch(function () { state.reviewText = ""; }));
    if (pendingPath) jobs.push(loadPending(pendingPath).then(function (packets) { state.pendingPackets = packets; }));
    if (!graphPaths.length && !jobs.length) {
      setAutoLoad("manual mode", false);
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
    graphs.forEach(function (graph) {
      graph.entities.forEach(function (entity) { entities.set(entity.id, entity); });
      graph.edges.forEach(function (edge) { edges.set(edge.id, edge); });
      graph.episodes.forEach(function (episode) { episodes.set(episode.id, episode); });
    });
    return { entities: Array.from(entities.values()), edges: Array.from(edges.values()), episodes: Array.from(episodes.values()) };
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
        aliases: [file.hash],
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

  function populateFilters() {
    replaceOptions(els.typeFilter, "All types", unique(state.entities.map(function (entity) {
      return entity.type || "unknown";
    })));
    replaceOptions(els.relationFilter, "All relations", unique(state.edges.map(function (edge) {
      return edge.relation || "related";
    })));
  }

  function replaceOptions(select, label, values) {
    select.textContent = "";
    select.appendChild(new Option(label, ""));
    values.sort().forEach(function (value) {
      select.appendChild(new Option(value, value));
    });
  }

  function layoutGraph() {
    state.positions = new Map();
    var lanes = [
      { name: "memory", x: 190, y: 86, step: 62, match: function (entity) { return entity.graph_kind === "memory"; } },
      { name: "files", x: 480, y: 78, step: 60, match: function (entity) { return entity.graph_kind === "code" && entity.type === "file"; } },
      { name: "flow", x: 700, y: 88, step: 58, match: function (entity) { return entity.graph_kind === "code" && ["symbol", "route", "test"].indexOf(entity.type) !== -1; } },
      { name: "external", x: 895, y: 110, step: 64, match: function (entity) { return entity.graph_kind === "code" && ["external", "script"].indexOf(entity.type) !== -1; } },
      { name: "other", x: 700, y: 570, step: 58, match: function (entity) { return ["memory", "code"].indexOf(entity.graph_kind) === -1 || (entity.graph_kind === "code" && ["file", "symbol", "route", "test", "external", "script"].indexOf(entity.type) === -1); } }
    ];
    lanes.forEach(function (lane) {
      var bucket = state.entities.filter(function (entity) {
        return lane.match(entity);
      }).sort(function (a, b) {
        return degreeOf(b.id) - degreeOf(a.id) || displayName(a).localeCompare(displayName(b));
      });
      if (!bucket.length) return;
      bucket.forEach(function (entity, index) {
        var column = Math.floor(index / 8);
        var row = index % 8;
        var xOffset = column * 168;
        var yJitter = column % 2 ? 18 : 0;
        state.positions.set(entity.id, {
          x: lane.x + xOffset,
          y: lane.y + row * lane.step + yJitter
        });
      });
    });
  }

  function render() {
    if (!state.graph) return;

    var query = normalize(els.searchInput.value);
    var mode = els.viewMode.value;
    var type = els.typeFilter.value;
    var relation = els.relationFilter.value;
    var matchedEntityIds = new Set();
    var matchedEdgeIds = new Set();

    state.entities.forEach(function (entity) {
      if (mode !== "combined" && entity.graph_kind !== mode) return;
      var passesType = !type || entity.type === type;
      var passesSearch = !query || searchableText(entity).indexOf(query) !== -1;
      if (passesType && passesSearch) matchedEntityIds.add(entity.id);
    });

    state.edges.forEach(function (edge) {
      if (mode !== "combined" && edge.graph_kind !== mode) return;
      var fromMatched = matchedEntityIds.has(edge.from);
      var toMatched = matchedEntityIds.has(edge.to);
      var edgeMatchesSearch = !query || searchableText(edge).indexOf(query) !== -1;
      var passesRelation = !relation || edge.relation === relation;
      if (passesRelation && (edgeMatchesSearch || fromMatched || toMatched)) {
        matchedEdgeIds.add(edge.id);
        if (!type) {
          if (state.entityById.has(edge.from)) matchedEntityIds.add(edge.from);
          if (state.entityById.has(edge.to)) matchedEntityIds.add(edge.to);
        }
      }
    });

    if (!query && !type && !relation) {
      matchedEntityIds = new Set(state.entities.filter(function (entity) { return mode === "combined" || entity.graph_kind === mode; }).map(function (entity) { return entity.id; }));
      matchedEdgeIds = new Set(state.edges.filter(function (edge) { return mode === "combined" || edge.graph_kind === mode; }).map(function (edge) { return edge.id; }));
    }

    state.visibleEntityIds = matchedEntityIds;
    state.visibleEdgeIds = matchedEdgeIds;

    renderSvg();
    renderLists();
    renderDetails();
    renderMetrics();
    renderReviewQueue();
    renderProof();
  }

  function renderSvg() {
    els.edgeLayer.textContent = "";
    els.nodeLayer.textContent = "";
    els.svg.setAttribute("viewBox", [state.viewBox.x, state.viewBox.y, state.viewBox.width, state.viewBox.height].join(" "));

    var selectedEntityId = state.selected && state.selected.kind === "entity" ? state.selected.id : null;
    var selectedEdgeId = state.selected && state.selected.kind === "edge" ? state.selected.id : null;
    var connectedIds = connectedEntityIds(selectedEntityId, selectedEdgeId);

    state.edges.forEach(function (edge) {
      var from = state.positions.get(edge.from);
      var to = state.positions.get(edge.to);
      if (!from || !to) return;

      var group = svgEl("g");
      var visible = state.visibleEdgeIds.has(edge.id);
      var connected = selectedEdgeId === edge.id || connectedIds.edges.has(edge.id);
      var line = svgEl("path", {
        d: edgePath(from, to),
        class: classNames("edge-line", "review-" + reviewStatus(edge).replace(/\s+/g, "-"), !visible && "filtered", connected && "connected", selectedEdgeId === edge.id && "selected")
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
      var pos = state.positions.get(entity.id);
      if (!pos) return;

      var visible = state.visibleEntityIds.has(entity.id);
      var selected = selectedEntityId === entity.id;
      var connected = connectedIds.entities.has(entity.id);
      var group = svgEl("g", {
        class: classNames("node", "graph-" + (entity.graph_kind || "unknown"), !visible && "filtered", selected && "selected", connected && "connected"),
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
    els.graphSubhead.textContent = visibleEntities.length + " visible nodes and " + visibleEdges.length + " visible relations.";
  }

  function renderReviewQueue() {
    if (!els.reviewList) return;
    var packets = state.pendingPackets || [];
    els.reviewCount.textContent = String(packets.length);
    els.reviewList.textContent = "";
    if (!packets.length && !state.reviewText) {
      els.reviewList.className = "review-list details-empty";
      els.reviewList.textContent = "No pending packets loaded. Launch with `kage viewer --project <repo>` to load review context automatically.";
      return;
    }
    els.reviewList.className = "review-list";
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
    return state.edges.reduce(function (sum, edge) {
      return sum + (edge.from === id || edge.to === id ? 1 : 0);
    }, 0);
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
      x: clamp(minX, -160, 1000),
      y: clamp(minY, -120, 660),
      width: Math.max(520, Math.min(1120, maxX - minX)),
      height: Math.max(360, Math.min(700, maxY - minY))
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

  function classNames() {
    return Array.prototype.slice.call(arguments).filter(Boolean).join(" ");
  }

  function svgEl(name, attrs) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) {
      element.setAttribute(key, attrs[key]);
    });
    return element;
  }

  function showError(message) {
    els.graphSummary.textContent = message;
  }
})();
