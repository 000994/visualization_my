/* ============================================================
   sankeyChart.js — 桑基图（Light → Severity → Vehicle）
   架构：init-once + update 模式
   数据：sankey_data.json（按年份拆分，节点统一）
   交互：节点拖拽、连线高亮、年份选择器、缩放/间距调整控件
   ============================================================ */

var _sankeyChart      = null;
var _sankeyData       = null;     // 全量 sankey 数据（{all, 2005, ..., 2015}）
var _sankeySelectorInited = false;

// ---- 可调配置项（默认值，用户可通过控件修改） ----
var _sankeyConfig = {
  nodeWidth: 22,        // 节点宽度（px）— 原14→22，适配扩大后的左列空间
  nodeGap: 10,          // 节点间距（px）— 原8→10
  scale: 1.0,           // 整体缩放比例
  layoutIterations: 40, // 布局迭代次数 — 原32→40，更精细
};

// ============================================================
//  initSankeyChart — 创建实例 + 年份选择器 + 配置控件
// ============================================================
function initSankeyChart() {
  var dom = document.getElementById("chartSankey");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _sankeyChart = existing; return existing; }

  _sankeyChart = echarts.init(dom, CURRENT_THEME);

  if (!_sankeySelectorInited) {
    _initSankeySelector();
    _initSankeyFilters();
    _initSankeyControls();
  }

  return _sankeyChart;
}

// ============================================================
//  年份选择器（绝对定位在桑基图右上角）
// ============================================================
function _initSankeySelector() {
  _sankeySelectorInited = true;
  var container = document.getElementById("chartSankey");
  if (!container) return;

  var oldSel = container.querySelector(".sankey__year-select");
  if (oldSel) oldSel.remove();

  var sel = document.createElement("select");
  sel.className = "sankey__year-select";
  sel.id = "sankeyYearSelector";
  sel.style.cssText =
    "position:absolute;top:6px;right:8px;z-index:10;" +
    "background:var(--bg-panel,#fff);color:var(--text-primary,#333);" +
    "border:1px solid var(--border,#e0e0f0);border-radius:5px;" +
    "padding:2px 20px 2px 6px;font-size:.65rem;font-family:inherit;" +
    "cursor:pointer;appearance:none;" +
    "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E\");" +
    "background-repeat:no-repeat;background-position:right 5px center;";

  sel.innerHTML =
    '<option value="all">All Years</option>' +
    '<option value="2005">2005</option><option value="2006">2006</option>' +
    '<option value="2007">2007</option><option value="2008">2008</option>' +
    '<option value="2009">2009</option><option value="2010">2010</option>' +
    '<option value="2011">2011</option><option value="2012">2012</option>' +
    '<option value="2013">2013</option><option value="2014">2014</option>' +
    '<option value="2015">2015</option>';

  sel.addEventListener("change", function() {
    _applySankeyData(this.value);
  });
  sel.addEventListener("click", function(e) { e.stopPropagation(); });

  container.appendChild(sel);
}

// ============================================================
//  专项筛选按钮（右上角，年份选择器旁）
// ============================================================
function _initSankeyFilters() {
  var container = document.getElementById("chartSankey");
  if (!container) return;

  var oldBar = container.querySelector(".sankey__filter-bar");
  if (oldBar) oldBar.remove();

  var bar = document.createElement("div");
  bar.className = "sankey__filter-bar";
  bar.style.cssText =
    "position:absolute;top:6px;left:58px;z-index:10;" +
    "display:flex;align-items:center;gap:3px;";

  var labels = ["All", "Fatal Only", "Night Only"];
  var values = ["all", "fatal", "night"];

  for (var bi = 0; bi < labels.length; bi++) {
    var el = document.createElement("button");
    el.className = "sankey__filter-btn";
    el.id = "sankeyFilter_" + values[bi];
    el.textContent = labels[bi];
    el.setAttribute("data-value", values[bi]);
    el.style.cssText =
      "background:var(--bg-panel,#fff);color:var(--text-muted,#888);" +
      "border:1px solid var(--border,#e0e0f0);border-radius:5px;" +
      "padding:2px 6px;font-size:.55rem;font-family:inherit;" +
      "cursor:pointer;transition:all .2s;white-space:nowrap;" +
      "letter-spacing:.2px;user-select:none;";

    if (values[bi] === "all") {
      el.style.background = "var(--accent,#3366cc)";
      el.style.color = "#fff";
      el.style.borderColor = "var(--accent,#3366cc)";
      el.classList.add("sankey__filter-btn--active");
    }

    el.addEventListener("click", function(e) {
      e.stopPropagation();
      var val = this.getAttribute("data-value");

      // Update all button styles
      bar.querySelectorAll(".sankey__filter-btn").forEach(function(b) {
        b.style.background = "var(--bg-panel,#fff)";
        b.style.color = "var(--text-muted,#888)";
        b.style.borderColor = "var(--border,#e0e0f0)";
        b.classList.remove("sankey__filter-btn--active");
      });
      this.style.background = "var(--accent,#3366cc)";
      this.style.color = "#fff";
      this.style.borderColor = "var(--accent,#3366cc)";
      this.classList.add("sankey__filter-btn--active");

      if (window.SankeyLinkage) {
        window.SankeyLinkage.setFilterType(val);
      }

      // Clear any selected node
      _clearSelectedNode();
      // Re-render sankey with filter
      _applySankeyData();
    });

    bar.appendChild(el);
  }

  container.appendChild(bar);
}

// ============================================================
//  选中/清除节点逻辑
// ============================================================
var _sankeySelectedNodeName = null;

function _clearSelectedNode() {
  if (_sankeySelectedNodeName) {
    _sankeySelectedNodeName = null;
    if (window.SankeyLinkage) {
      window.SankeyLinkage.setSelectedNode(null);
    }
    window.dispatchEvent(new CustomEvent("sankeyNodeDeselected"));
  }
}

function _isNodeSelected(nodeName) {
  return _sankeySelectedNodeName === nodeName;
}

// ============================================================
//  缩放/间距调整控件（左下角）
// ============================================================
function _initSankeyControls() {
  var container = document.getElementById("chartSankey");
  if (!container) return;

  var ctrl = document.createElement("div");
  ctrl.className = "sankey__controls";
  ctrl.style.cssText =
    "position:absolute;bottom:4px;left:4px;z-index:10;" +
    "display:flex;align-items:center;gap:5px;" +
    "background:var(--bg-panel,rgba(255,255,255,0.92));" +
    "border:1px solid var(--border,#e0e0f0);border-radius:6px;" +
    "padding:2px 7px;font-size:.55rem;color:var(--text-muted,#888);" +
    "box-shadow:0 1px 4px rgba(0,0,0,0.08);" +
    "user-select:none;";

  ctrl.innerHTML =
    '<span title="Node Width" style="cursor:default">▮</span>' +
    '<input type="range" id="sankeyNodeWidth" min="4" max="40" value="' + _sankeyConfig.nodeWidth + '" style="width:44px;height:3px;cursor:pointer;vertical-align:middle">' +
    '<span title="Node Gap" style="cursor:default;margin-left:2px">↕</span>' +
    '<input type="range" id="sankeyNodeGap" min="2" max="30" value="' + _sankeyConfig.nodeGap + '" style="width:44px;height:3px;cursor:pointer;vertical-align:middle">' +
    '<span title="Scale" style="cursor:default;margin-left:2px">🔍</span>' +
    '<input type="range" id="sankeyScale" min="50" max="200" value="' + (_sankeyConfig.scale * 100) + '" style="width:44px;height:3px;cursor:pointer;vertical-align:middle">' +
    '<button id="sankeyResetBtn" style="margin-left:2px;background:none;border:1px solid var(--border,#ccc);border-radius:3px;padding:0 5px;cursor:pointer;font-size:.5rem;color:var(--text-muted,#888);line-height:1.4">↺</button>';

  container.appendChild(ctrl);

  document.getElementById("sankeyNodeWidth").addEventListener("input", function() {
    _sankeyConfig.nodeWidth = parseInt(this.value);
    _applySankeyData();
  });
  document.getElementById("sankeyNodeGap").addEventListener("input", function() {
    _sankeyConfig.nodeGap = parseInt(this.value);
    _applySankeyData();
  });
  document.getElementById("sankeyScale").addEventListener("input", function() {
    _sankeyConfig.scale = parseInt(this.value) / 100;
    _applySankeyData();
  });
  document.getElementById("sankeyResetBtn").addEventListener("click", function() {
        _sankeyConfig.nodeWidth = 22;
    _sankeyConfig.nodeGap = 10;
    _sankeyConfig.scale = 1.0;
    document.getElementById("sankeyNodeWidth").value = 22;
    document.getElementById("sankeyNodeGap").value = 10;
    document.getElementById("sankeyScale").value = 100;
    _applySankeyData();
  });
}

// ============================================================
//  内部渲染
// ============================================================
function _applySankeyData(year) {
  if (!_sankeyChart || !_sankeyData) return;
  if (!year) {
    var sel = document.getElementById("sankeyYearSelector");
    year = sel ? sel.value : "all";
  }

  var entry = _sankeyData[year] || _sankeyData["all"];
  if (!entry) return;

  // Apply filter
  var filterType = window.SankeyLinkage ? window.SankeyLinkage.getFilterType() : "all";
  var filteredEntry = window.SankeyLinkage ? window.SankeyLinkage.getFilteredSankeyData(entry, filterType) : entry;
  if (!filteredEntry || !filteredEntry.nodes || !filteredEntry.nodes.length) {
    _sankeyChart.setOption({
      title: { text: "Casualty Flow: Light \u2192 Severity \u2192 Vehicle", subtext: "No matching data", left: "center", top: 2, textStyle: { fontSize: 10, fontWeight: "bold", color: "#3366cc" }, subtextStyle: { fontSize: 9, color: "#e53935" } },
      series: [{ type: "sankey", data: [], links: [] }],
    }, true);
    return;
  }

  var s = _sankeyConfig.scale;
  var nw = Math.round(_sankeyConfig.nodeWidth * s);
  var ng = Math.round(_sankeyConfig.nodeGap * s);
  var fs = Math.max(7, Math.round(9 * s));
  var titleFs = Math.max(9, Math.round(11 * s));

  var filterLabel = "";
  if (filterType === "fatal") filterLabel = " | Fatal Only";
  else if (filterType === "night") filterLabel = " | Night Only";

  var selectedName = _sankeySelectedNodeName;

  // Build nodes with highlight styling
  var nodes = filteredEntry.nodes.map(function(n) {
    var isSelected = (n.name === selectedName);
    var itemStyle = {};
    if (n.itemStyle && n.itemStyle.color) {
      itemStyle.color = n.itemStyle.color;
    }
    if (isSelected) {
      itemStyle.borderColor = "#ffa726";
      itemStyle.borderWidth = 3;
      itemStyle.borderType = "solid";
      itemStyle.opacity = 1;
    } else if (selectedName) {
      itemStyle.opacity = 0.3;
    }
    return {
      name: n.name,
      value: n.value || 0,
      itemStyle: itemStyle,
    };
  });

  // Filter links when node selected
  var links = filteredEntry.links;
  if (selectedName) {
    links = links.filter(function(l) {
      return l.source === selectedName || l.target === selectedName;
    });
  }

  _sankeyChart.setOption({
    title: {
      text: "Casualty Flow: Light \u2192 Severity \u2192 Vehicle",
      subtext: (year === "all" ? "All Years" : year) + filterLabel + (selectedName ? " | " + selectedName : ""),
      left: "center", top: 2,
      textStyle: { fontSize: titleFs, fontWeight: "bold", color: "#3366cc" },
      subtextStyle: { fontSize: Math.max(8, Math.round(10 * s)), color: "#999" },
    },
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: function(p) {
        if (p.dataType === "edge") {
          return p.data.source + " \u2192 " + p.data.target + "<br>Count: <strong>" + p.data.value.toLocaleString() + "</strong>";
        }
        return p.name + "<br>Total flow: <strong>" + (p.value || 0).toLocaleString() + "</strong>";
      },
    },
    series: [{
      type: "sankey",
      layout: "none",
      emphasis: { focus: "adjacency" },
      nodeAlign: "left",
      layoutIterations: _sankeyConfig.layoutIterations,
      nodeWidth: nw,
      nodeGap: ng,
      label: {
        show: true,
        fontSize: fs,
        color: "auto",
        formatter: function(p) {
          return p.name.length > 16 ? p.name.slice(0, 14) + "\u2026" : p.name;
        },
      },
      lineStyle: { color: "gradient", curveness: 0.5, opacity: selectedName ? 0.6 : 0.35 },
      data: nodes,
      links: links,
    }],
    }, true);
}

// ============================================================
//  updateSankeyChart — 注入全量数据（按年份拆分）
// ============================================================
function updateSankeyChart(sankeyData) {
  if (!_sankeyChart) initSankeyChart();
  if (!_sankeyChart || !sankeyData) return null;
  _sankeyData = sankeyData;
  _applySankeyData();
  return _sankeyChart;
}

// ============================================================
//  disposeSankeyChart
// ============================================================
function disposeSankeyChart() {
  if (_sankeyChart) {
    try { _sankeyChart.dispose(); } catch(e) {}
    _sankeyChart = null;
  }
  _sankeySelectorInited = false;
}

// ---- 兼容旧 API ----

// ============================================================
//  Node click binding (run after each setOption)
// ============================================================
function _bindSankeyNodeClick() {
  if (!_sankeyChart) return;
  _sankeyChart.off("click");
  _sankeyChart.on("click", function(params) {
    if (params.dataType !== "node") return;
    var nodeName = params.name;
    var category = window.SankeyLinkage ? window.SankeyLinkage.getNodeCategory(nodeName) : "unknown";

    if (_sankeySelectedNodeName === nodeName) {
      _clearSelectedNode();
      _applySankeyData();
      return;
    }

    _sankeySelectedNodeName = nodeName;
    if (window.SankeyLinkage) {
      window.SankeyLinkage.setSelectedNode({ name: nodeName, category: category });
    }
    _applySankeyData();
    window.dispatchEvent(new CustomEvent("sankeyNodeSelected", {
      detail: { name: nodeName, category: category }
    }));
  });
}

// Patch _applySankeyData to re-bind click after each render
var _sankeyOrigApply = _applySankeyData;
_applySankeyData = function(year) {
  _sankeyOrigApply(year);
  setTimeout(function() {
    if (_sankeyChart) {
      _bindSankeyNodeClick();
    }
  }, 80);
};


function renderSankeyChart(sankeyData) {
  initSankeyChart();
  return updateSankeyChart(sankeyData);
}
