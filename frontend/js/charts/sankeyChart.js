/* ============================================================
   sankeyChart.js — 桑基图（Light → Severity → Vehicle）
   架构：init-once + update 模式
   数据：sankey_data.json（按年份拆分，节点统一）
   交互：节点拖拽、连线高亮、年份选择器
   ============================================================ */

var _sankeyChart      = null;
var _sankeyData       = null;     // 全量 sankey 数据（{all, 2005, ..., 2015}）
var _sankeySelectorInited = false;

// ============================================================
//  initSankeyChart — 创建实例 + 年份选择器
// ============================================================
function initSankeyChart() {
  var dom = document.getElementById("chartSankey");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _sankeyChart = existing; return existing; }

  _sankeyChart = echarts.init(dom, CURRENT_THEME);

  if (!_sankeySelectorInited) _initSankeySelector();

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

  _sankeyChart.setOption({
    title: {
      text: "Casualty Flow: Light → Severity → Vehicle",
      subtext: year === "all" ? "All Years" : year,
      left: "center", top: 2,
      textStyle: { fontSize: 11, fontWeight: "bold", color: "#3366cc" },
      subtextStyle: { fontSize: 10, color: "#999" },
    },
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: function(p) {
        if (p.dataType === "edge") {
          return p.data.source + " → " + p.data.target + "<br>Count: <strong>" + p.data.value.toLocaleString() + "</strong>";
        }
        return p.name + "<br>Total flow: <strong>" + (p.value || 0).toLocaleString() + "</strong>";
      },
    },
    series: [{
      type: "sankey",
      layout: "none",
      emphasis: { focus: "adjacency" },
      nodeAlign: "left",
      layoutIterations: 32,
      nodeWidth: 20,
      nodeGap: 12,
      label: { show: true, fontSize: 9, color: "#555" },
      lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.2 },
      data: entry.nodes || [],
      links: entry.links || [],
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
function renderSankeyChart(sankeyData) {
  initSankeyChart();
  return updateSankeyChart(sankeyData);
}
