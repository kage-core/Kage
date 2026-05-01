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
    metrics: null
  };

  var palette = {
    repo: "#167a68",
    memory: "#6d5bd0",
    path: "#c65353",
    tag: "#b87514",
    package: "#2474a6",
    command: "#5d7780",
    memory_type: "#32865a",
    file: "#167a68",
    symbol: "#6d5bd0",
    route: "#c65353",
    test: "#b87514",
    external: "#64748b",
    script: "#2474a6",
    default: "#64748b"
  };

  var els = {
    graphFile: document.getElementById("graphFile"),
    graphSummary: document.getElementById("graphSummary"),
    searchInput: document.getElementById("searchInput"),
    viewMode: document.getElementById("viewMode"),
    typeFilter: document.getElementById("typeFilter"),
    relationFilter: document.getElementById("relationFilter"),
    resetView: document.getElementById("resetView"),
    svg: document.getElementById("graphSvg"),
    nodeLayer: document.getElementById("nodeLayer"),
    edgeLayer: document.getElementById("edgeLayer"),
    emptyState: document.getElementById("emptyState"),
    selectionDetails: document.getElementById("selectionDetails"),
    entityList: document.getElementById("entityList"),
    edgeList: document.getElementById("edgeList"),
    metricsSummary: document.getElementById("metricsSummary"),
    entityCount: document.getElementById("entityCount"),
    edgeCount: document.getElementById("edgeCount")
  };

  els.graphFile.addEventListener("change", handleFile);
  els.searchInput.addEventListener("input", render);
  els.viewMode.addEventListener("change", render);
  els.typeFilter.addEventListener("change", render);
  els.relationFilter.addEventListener("change", render);
  els.resetView.addEventListener("click", function () {
    els.searchInput.value = "";
    els.viewMode.value = "combined";
    els.typeFilter.value = "";
    els.relationFilter.value = "";
    state.selected = null;
    render();
  });

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

    state.graph = graph;
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
    els.emptyState.classList.add("hidden");
    els.graphSummary.textContent = fileName + " loaded: " + entities.length + " nodes, " + edges.length + " relations.";
    render();
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
    var width = 1000;
    var height = 660;
    var centerX = width / 2;
    var centerY = height / 2;
    var types = unique(state.entities.map(function (entity) {
      return entity.type || "unknown";
    })).sort();
    var typeRadius = Math.min(width, height) * 0.36;

    types.forEach(function (type, typeIndex) {
      var bucket = state.entities.filter(function (entity) {
        return (entity.type || "unknown") === type;
      });
      var typeAngle = (Math.PI * 2 * typeIndex) / Math.max(types.length, 1) - Math.PI / 2;
      var typeCenterX = centerX + Math.cos(typeAngle) * typeRadius * 0.48;
      var typeCenterY = centerY + Math.sin(typeAngle) * typeRadius * 0.48;
      var bucketRadius = Math.max(54, Math.min(155, 34 + bucket.length * 10));

      bucket.forEach(function (entity, index) {
        var angle = (Math.PI * 2 * index) / Math.max(bucket.length, 1) + typeAngle;
        state.positions.set(entity.id, {
          x: clamp(typeCenterX + Math.cos(angle) * bucketRadius, 70, width - 70),
          y: clamp(typeCenterY + Math.sin(angle) * bucketRadius, 55, height - 55)
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
  }

  function renderSvg() {
    els.edgeLayer.textContent = "";
    els.nodeLayer.textContent = "";

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
      var line = svgEl("line", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        class: classNames("edge-line", "review-" + reviewStatus(edge).replace(/\s+/g, "-"), !visible && "filtered", connected && "connected", selectedEdgeId === edge.id && "selected")
      });
      var hit = svgEl("line", {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        class: "edge-hit"
      });
      hit.addEventListener("click", function () {
        state.selected = { kind: "edge", id: edge.id };
        render();
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
        class: classNames("node", !visible && "filtered", selected && "selected", connected && "connected"),
        transform: "translate(" + pos.x + " " + pos.y + ")"
      });
      var circle = svgEl("circle", {
        r: selected ? 16 : 13,
        fill: palette[entity.type] || palette.default
      });
      var text = svgEl("text", {
        x: 19,
        y: 4
      });
      text.textContent = displayName(entity);
      group.addEventListener("click", function () {
        state.selected = { kind: "entity", id: entity.id };
        render();
      });
      group.appendChild(circle);
      group.appendChild(text);
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

  function displayName(entity) {
    if (!entity) return "Unknown";
    return entity.name || entity.title || entity.path || entity.id || "Unknown";
  }

  function searchableText(value) {
    return normalize(JSON.stringify(value || {}));
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
