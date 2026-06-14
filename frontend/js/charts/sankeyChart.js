/* ============================================================
   sankeyChart.js — 桑基图（Weather → Light → Vehicle）
   架构：init-once + update 模式
   数据：sankey_data.json（按年份拆分，节点统一）
   交互：节点拖拽、连线高亮、年份选择器、专项筛选按钮
   ============================================================ */

var _sankeyChart      = null;
var _sankeyData       = null;
var _sankeySelectorInited = false;
var _sankeySelectedNodeName = null;

// 固定参数（无调试滑块）
var _S_NODE_WIDTH       = 22;
var _S_NODE_GAP         = 6;
var _S_LAYOUT_ITER      = 40;
var _S_SANKEY_GRADIENT_COLORS = ["#F8DCD2", "#EF9A84", "#C95A4B"];

function _sankeyNodeColorByIndex(idx) {
  return _S_SANKEY_GRADIENT_COLORS[Math.min(2, Math.floor(idx / 5))];
}

// ============================================================
//  initSankeyChart — 创建实例 + UI 控件
// ============================================================
function initSankeyChart() {
  var dom = document.getElementById("chartSankey");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _sankeyChart = existing; return existing; }

  _sankeyChart = echarts.init(dom, CURRENT_THEME);

  if (!_sankeySelectorInited) {
    _initSankeySelector();
  }

  return _sankeyChart;
}

// ============================================================
//  年份选择器（右上角）
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
//  节点选中/清除
// ============================================================
function _clearSelectedNode() {
  if (_sankeySelectedNodeName) {
    _sankeySelectedNodeName = null;
    if (window.SankeyLinkage) {
      window.SankeyLinkage.setSelectedNode(null);
    }
    window.dispatchEvent(new CustomEvent("sankeyNodeDeselected"));
  }
}

// ============================================================
//  核心渲染
// ============================================================
function _applySankeyData(year) {
  if (!_sankeyChart || !_sankeyData) return;
  if (!year) {
    var sel = document.getElementById("sankeyYearSelector");
    year = sel ? sel.value : "all";
  }

  var entry = _sankeyData[year] || _sankeyData["all"];
  if (!entry) return;

  if (!entry.nodes || !entry.nodes.length) {
    _sankeyChart.setOption({
      title: { text: "Casualty Flow: Weather → Light → Vehicle", subtext: "No matching data",
        left: "center", top: 4, textStyle: { fontSize: 10, fontWeight: "bold", color: "#3366cc" },
        subtextStyle: { fontSize: 9, color: "#e53935" } },
      series: [{ type: "sankey", data: [], links: [] }],
    }, true);
    return;
  }

  var links = entry.links || [];
  var selectedName = _sankeySelectedNodeName;

  // 构建节点数据（三列均 5 节点，nodeAlign: justify 自动等高）
  var nodes = (entry.nodes || []).map(function(n, idx) {
    var isSelected = (n.name === selectedName);
    var itemStyle = { color: _sankeyNodeColorByIndex(idx) };
    if (isSelected) {
      itemStyle.borderColor = "#ffa726";
      itemStyle.borderWidth = 3;
      itemStyle.opacity = 1;
    } else if (selectedName) {
      itemStyle.opacity = 0.3;
    }
    return {
      name: n.name,
      itemStyle: itemStyle,
    };
  });

  // 选中节点时过滤边
  var displayLinks = links;
  if (selectedName) {
    displayLinks = links.filter(function(l) {
      return l.source === selectedName || l.target === selectedName;
    });
  }

  _sankeyChart.setOption({
    title: {
      text: "Casualty Flow: Weather → Light → Vehicle",
      subtext: (year === "all" ? "All Years" : year) +
               (selectedName ? " | " + selectedName : ""),
      left: "center", top: 6,                                 // ★ 标题下移留出间距
      textStyle: { fontSize: 10, fontWeight: "bold", color: "#3366cc" },
      subtextStyle: { fontSize: 9, color: "#999" },
    },
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: function(p) {
        if (p.dataType === "edge") {
          return p.data.source + " → " + p.data.target +
                 "<br>Count: <strong>" + (p.data.value || 0).toLocaleString() + "</strong>";
        }
        return p.name +
               "<br>Total flow: <strong>" + ((p.value || 0).toLocaleString()) + "</strong>";
      },
    },
    series: [{
      type: "sankey",
      top: 50,                         // ★ 图表整体下移，避免与标题重合
      emphasis: { focus: "adjacency" },
      nodeAlign: "justify",            // ★ 三列等高对齐，节点高度按流量自动分配
      layoutIterations: _S_LAYOUT_ITER,
      nodeWidth: _S_NODE_WIDTH,
      nodeGap: _S_NODE_GAP,
      label: {
        show: true,
        fontSize: 9,
        color: "#5a5a7a",
        formatter: function(p) {
          return p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name;
        },
      },
      lineStyle: { color: "source", curveness: 0.5, opacity: selectedName ? 0.6 : 0.35 },
      data: nodes,
      links: displayLinks,
    }],
  }, true);

  // 重新绑定节点点击
  setTimeout(function() {
    _bindSankeyNodeClick();
  }, 80);
}

// ============================================================
//  节点点击事件绑定
// ============================================================
function _bindSankeyNodeClick() {
  if (!_sankeyChart) return;
  _sankeyChart.off("click");
  _sankeyChart.on("click", function(params) {
    if (params.dataType !== "node") return;
    var nodeName = params.name;
    var category = window.SankeyLinkage
      ? window.SankeyLinkage.getNodeCategory(nodeName) : "unknown";

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

// ============================================================
//  外部 API
// ============================================================
function updateSankeyChart(sankeyData) {
  if (!_sankeyChart) initSankeyChart();
  if (!_sankeyChart || !sankeyData) return null;
  _sankeyData = sankeyData;
  _applySankeyData();
  return _sankeyChart;
}

function disposeSankeyChart() {
  if (_sankeyChart) {
    try { _sankeyChart.dispose(); } catch(e) {}
    _sankeyChart = null;
  }
  _sankeySelectorInited = false;
}

function renderSankeyChart(sankeyData) {
  initSankeyChart();
  return updateSankeyChart(sankeyData);
}
