/* ============================================================
   severityDonutChart.js — 事故严重程度环形图
   架构：init-once + update 模式
     内建 count / percentage 切换（toggle 状态保存在模块内）
   ============================================================ */

var _severityChart = null;
var _severityMode   = "count";        // "count" | "percent"
var _severityData   = null;           // 当前数据缓存
var _severityColors = [];             // 颜色数组缓存

// ---- 静态配置骨架 ----
var _severityStaticOption = {
  animationDuration: 600,
  animationEasing: "cubicOut",
  legend: { bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 10 } },
  series: [{
    type: "pie",
    radius: ["50%", "72%"],
    center: ["50%", "45%"],
    itemStyle: { borderColor: "transparent", borderWidth: 2, borderRadius: 3 },
    emphasis: { scaleSize: 8 },
  }],
};

// ============================================================
//  initSeverityChart
// ============================================================
function initSeverityChart() {
  var dom = document.getElementById("chartSeverity");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _severityChart = existing; return existing; }

  _severityChart = echarts.init(dom, CURRENT_THEME);
  _severityChart.setOption(_severityStaticOption);

  // 点击切换 count ↔ percent（只绑定一次）
  _severityChart.off("click");
  _severityChart.on("click", function() {
    _severityMode = _severityMode === "count" ? "percent" : "count";
    _applySeverityData();
  });

  return _severityChart;
}

// ============================================================
//  内部：应用当前 mode 渲染数据
// ============================================================
function _applySeverityData() {
  if (!_severityChart || !_severityData) return;

  var isCount = _severityMode === "count";
  var labels  = _severityData.map(function(d) { return d.severity_label; });
  var counts  = _severityData.map(function(d) { return d.count; });
  var pcts    = _severityData.map(function(d) { return d.percentage; });
  var vals    = isCount ? counts : pcts;
  _severityColors = labels.map(function(l) { return PALETTE.severity[l] || PALETTE.accent; });

  _severityChart.setOption({
    tooltip: {
      trigger: "item",
      formatter: function(p) {
        return tooltipHTML(p.name, [
          { label: "Count",     value: fmt(counts[p.dataIndex]), color: _severityColors[p.dataIndex] },
          { label: "Percent",   value: pcts[p.dataIndex].toFixed(1) + "%" },
        ]);
      },
    },
    series: [{
      label: {
        fontSize: 10,
        formatter: function(p) {
          return p.name + "\n" + (isCount ? fmt(p.value) : p.value.toFixed(1) + "%");
        },
      },
      data: labels.map(function(n, i) {
        return { name: n, value: vals[i], itemStyle: { color: _severityColors[i] } };
      }),
    }],
    graphic: [{
      type: "text", left: "center", top: "42%",
      style: { text: isCount ? "COUNT" : "%", textAlign: "center", fill: "#999", fontSize: 11, fontWeight: 600 },
    }],
  });
}

// ============================================================
//  updateSeverityChart — 增量注入新数据
// ============================================================
function updateSeverityChart(data) {
  if (!_severityChart) initSeverityChart();
  if (!data) return null;
  _severityData = data;
  _applySeverityData();
  return _severityChart;
}

// ============================================================
//  disposeSeverityChart — 主题切换
// ============================================================
function disposeSeverityChart() {
  if (_severityChart) {
    try { _severityChart.dispose(); } catch(e) {}
    _severityChart = null;
  }
}

// ---- 兼容旧 API ----
function renderSeverityDonut(data) {
  initSeverityChart();
  return updateSeverityChart(data);
}
