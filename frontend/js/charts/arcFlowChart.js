/* ============================================================
   arcFlowChart.js — 城乡×严重程度 流转图（ECharts graph）
   架构：init-once + update 模式
   布局：左右两排（Urban 左, Rural 右）× 3 严重程度
   边线：带弧度，粗细映射事故量
   数据：arc_flow_data.json（按年份拆分，≤ 6 节点 + 9 边）
   ============================================================ */

var _arcFlowChart      = null;
var _arcFlowData       = null;     // {all, 2005, ..., 2015}
var _arcFlowSelectorInited = false;

// ============================================================
//  initArcFlowChart
// ============================================================
function initArcFlowChart() {
  var dom = document.getElementById("chartArc");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _arcFlowChart = existing; return existing; }

  _arcFlowChart = echarts.init(dom, CURRENT_THEME);

  if (!_arcFlowSelectorInited) _initArcFlowSelector();

  return _arcFlowChart;
}

// ============================================================
//  年份选择器
// ============================================================
function _initArcFlowSelector() {
  _arcFlowSelectorInited = true;
  var container = document.getElementById("chartArc");
  if (!container) return;

  var oldSel = container.querySelector(".arcflow__year-select");
  if (oldSel) oldSel.remove();

  var sel = document.createElement("select");
  sel.className = "arcflow__year-select";
  sel.id = "arcFlowYearSelector";
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
    _applyArcFlowData(this.value);
  });
  sel.addEventListener("click", function(e) { e.stopPropagation(); });

  container.appendChild(sel);
}

// ============================================================
//  内部渲染
// ============================================================
function _applyArcFlowData(year) {
  if (!_arcFlowChart || !_arcFlowData) return;
  if (!year) {
    var sel = document.getElementById("arcFlowYearSelector");
    year = sel ? sel.value : "all";
  }

  var entry = _arcFlowData[year] || _arcFlowData["all"];
  if (!entry) return;

  // 节点位置：Urban 在左侧 (x=15%)，Rural 在右侧 (x=85%)
  var nodes = (entry.nodes || []).map(function(n) {
    var isUrban = n.name.indexOf("Urban") === 0;
    var severity = n.name.split("-")[1] || "";
    return {
      name: n.name,
      symbolSize: n.symbolSize || 25,
      itemStyle: n.itemStyle || {},
      category: isUrban ? 0 : 1,
      x: isUrban ? 120 : 480,       // 左右两排
      y: severity === "Fatal" ? 80 : (severity === "Serious" ? 220 : 360),
      label: { show: true, fontSize: 10, formatter: function(p) { return p.name.replace("Urban-", "U-").replace("Rural-", "R-"); } },
    };
  });

  _arcFlowChart.setOption({
    title: {
      text: "Urban vs Rural × Severity Flow",
      subtext: year === "all" ? "All Years" : year,
      left: "center", top: 2,
      textStyle: { fontSize: 11, fontWeight: "bold", color: "#3366cc" },
      subtextStyle: { fontSize: 10, color: "#999" },
    },
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        if (p.dataType === "edge") {
          return p.data.source + " ↔ " + p.data.target + "<br>Combined: <strong>" + (p.data.value || 0).toLocaleString() + "</strong>";
        }
        return "<strong>" + p.name + "</strong>";
      },
    },
    series: [{
      type: "graph",
      layout: "none",
      roam: false,
      draggable: false,
      data: nodes,
      links: entry.links || [],
      categories: [
        { name: "Urban",  itemStyle: { color: "#3366cc" } },
        { name: "Rural",  itemStyle: { color: "#e53935" } },
      ],
      lineStyle: { opacity: 0.45, curveness: 0.3 },
      emphasis: {
        focus: "adjacency",
        lineStyle: { width: 8 },
      },
      edgeSymbol: ["none", "none"],
      edgeLabel: { show: false },
    }],
  }, true);
}

// ============================================================
//  updateArcFlowChart
// ============================================================
function updateArcFlowChart(arcFlowData) {
  if (!_arcFlowChart) initArcFlowChart();
  if (!_arcFlowChart || !arcFlowData) return null;
  _arcFlowData = arcFlowData;
  _applyArcFlowData();
  return _arcFlowChart;
}

// ============================================================
//  disposeArcFlowChart
// ============================================================
function disposeArcFlowChart() {
  if (_arcFlowChart) {
    try { _arcFlowChart.dispose(); } catch(e) {}
    _arcFlowChart = null;
  }
  _arcFlowSelectorInited = false;
}

// ---- 兼容旧 API（外部可能调用 renderArcTimeChart） ----
function renderArcTimeChart() {
  // No-op: 旧 arc 图已废弃，由 arc_flow 图的 init+update 替代
  console.warn("[arcFlow] renderArcTimeChart is deprecated — use initArcFlowChart + updateArcFlowChart");
}
