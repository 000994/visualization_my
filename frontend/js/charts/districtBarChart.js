/* ============================================================
   districtBarChart.js — 地区事故 TOP10 条形图
   架构：init-once + update 模式
   ============================================================ */

var _districtChart = null;

// ---- 静态配置骨架 ----
var _districtStaticOption = {
  animationDuration: 600,
  animationEasing: "cubicOut",
  grid: { top: 4, right: 60, bottom: 4, left: 120 },
  xAxis: {
    type: "value",
    axisLabel: { fontSize: 10, formatter: function(v) { return (v / 1000).toFixed(0) + "k"; } },
    splitLine: { lineStyle: { type: "dashed" } },
  },
  yAxis: {
    type: "category",
    inverse: true,
    axisLabel: { fontSize: 10 },
    axisTick: { show: false },
    axisLine: { show: false },
  },
  series: [{
    type: "bar",
    barMaxWidth: 18,
    label: { show: true, position: "right", fontSize: 9, formatter: function(p) { return fmt(p.value); } },
    emphasis: { scale: true, scaleSize: 3 },
  }],
};

var _districtColors = [
  "#3366cc","#5b8def","#26a69a","#66bb6a","#ffa726",
  "#ef5350","#ab47bc","#42a5f5","#78909c","#8d6e63",
];

// ============================================================
//  initDistrictChart
// ============================================================
function initDistrictChart() {
  var dom = document.getElementById("chartDistrict");
  if (!dom) return null;
  var existing = echarts.getInstanceByDom(dom);
  if (existing) { _districtChart = existing; return existing; }

  _districtChart = echarts.init(dom, CURRENT_THEME);
  _districtChart.setOption(_districtStaticOption);
  return _districtChart;
}

// ============================================================
//  updateDistrictChart
// ============================================================
function updateDistrictChart(data) {
  if (!_districtChart) initDistrictChart();
  if (!_districtChart || !data) return null;

  var items  = data.slice(0, 10);
  var labels = items.map(function(d) { return d.district_label; });
  var counts = items.map(function(d) { return d.count; });

  _districtChart.setOption({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: function(p) {
        return tooltipHTML(p[0].name, [
          { label: "Accidents", value: fmt(p[0].value), color: _districtColors[p[0].dataIndex % _districtColors.length] },
        ]);
      },
    },
    yAxis: { data: labels },
    series: [{
      data: counts.map(function(v, i) {
        return {
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: _districtColors[i % _districtColors.length] },
              { offset: 1, color: _districtColors[i % _districtColors.length] + "88" },
            ]),
            borderRadius: [0, 5, 5, 0],
          },
        };
      }),
    }],
  });

  return _districtChart;
}

// ============================================================
//  disposeDistrictChart
// ============================================================
function disposeDistrictChart() {
  if (_districtChart) {
    try { _districtChart.dispose(); } catch(e) {}
    _districtChart = null;
  }
}

// ---- 兼容旧 API ----
function renderDistrictBar(data) {
  initDistrictChart();
  return updateDistrictChart(data);
}
