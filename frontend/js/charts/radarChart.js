/* ============================================================
   radarChart.js — 多维度雷达图（可切换维度）
   架构：init-once + update 模式 + 局部维度下拉筛选

   维度选择器：
     - "all"  → 4 个综合风险顶点（Severity / Road / Area / Light）
     - 具体维度 → 该维度下的子项实际计数（不归一化）

   数据来源：gData.radar（全量聚合）
   ============================================================ */

var _radarChart       = null;
var _radarData        = null;     // 缓存当前雷达原始数据
var _radarDims        = ["severity", "road_type", "urban_rural", "light"];
var _radarDimLabels   = {
  severity:    "Severity",
  road_type:   "Road Type",
  urban_rural: "Area",
  light:       "Light",
};

var _radarColors = ["#3366cc","#26a69a","#ffa726","#ef5350","#ab47bc","#42a5f5","#78909c","#8d6e63","#66bb6a","#5b8def"];

// 维度选择器 DOM（只创建一次）
var _radarSelectorInited = false;

// ============================================================
//  initRadarChart — 创建实例 + 维度选择器
// ============================================================
function initRadarChart() {
  var dom = document.getElementById("chartRadar");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _radarChart = existing; return existing; }

  _radarChart = echarts.init(dom, CURRENT_THEME);

  if (!_radarSelectorInited) _initRadarSelector();

  return _radarChart;
}

// ============================================================
//  创建维度下拉选择器（绝对定位在雷达图右上角）
// ============================================================
function _initRadarSelector() {
  _radarSelectorInited = true;
  var container = document.getElementById("chartRadar");
  if (!container) return;

  var oldSel = container.querySelector(".radar__dim-select");
  if (oldSel) oldSel.remove();

  var sel = document.createElement("select");
  sel.className = "radar__dim-select";
  sel.id = "radarDimensionSelector";
  sel.style.cssText =
    "position:absolute;top:6px;right:8px;z-index:10;" +
    "background:var(--bg-panel,#fff);color:var(--text-primary,#333);" +
    "border:1px solid var(--border,#e0e0f0);border-radius:5px;" +
    "padding:2px 20px 2px 6px;font-size:.65rem;font-family:inherit;" +
    "cursor:pointer;appearance:none;" +
    "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E\");" +
    "background-repeat:no-repeat;background-position:right 5px center;";

  sel.innerHTML =
    '<option value="all">All Dimensions</option>' +
    '<option value="severity">Severity</option>' +
    '<option value="road_type">Road Type</option>' +
    '<option value="urban_rural">Area (Urban/Rural)</option>' +
    '<option value="light">Light Conditions</option>';

  sel.addEventListener("change", function() {
    if (_radarData) _applyRadarData(this.value);
  });

  // 阻止点击冒泡到详情面板
  sel.addEventListener("click", function(e) { e.stopPropagation(); });

  container.appendChild(sel);
}

// ============================================================
//  获取当前选中的维度
// ============================================================
function _getRadarDimension() {
  var sel = document.getElementById("radarDimensionSelector");
  return sel ? sel.value : "all";
}

// ============================================================
//  模式 A：所有维度合并 → 4 个综合风险顶点 (0-100)
// ============================================================
function _renderAllDimensions() {
  if (!_radarChart || !_radarData) return;

  var indicators = [];
  var values     = [];

  _radarDims.forEach(function(dimKey) {
    var raw = _radarData[dimKey];
    if (!raw) return;

    // 计算该维度的"综合风险指数"
    // = (各子项占该维度百分比) 的平均值 → 再归一化到 0-100
    var subVals = Object.values(raw);
    var total   = subVals.reduce(function(a,b){return a+b;}, 0);
    if (total === 0) return;

    var avgRatio = subVals.reduce(function(sum, v) {
      return sum + (v / total) * 100;
    }, 0) / subVals.length;

    indicators.push({ name: _radarDimLabels[dimKey] || dimKey, max: 100 });
    values.push(Math.round(avgRatio));
  });

  // 将 4 个维度值也归一化到 0-100（让雷达图比例均匀）
  var maxV = Math.max.apply(null, values.concat([1]));
  var normalizedValues = values.map(function(v) { return Math.round(v / maxV * 100); });

  _radarChart.setOption({
    title: { text: "Dimension Overview", left: "center", top: 2, textStyle: { fontSize: 11, fontWeight: "bold", color: "#3366cc" } },
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        return "<strong>" + p.name + "</strong><br>Composite Score: <strong>" + values[p.dataIndex] + "</strong>/100";
      },
    },
    radar: {
      indicator: indicators,
      radius: "60%",
      center: ["50%", "54%"],
      splitNumber: 4,
      shape: "polygon",
      axisName: { color: "#8899bb", fontSize: 9, borderRadius: 3, padding: [2, 4] },
      splitArea: { areaStyle: { color: ["rgba(51,102,204,0.02)", "rgba(51,102,204,0.05)"] } },
      axisLine: { lineStyle: { color: "rgba(200,200,220,0.3)" } },
      splitLine: { lineStyle: { color: "rgba(200,200,220,0.2)" } },
    },
    series: [{
      type: "radar",
      data: [{
        value: normalizedValues,
        name: "Composite",
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,1,1,[
          {offset:0,color:"rgba(51,102,204,0.35)"},
          {offset:1,color:"rgba(91,143,239,0.12)"},
        ])},
        lineStyle: { color: "#3366cc", width: 2 },
        itemStyle: { color: _radarColors },
      }],
      symbol: "circle",
      symbolSize: 8,
      label: { show: true, fontSize: 9, color: "#666", formatter: function(p) { return p.value; } },
      emphasis: { lineStyle: { width: 3 } },
    }],
  }, true);  // ★ notMerge=true 清理旧配置
}

// ============================================================
//  模式 B：单一维度 → 该维度子项的实际计数（非归一化）
// ============================================================
function _renderSingleDimension(dimKey) {
  if (!_radarChart || !_radarData) return;

  var raw = _radarData[dimKey];
  if (!raw) return;

  var entries = Object.keys(raw).map(function(k) {
    return { name: k, value: raw[k] };
  }).sort(function(a, b) { return b.value - a.value; });

  if (entries.length === 0) return;

  var maxVal = entries[0].value;
  var radarMax = Math.ceil(maxVal * 1.2 / 1000) * 1000;  // 向上取整到千位

  var indicators = entries.map(function(e) {
    var shortName = e.name.length > 14 ? e.name.substring(0, 13) + "…" : e.name;
    return { name: shortName, max: radarMax };
  });

  var rawValues = entries.map(function(e) { return e.value; });
  // 直接用原始值（ECharts radar 会自动按 indicator.max 缩放）
  // 所以我们用 raw 值并设置合适的 max

  _radarChart.setOption({
    title: {
      text: _radarDimLabels[dimKey] || dimKey,
      left: "center", top: 2,
      textStyle: { fontSize: 11, fontWeight: "bold", color: "#3366cc" },
    },
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        var rawVal = rawValues[p.dataIndex];
        var label = rawVal >= 10000 ? (rawVal / 1000).toFixed(0) + "k" : rawVal.toLocaleString();
        return "<strong>" + p.name + "</strong><br>Count: <strong>" + label + "</strong>";
      },
    },
    radar: {
      indicator: indicators,
      radius: "60%",
      center: ["50%", "54%"],
      splitNumber: 4,
      shape: "polygon",
      axisName: { color: "#8899bb", fontSize: 9, borderRadius: 3, padding: [2, 4] },
      splitArea: { areaStyle: { color: ["rgba(51,102,204,0.02)", "rgba(51,102,204,0.05)"] } },
      axisLine: { lineStyle: { color: "rgba(200,200,220,0.3)" } },
      splitLine: { lineStyle: { color: "rgba(200,200,220,0.2)" } },
      axisLabel: {
        fontSize: 8,
        formatter: function(v) {
          if (v >= 1000000) return (v/1000000).toFixed(1) + "M";
          if (v >= 10000) return (v/1000).toFixed(0) + "k";
          if (v >= 1000) return (v/1000).toFixed(1) + "k";
          return v;
        },
      },
    },
    series: [{
      type: "radar",
      data: [{
        value: rawValues,
        name: _radarDimLabels[dimKey] || dimKey,
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,1,1,[
          {offset:0,color:"rgba(38,166,154,0.35)"},
          {offset:1,color:"rgba(38,166,154,0.1)"},
        ])},
        lineStyle: { color: "#26a69a", width: 2 },
        itemStyle: { color: _radarColors },
      }],
      symbol: "circle",
      symbolSize: 6,
      label: {
        show: true, fontSize: 8, color: "#666",
        formatter: function(p) {
          var v = p.value;
          if (v >= 10000) return (v/1000).toFixed(0) + "k";
          if (v >= 1000) return (v/1000).toFixed(1) + "k";
          return v;
        },
      },
      emphasis: { lineStyle: { width: 3 } },
    }],
  }, true);  // ★ notMerge=true
}

// ============================================================
//  统一入口：根据当前选择器值分流到模式 A 或 B
// ============================================================
function _applyRadarData(dimension) {
  if (!dimension) dimension = _getRadarDimension();
  if (dimension === "all") {
    _renderAllDimensions();
  } else {
    _renderSingleDimension(dimension);
  }
}

// ============================================================
//  updateRadarChart — 外部注入新数据
// ============================================================
function updateRadarChart(radarData) {
  if (!_radarChart) initRadarChart();
  if (!_radarChart || !radarData) return null;
  _radarData = radarData;
  _applyRadarData();
  return _radarChart;
}

// ============================================================
//  disposeRadarChart — 主题切换
// ============================================================
function disposeRadarChart() {
  if (_radarChart) {
    try { _radarChart.dispose(); } catch(e) {}
    _radarChart = null;
  }
  _radarSelectorInited = false;  // 主题重建后需要重新创建 selector
}

// ---- 兼容旧 API ----
function renderRadarChart(radarData) {
  initRadarChart();
  return updateRadarChart(radarData);
}
